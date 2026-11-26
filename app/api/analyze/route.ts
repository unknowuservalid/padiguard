import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    riskLevel: { type: Type.STRING, enum: ["RENDAH", "SEDANG", "TINGGI"] },
    riskScore: { type: Type.NUMBER },
    diagnosisSummary: { type: Type.STRING },
    estimatedLossRupiah: { type: Type.NUMBER },
    earlyActionCostRupiah: { type: Type.NUMBER },
    potentialSavingsRupiah: { type: Type.NUMBER },
    actionSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.NUMBER },
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          urgency: { type: Type.STRING, enum: ["SEGERA", "HARI INI", "PANTAU"] },
        },
        required: ["step", "title", "detail", "urgency"],
      },
    },
  },
  required: [
    "riskLevel",
    "riskScore",
    "diagnosisSummary",
    "estimatedLossRupiah",
    "earlyActionCostRupiah",
    "potentialSavingsRupiah",
    "actionSteps",
  ],
};

function isValidAnalysis(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    ["RENDAH", "SEDANG", "TINGGI"].includes(String(result.riskLevel)) &&
    typeof result.riskScore === "number" &&
    Number.isFinite(result.riskScore) &&
    result.riskScore >= 0 &&
    result.riskScore <= 100 &&
    typeof result.diagnosisSummary === "string" &&
    typeof result.estimatedLossRupiah === "number" &&
    Number.isFinite(result.estimatedLossRupiah) &&
    result.estimatedLossRupiah >= 0 &&
    typeof result.earlyActionCostRupiah === "number" &&
    Number.isFinite(result.earlyActionCostRupiah) &&
    result.earlyActionCostRupiah >= 0 &&
    typeof result.potentialSavingsRupiah === "number" &&
    Number.isFinite(result.potentialSavingsRupiah) &&
    result.potentialSavingsRupiah >= 0 &&
    Array.isArray(result.actionSteps) &&
    result.actionSteps.length === 3 &&
    result.actionSteps.every(
      (step) =>
        step !== null &&
        typeof step === "object" &&
        typeof step.step === "number" &&
        typeof step.title === "string" &&
        typeof step.detail === "string" &&
        ["SEGERA", "HARI INI", "PANTAU"].includes(String(step.urgency)),
    )
  );
}

const primaryModel = "gemini-3.8-flash";
const backupModel = "gemini-3.5-flash-lite";
const attemptTimeoutMs = 8_500;

class AnalysisResponseError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "AnalysisResponseError";
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const details = error as Record<string, unknown>;
  for (const candidate of [details.status, details.statusCode, details.code]) {
    if (typeof candidate === "number" && candidate >= 400 && candidate <= 599) return candidate;
  }
  const message = typeof details.message === "string" ? details.message : "";
  const match = message.match(/(?:status(?: code)?\s*[:=]?\s*|HTTP\/\d(?:\.\d)?\s+)(\d{3})/i)
    ?? message.match(/\b(429|503)\b/);
  return match ? Number(match[1]) : undefined;
}

function isCapacityFailure(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 429 || status === 503;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generateAnalysis(
  ai: GoogleGenAI,
  model: string,
  fieldData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Analisis petak padi di Indonesia berikut:\n${JSON.stringify(fieldData)}\n\nBuat estimasi ekonomi yang wajar untuk luas ${fieldData.areaHectares} hektare menggunakan asumsi harga gabah dan biaya pengendalian yang realistis di Indonesia. Jangan mengarang kepastian diagnosis; gunakan bahasa indikatif dan sarankan konfirmasi penyuluh untuk risiko tinggi. potentialSavingsRupiah = max(0, estimatedLossRupiah - earlyActionCostRupiah). Berikan tepat 3 actionSteps berurutan dan relevan terhadap gejala/cuaca.`,
      config: {
        systemInstruction:
          "Anda adalah asisten agronomi dan ekonomi pertanian Indonesia untuk petani padi serta penyuluh lapangan. Gunakan prinsip Pengendalian Hama Terpadu (PHT), hindari rekomendasi pestisida spesifik tanpa konfirmasi, dan berikan estimasi Rupiah yang konservatif berdasarkan luas lahan. Diagnosis adalah dukungan keputusan, bukan pengganti pemeriksaan lapangan. Ringkasan maksimal 2 kalimat.",
        responseMimeType: "application/json",
        responseSchema,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text) throw new AnalysisResponseError("AI tidak memberikan hasil. Silakan coba kembali.");
    const cleanText = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    let analysis: unknown;
    try {
      analysis = JSON.parse(cleanText);
    } catch {
      throw new AnalysisResponseError("Gemini mengirim JSON yang tidak valid. Silakan coba analisis kembali.");
    }
    if (!isValidAnalysis(analysis)) {
      throw new AnalysisResponseError("Format hasil AI tidak sesuai. Silakan coba kembali.");
    }
    return analysis;
  } finally {
    clearTimeout(timeout);
  }
}

function createLocalFallback(fieldData: Record<string, unknown>) {
  const symptoms = fieldData.symptoms as string[];
  const weather = fieldData.weather as string;
  const ageDays = fieldData.ageDays as number;
  const areaHectares = fieldData.areaHectares as number;
  const variety = (fieldData.variety as string).trim();
  const symptomWeights: Record<string, number> = {
    "Daun menguning": 8,
    "Bercak pada daun": 14,
    "Daun tergulung": 16,
    "Batang berlubang": 16,
    "Wereng terlihat": 22,
    "Tanaman layu": 14,
  };
  const weatherWeight: Record<string, number> = {
    Kering: 7,
    Normal: 0,
    "Lembap/Hujan Terus": 18,
    Terendam: 27,
  };
  const growthWeight = ageDays <= 35 ? 5 : ageDays <= 65 ? 8 : 3;
  const riskScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        8 +
          growthWeight +
          (weatherWeight[weather] ?? 0) +
          symptoms.reduce((score, symptom) => score + (symptomWeights[symptom] ?? 0), 0),
      ),
    ),
  );
  const riskLevel = riskScore >= 60 ? "TINGGI" : riskScore >= 30 ? "SEDANG" : "RENDAH";
  const urgency = riskScore >= 60 ? "SEGERA" : riskScore >= 30 ? "HARI INI" : "PANTAU";
  const lossPerHectare = 10_000_000 * (0.02 + (riskScore / 100) * 0.38);
  const weatherActionCost = weather === "Terendam" ? 100_000 : weather === "Lembap/Hujan Terus" ? 65_000 : 20_000;
  const actionCostPerHectare = 120_000 + symptoms.length * 42_000 + weatherActionCost;
  const roundToThousand = (amount: number) => Math.round(amount / 1_000) * 1_000;
  const estimatedLossRupiah = roundToThousand(lossPerHectare * areaHectares);
  const earlyActionCostRupiah = roundToThousand(actionCostPerHectare * areaHectares);
  const potentialSavingsRupiah = Math.max(0, estimatedLossRupiah - earlyActionCostRupiah);
  const symptomSummary = symptoms.length ? symptoms.join(", ") : "belum ada gejala yang dipilih";
  const phase = ageDays <= 35 ? "vegetatif" : ageDays <= 65 ? "generatif atau bunting" : "pematangan";
  const actionTwo = weather === "Terendam"
    ? {
        title: "Perbaiki aliran air",
        detail: "Kurangi genangan secara bertahap dan pastikan saluran pembuangan berfungsi.",
      }
    : weather === "Lembap/Hujan Terus"
      ? {
          title: "Atur air dan sirkulasi",
          detail: "Hindari genangan terlalu lama dan jaga sirkulasi udara di sekitar rumpun.",
        }
      : weather === "Kering"
        ? {
            title: "Jaga kelembapan lahan",
            detail: "Pantau kondisi tanah dan pertahankan ketersediaan air sesuai fase tanaman.",
          }
        : {
            title: "Lanjutkan perawatan rutin",
            detail: "Jaga pengelolaan air sesuai fase pertumbuhan dan amati perubahan tanaman.",
          };
  const actionSteps = [
    {
      step: 1,
      title: symptoms.length ? "Periksa sebaran gejala" : "Lanjutkan pengamatan",
      detail: symptoms.length
        ? `Amati beberapa rumpun di titik berbeda untuk memastikan pola gejala: ${symptomSummary}.`
        : "Amati beberapa rumpun di titik berbeda dan catat bila muncul perubahan.",
      urgency,
    },
    { step: 2, ...actionTwo, urgency: riskScore >= 60 ? "HARI INI" : "PANTAU" },
    {
      step: 3,
      title: riskScore >= 60 ? "Hubungi penyuluh setempat" : "Catat dan pantau kembali",
      detail: riskScore >= 60
        ? "Minta pemeriksaan lapangan sebelum menentukan tindakan pengendalian."
        : "Simpan catatan kondisi dan periksa kembali dalam 2–3 hari.",
      urgency: riskScore >= 60 ? "HARI INI" : "PANTAU",
    },
  ];

  return {
    riskLevel,
    riskScore,
    diagnosisSummary: `Estimasi lokal untuk varietas ${variety}, umur ${ageDays} HST pada fase ${phase}, dengan cuaca ${weather} dan gejala ${symptomSummary}. Nilai ini merupakan panduan awal berbasis aturan, bukan diagnosis; konfirmasikan kondisi berisiko dengan penyuluh.`,
    estimatedLossRupiah,
    earlyActionCostRupiah,
    potentialSavingsRupiah,
    actionSteps,
    source: "fallback" as const,
  };
}

export async function POST(request: Request) {
  let field: unknown;
  try {
    field = await request.json();
  } catch {
    return NextResponse.json({ error: "Data petak tidak terbaca." }, { status: 400 });
  }

  if (!field || typeof field !== "object") {
    return NextResponse.json({ error: "Data petak tidak valid." }, { status: 400 });
  }

  const fieldData = field as Record<string, unknown>;
  if (
    typeof fieldData.plotName !== "string" ||
    typeof fieldData.variety !== "string" ||
    !fieldData.variety.trim() ||
    typeof fieldData.ageDays !== "number" ||
    !Number.isFinite(fieldData.ageDays) ||
    fieldData.ageDays < 0 ||
    typeof fieldData.areaHectares !== "number" ||
    !Number.isFinite(fieldData.areaHectares) ||
    fieldData.areaHectares <= 0 ||
    fieldData.areaHectares > 10_000 ||
    typeof fieldData.weather !== "string" ||
    !["Kering", "Normal", "Lembap/Hujan Terus", "Terendam"].includes(fieldData.weather) ||
    !Array.isArray(fieldData.symptoms) ||
    !fieldData.symptoms.every((symptom) => typeof symptom === "string")
  ) {
    return NextResponse.json({ error: "Lengkapi data petak dengan benar." }, { status: 400 });
  }

  const fallbackResponse = () => NextResponse.json(createLocalFallback(fieldData));
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("GEMINI_API_KEY tidak tersedia; menggunakan Mesin Cadangan Lokal.");
    return fallbackResponse();
  }

  const geminiResponse = (analysis: Record<string, unknown>, model: string) =>
    NextResponse.json({
      ...analysis,
      potentialSavingsRupiah: Math.max(
        0,
        Math.round(Number(analysis.estimatedLossRupiah) - Number(analysis.earlyActionCostRupiah)),
      ),
      source: "gemini",
      model,
    });

  try {
    const ai = new GoogleGenAI({ apiKey });
    try {
      const analysis = await generateAnalysis(ai, primaryModel, fieldData);
      return geminiResponse(analysis, primaryModel);
    } catch (firstError) {
      console.error(firstError);
      if (isCapacityFailure(firstError)) {
        await sleep(1_500);
        try {
          const analysis = await generateAnalysis(ai, primaryModel, fieldData);
          return geminiResponse(analysis, primaryModel);
        } catch (retryError) {
          console.error(retryError);
        }
      }

      try {
        const analysis = await generateAnalysis(ai, backupModel, fieldData);
        return geminiResponse(analysis, backupModel);
      } catch (backupError) {
        console.error(backupError);
        return fallbackResponse();
      }
    }
  } catch (error) {
    console.error(error);
    return fallbackResponse();
  }
}
