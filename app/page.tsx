"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  BookOpen,
  ClipboardList,
  Cloud,
  CloudOff,
  Eye,
  History,
  Home as HomeIcon,
  Leaf,
  LogOut,
  Moon,
  Printer,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
  Sprout,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import PadiGuardLogo from "./components/PadiGuardLogo";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

type Weather = "Kering" | "Normal" | "Lembap/Hujan Terus" | "Terendam";
type FieldInput = {
  plotName: string;
  variety: string;
  ageDays: number;
  areaHectares: number;
  weather: Weather;
  symptoms: string[];
  notes: string;
};
type ActionStep = {
  step: number;
  title: string;
  detail: string;
  urgency: "SEGERA" | "HARI INI" | "PANTAU";
};
type Analysis = {
  riskLevel: "RENDAH" | "SEDANG" | "TINGGI";
  riskScore: number;
  diagnosisSummary: string;
  estimatedLossRupiah: number;
  earlyActionCostRupiah: number;
  potentialSavingsRupiah: number;
  actionSteps: ActionStep[];
  source?: "gemini" | "fallback";
  model?: string;
};
type HistoryItem = Analysis & { id: string; plotName: string; date: string };
type HistoryStats = {
  totalSavings: number;
  trackedCount: number;
  attentionCount: number;
  latest: HistoryItem | null;
};
type MainTab = "beranda" | "periksa" | "riwayat" | "panduan";
type RiskFilter = "SEMUA" | "TINGGI" | "SEDANG" | "RENDAH";
type Theme = "light" | "dark" | "high-contrast";
type ColorVision = "normal" | "protanopia" | "deuteranopia" | "tritanopia";
type Preferences = {
  theme: Theme;
  colorVision: ColorVision;
  largeText: boolean;
  quickView: boolean;
  screenReader: boolean;
};

const demoEmail = "juri@padiguard.id";
const demoPassword = "demo123";
const draftKey = "padiguard-draft-v1";
const historyKey = "padiguard-history-v1";
const actionProgressKey = "padiguard-action-progress-v1";
const queueKey = "padiguard-queue-v1";
const preferencesKey = "padiguard-preferences-v1";
const initialForm: FieldInput = {
  plotName: "",
  variety: "Ciherang",
  ageDays: 35,
  areaHectares: 1,
  weather: "Normal",
  symptoms: [],
  notes: "",
};
const symptomsList = [
  "Daun menguning",
  "Bercak pada daun",
  "Daun tergulung",
  "Batang berlubang",
  "Wereng terlihat",
  "Tanaman layu",
];
const sampleHistory: HistoryItem[] = [
  {
    id: "sample-1",
    plotName: "Petak Makmur",
    date: "25 Nov 2026",
    riskLevel: "SEDANG",
    riskScore: 58,
    diagnosisSummary: "Kelembapan tinggi dapat memicu bercak daun. Pantau penyebaran sebelum gejala meluas.",
    estimatedLossRupiah: 2400000,
    earlyActionCostRupiah: 450000,
    potentialSavingsRupiah: 1950000,
    actionSteps: [
      { step: 1, title: "Periksa sebaran bercak", detail: "Amati 10 rumpun di beberapa titik petak.", urgency: "HARI INI" },
      { step: 2, title: "Jaga sirkulasi air", detail: "Hindari genangan terlalu lama di petakan.", urgency: "PANTAU" },
      { step: 3, title: "Konsultasi penyuluh", detail: "Kirim foto jika gejala bertambah.", urgency: "PANTAU" },
    ],
  },
  {
    id: "sample-2",
    plotName: "Sawah Blok Timur",
    date: "22 Nov 2026",
    riskLevel: "RENDAH",
    riskScore: 24,
    diagnosisSummary: "Kondisi tanaman terpantau cukup stabil. Lanjutkan pengamatan rutin dan pengelolaan air.",
    estimatedLossRupiah: 850000,
    earlyActionCostRupiah: 180000,
    potentialSavingsRupiah: 670000,
    actionSteps: [
      { step: 1, title: "Lanjutkan pengamatan", detail: "Cek kondisi tanaman setiap 2–3 hari.", urgency: "PANTAU" },
      { step: 2, title: "Jaga pematang", detail: "Pastikan aliran air tidak tersumbat.", urgency: "PANTAU" },
      { step: 3, title: "Catat perubahan", detail: "Dokumentasikan jika muncul gejala baru.", urgency: "PANTAU" },
    ],
  },
];
const mainNavItems: Array<{ key: MainTab; label: string; icon: ReactNode }> = [
  { key: "beranda", label: "Beranda", icon: <HomeIcon size={19} aria-hidden="true" /> },
  { key: "periksa", label: "Periksa", icon: <ClipboardList size={19} aria-hidden="true" /> },
  { key: "riwayat", label: "Riwayat", icon: <History size={19} aria-hidden="true" /> },
  { key: "panduan", label: "Panduan", icon: <BookOpen size={19} aria-hidden="true" /> },
];
const ricePhaseGuide = [
  {
    name: "Vegetatif",
    range: "0–35 HST",
    focus: "Jaga air dangkal, dukung pembentukan anakan, dan amati daun muda serta pangkal rumpun.",
  },
  {
    name: "Generatif / Bunting",
    range: "36–65 HST",
    focus: "Jaga kecukupan air dan pantau bakal malai serta perubahan gejala di seluruh petak.",
  },
  {
    name: "Pematangan",
    range: ">65 HST",
    focus: "Awasi pengisian bulir, kurangi genangan bertahap, dan siapkan panen saat matang.",
  },
];
const quickSymptomGuide = [
  {
    name: "Wereng",
    cue: "Serangga kecil di pangkal rumpun; daun dapat menguning atau menggulung.",
    action: "Periksa beberapa titik petak, amati musuh alami, dan minta bantuan penyuluh sebelum menentukan pengendalian.",
  },
  {
    name: "Blas / Bercak Daun",
    cue: "Bercak pada daun, sering perlu diamati pola bentuk dan penyebarannya.",
    action: "Catat lokasi rumpun bergejala, cek perubahan setelah cuaca lembap, dan konfirmasikan diagnosis di lapangan.",
  },
  {
    name: "Penggerek Batang",
    cue: "Batang berlubang atau anakan tampak mengering dan mudah dicabut.",
    action: "Periksa batang dan sebaran gejala di beberapa titik; konsultasikan sebelum tindakan pengendalian.",
  },
  {
    name: "Layu",
    cue: "Rumpun layu atau menguning, bisa muncul pada satu titik atau meluas.",
    action: "Periksa kondisi air dan akar serta bandingkan rumpun sehat; hubungi penyuluh jika gejala bertambah.",
  },
];
const presetScenarios: Array<{ label: string; field: FieldInput }> = [
  {
    label: "Contoh: Serangan Wereng Awal",
    field: {
      plotName: "Petak Wereng Awal",
      variety: "Ciherang",
      ageDays: 28,
      areaHectares: 1,
      weather: "Normal",
      symptoms: ["Wereng terlihat", "Daun menguning"],
      notes: "Wereng terlihat di beberapa rumpun; amati pola sebaran dan musuh alami.",
    },
  },
  {
    label: "Contoh: Bercak Daun / Blast",
    field: {
      plotName: "Petak Bercak Daun",
      variety: "Inpari 32",
      ageDays: 42,
      areaHectares: 0.8,
      weather: "Lembap/Hujan Terus",
      symptoms: ["Bercak pada daun", "Daun menguning"],
      notes: "Bercak terlihat pada daun bawah setelah beberapa hari cuaca lembap.",
    },
  },
  {
    label: "Contoh: Kondisi Aman",
    field: {
      plotName: "Petak Pantau Sehat",
      variety: "IR64",
      ageDays: 32,
      areaHectares: 1,
      weather: "Normal",
      symptoms: [],
      notes: "Tidak ada gejala terlihat; pertumbuhan tampak merata.",
    },
  },
];

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatCompactRupiah = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)}`;

function getHistoryStats(history: HistoryItem[]): HistoryStats {
  const latestByPlot = new Map<string, HistoryItem>();
  for (const item of history) {
    const plotKey = item.plotName.trim().toLocaleLowerCase("id-ID") || item.id;
    if (!latestByPlot.has(plotKey)) latestByPlot.set(plotKey, item);
  }

  return {
    totalSavings: history.reduce(
      (total, item) =>
        total +
        Math.max(
          0,
          (Number.isFinite(item.estimatedLossRupiah) ? item.estimatedLossRupiah : 0) -
            (Number.isFinite(item.earlyActionCostRupiah) ? item.earlyActionCostRupiah : 0),
        ),
      0,
    ),
    trackedCount: history.length,
    attentionCount: [...latestByPlot.values()].filter(
      (item) => item.riskLevel === "SEDANG" || item.riskLevel === "TINGGI",
    ).length,
    latest: history[0] ?? null,
  };
}

function formatRiskLevel(level: Analysis["riskLevel"]): string {
  return `${level[0]}${level.slice(1).toLocaleLowerCase("id-ID")}`;
}

function LocalDataBadge({ landing = false }: { landing?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
        landing
          ? "border-white/20 bg-white/10 text-[#FEF3C7]"
          : "surface border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <CheckCircle2 size={14} aria-hidden="true" />
      Data lokal tersinkron
    </span>
  );
}

function MainNavigation({
  activeTab,
  onNavigate,
}: {
  activeTab: MainTab;
  onNavigate: (tab: MainTab) => void;
}) {
  return (
    <>
      <aside className="desktop-sidebar main-navigation hidden w-64 shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col" aria-label="Menu utama PadiGuard">
        <div className="px-5 py-5">
          <PadiGuardLogo tagline="Teman tumbuh petani" />
        </div>

        <nav className="flex-1 px-3 py-5" aria-label="Navigasi utama">
          <p className="px-3 pb-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">Menu utama</p>
          <div className="space-y-1.5">
            {mainNavItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onNavigate(item.key)}
                  className={`main-tab-button flex min-h-12 w-full items-center gap-3 rounded-r-xl border-l-4 px-4 text-left text-sm font-bold transition ${isActive ? "border-green-800 bg-green-50 text-green-800" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <footer className="mt-auto p-4">
          <div className="surface rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-extrabold text-slate-800">Akun Demo Aktif</p>
            <p className="muted mt-1 truncate text-xs text-slate-500">{demoEmail}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-bold text-green-800">
              <Cloud size={15} aria-hidden="true" />
              <span>Mode Offline Siap</span>
            </div>
          </div>
        </footer>
      </aside>
      <nav className="bottom-navigation surface fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,.08)] md:hidden" aria-label="Navigasi utama">
        {mainNavItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.key)}
              className={`main-tab-button flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold transition ${isActive ? "bg-green-50 text-green-800" : "text-slate-600"}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function getAnalysisAnnouncement(item: HistoryItem): string {
  return [
    `Hasil analisis untuk ${item.plotName}.`,
    `Risiko ${item.riskLevel}, skor ${item.riskScore} dari 100.`,
    `Estimasi potensi kerugian ${formatRupiah(item.estimatedLossRupiah)}.`,
    `Biaya tindakan dini ${formatRupiah(item.earlyActionCostRupiah)}.`,
    ...item.actionSteps.map(
      (step, index) => `Langkah ${index + 1}: ${step.title}. ${step.detail} Urgensi ${step.urgency}.`,
    ),
  ].join(" ");
}

function describeInteractiveElement(element: HTMLElement): string {
  const labelledBy = element.getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim())
    .filter(Boolean)
    .join(" ");
  const labelledByLabels = "labels" in element
    ? Array.from((element as HTMLInputElement).labels ?? []).map((label) => label.innerText.trim()).join(" ")
    : "";
  const nestedLabel = element.closest("label")?.innerText.trim();
  const text = element.innerText?.trim() || element.textContent?.trim() || "";
  const label = element.getAttribute("aria-label")
    || labelledBy
    || labelledByLabels
    || nestedLabel
    || element.getAttribute("title")
    || text;
  if (!label) return "";

  const status: string[] = [];
  const pressed = element.getAttribute("aria-pressed");
  if (pressed !== null) {
    status.push(element.dataset.readerPressedLabel || (pressed === "true" ? "aktif" : "nonaktif"));
  }
  const checked = element.getAttribute("aria-checked");
  if (checked !== null) status.push(checked === "true" ? "dicentang" : "tidak dicentang");
  const expanded = element.getAttribute("aria-expanded");
  if (expanded !== null) status.push(expanded === "true" ? "terbuka" : "tertutup");
  if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) {
    status.push(element.checked ? "dipilih" : "tidak dipilih");
  } else if (element instanceof HTMLSelectElement) {
    status.push(element.selectedOptions[0]?.textContent?.trim() ?? "");
  } else if (element instanceof HTMLButtonElement && element.disabled) {
    status.push("tidak tersedia");
  }

  const role = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? "Kolom isian"
    : element instanceof HTMLSelectElement
      ? "Pilihan"
      : element instanceof HTMLButtonElement
        ? "Tombol"
        : "";
  return [role, label, ...status].filter(Boolean).join(", ");
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readPreferences(): Preferences {
  const saved = readStorage<Partial<Preferences> & { highContrast?: boolean }>(preferencesKey, {});
  const themes: Theme[] = ["light", "dark", "high-contrast"];
  const colorModes: ColorVision[] = ["normal", "protanopia", "deuteranopia", "tritanopia"];
  return {
    theme: themes.includes(saved.theme as Theme) ? saved.theme as Theme : saved.highContrast ? "high-contrast" : "light",
    colorVision: colorModes.includes(saved.colorVision as ColorVision) ? saved.colorVision as ColorVision : "normal",
    largeText: saved.largeText === true,
    quickView: saved.quickView === true,
    screenReader: saved.screenReader === true,
  };
}

function AccessibilityOptions({
  preferences,
  setPreferences,
}: {
  preferences: Preferences;
  setPreferences: (value: Preferences) => void;
}) {
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPreferences({ ...preferences, [key]: value });
  const themes: Array<{ value: Theme; label: string; icon: ReactNode }> = [
    { value: "light", label: "Terang", icon: <Sun size={16} aria-hidden="true" /> },
    { value: "dark", label: "Gelap", icon: <Moon size={16} aria-hidden="true" /> },
    { value: "high-contrast", label: "Kontras", icon: <Eye size={16} aria-hidden="true" /> },
  ];

  return (
    <div className="accessibility-options space-y-5">
      <fieldset>
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-[.12em] text-slate-500">Tema tampilan</legend>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => update("theme", theme.value)}
              aria-pressed={preferences.theme === theme.value}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition ${preferences.theme === theme.value ? "border-green-800 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {theme.icon}{theme.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => update("largeText", !preferences.largeText)}
          aria-pressed={preferences.largeText}
          className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition ${preferences.largeText ? "border-green-800 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          Aa Besar
        </button>
        <button
          type="button"
          onClick={() => update("quickView", !preferences.quickView)}
          aria-pressed={preferences.quickView}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${preferences.quickView ? "border-green-800 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <Activity size={15} aria-hidden="true" /> Ringkas
        </button>
      </div>

      <label htmlFor="color-vision-filter" className="block text-xs font-bold text-slate-700">
        Filter buta warna
        <select
          id="color-vision-filter"
          aria-label="Filter buta warna"
          value={preferences.colorVision}
          onChange={(event) => update("colorVision", event.target.value as ColorVision)}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-green-700"
        >
          <option value="normal">Normal</option>
          <option value="protanopia">Protanopia</option>
          <option value="deuteranopia">Deuteranopia</option>
          <option value="tritanopia">Tritanopia</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => update("screenReader", !preferences.screenReader)}
        aria-pressed={preferences.screenReader}
        aria-label="Pembaca Suara (Screen Reader)"
        className={`flex min-h-11 w-full shrink-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-bold transition ${preferences.screenReader ? "border-green-800 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
      >
        <span className="flex items-center gap-2"><Volume2 size={16} aria-hidden="true" /> Pembaca Suara (Screen Reader)</span>
        <span className="text-xs">{preferences.screenReader ? "Aktif" : "Nonaktif"}</span>
      </button>
      {preferences.theme === "high-contrast" && preferences.colorVision !== "normal" && (
        <p className="explanatory muted text-xs leading-5 text-slate-500">
          Filter simulasi warna dijeda saat mode kontras tinggi aktif agar kontras tetap terjaga.
        </p>
      )}
    </div>
  );
}

function AppHeader({
  preferences,
  setPreferences,
  online,
  loggedIn,
  activeTab,
  onLogout,
}: {
  preferences: Preferences;
  setPreferences: (value: Preferences) => void;
  online: boolean;
  loggedIn: boolean;
  activeTab: MainTab;
  onLogout: () => void;
}) {
  const [accessOpen, setAccessOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dialogWasOpen = useRef(false);

  useEffect(() => {
    if (!accessOpen) {
      if (dialogWasOpen.current) {
        triggerRef.current?.focus();
        dialogWasOpen.current = false;
      }
      return;
    }

    dialogWasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccessOpen(false);
    };
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [accessOpen]);

  const keepFocusInDialog = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const activeTitle = mainNavItems.find((item) => item.key === activeTab)?.label ?? "Beranda";

  return (
    <>
      <header className="surface sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className={`flex min-w-0 items-center gap-2 sm:gap-3 ${loggedIn ? "md:hidden" : ""}`}>
            <PadiGuardLogo
              tagline="Teman tumbuh petani"
              taglineClassName="hidden sm:block"
              wordmarkClassName="truncate text-base sm:text-lg"
            />
          </div>
          {loggedIn && (
            <p className="hidden min-w-0 flex-1 truncate text-lg font-extrabold md:block">
              {activeTitle}
            </p>
          )}

          <nav className="flex shrink-0 items-center gap-2" aria-label="Menu utama">
            <details className="relative hidden md:block">
              <summary className="flex min-h-11 shrink-0 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <Eye size={15} aria-hidden="true" /> Aksesibilitas
              </summary>
              <div className="surface absolute right-0 top-[calc(100%+10px)] z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <AccessibilityOptions preferences={preferences} setPreferences={setPreferences} />
              </div>
            </details>
            <button
              type="button"
              ref={triggerRef}
              onClick={() => setAccessOpen(true)}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 focus-visible:ring-4 sm:px-3 sm:py-2 sm:text-sm md:hidden"
              aria-haspopup="dialog"
              aria-expanded={accessOpen}
              aria-controls="accessibility-dialog"
            >
              <Eye size={15} aria-hidden="true" /> Aksesibilitas
            </button>
            <span className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold ${online ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`} role="status">
              {online ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
              <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
            </span>
            {loggedIn && (
              <button type="button" onClick={onLogout} aria-label="Keluar" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                <LogOut size={17} aria-hidden="true" />
              </button>
            )}
          </nav>
        </div>
      </header>
      {accessOpen && (
        <div className="accessibility-backdrop fixed inset-0 z-[70] md:hidden print:hidden" onClick={() => setAccessOpen(false)}>
          <section
            id="accessibility-dialog"
            ref={dialogRef}
            className="accessibility-sheet surface absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-5 pb-8 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accessibility-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={keepFocusInDialog}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 id="accessibility-title" className="text-lg font-extrabold">Aksesibilitas</h2>
                <p className="muted text-xs text-slate-500">Atur tampilan yang nyaman untuk Anda.</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setAccessOpen(false)} aria-label="Tutup pengaturan aksesibilitas" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <AccessibilityOptions preferences={preferences} setPreferences={setPreferences} />
          </section>
        </div>
      )}
    </>
  );
}

function LoginPanel({
  onLogin,
  stats,
}: {
  onLogin: () => void;
  stats: HistoryStats;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = (nextEmail = email, nextPassword = password) => {
    if (nextEmail.trim().toLowerCase() !== demoEmail || nextPassword !== demoPassword) {
      setError("Email atau kata sandi belum sesuai. Gunakan akun demo yang tersedia.");
      return;
    }
    localStorage.setItem("padiguard-session", "demo");
    onLogin();
  };

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1440px] items-stretch gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
      <section className="landing-hero surface relative isolate flex min-h-[610px] flex-col overflow-hidden rounded-[30px] bg-gradient-to-br from-[#123E29] to-[#1A5336] p-6 text-white shadow-soft sm:p-8 lg:p-10">
        <div className="landing-art absolute inset-0" aria-hidden="true">
          <svg viewBox="0 0 1000 800" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="landing-terrace-1" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#97c56d" />
                <stop offset="1" stopColor="#397845" />
              </linearGradient>
              <linearGradient id="landing-terrace-2" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#568f52" />
                <stop offset="1" stopColor="#174b36" />
              </linearGradient>
            </defs>
            <circle cx="825" cy="215" r="62" fill="#FDE68A" opacity=".2" />
            <circle cx="825" cy="215" r="74" fill="none" stroke="#FEF3C7" strokeWidth="1.5" opacity=".24" />
            <path d="M0 448 Q190 342 386 420 T770 384 T1000 354 V800 H0Z" fill="#6d9c59" opacity=".55" />
            <path d="M0 505 Q184 399 386 477 T775 446 T1000 418 V800 H0Z" fill="url(#landing-terrace-1)" />
            <path d="M0 531 Q186 432 387 505 T775 477 T1000 451" fill="none" stroke="#d7e9a1" strokeWidth="5" opacity=".75" />
            <path d="M0 588 Q178 485 382 560 T773 534 T1000 504 V800 H0Z" fill="url(#landing-terrace-2)" />
            <path d="M0 612 Q178 516 383 588 T772 563 T1000 536" fill="none" stroke="#bad480" strokeWidth="5" opacity=".65" />
            <path d="M0 677 Q178 564 382 643 T774 622 T1000 594 V800 H0Z" fill="#194e37" />
            <path d="M0 705 Q177 600 383 674 T774 653 T1000 627" fill="none" stroke="#9fc875" strokeWidth="4" opacity=".55" />
            <path d="M0 747 Q178 643 386 719 T775 697 T1000 671 V800 H0Z" fill="#123f30" />
            <g className="rice-sway" fill="none" stroke="#e0eab0" strokeLinecap="round" strokeWidth="4">
              <path d="M850 730 Q861 602 846 465" />
              <path d="M850 635 Q805 586 797 542 M854 659 Q898 609 912 565 M848 585 Q889 548 890 514" />
              <path d="M802 548 q-8-12 2-20 q11 4 9 17 M817 565 q-8-12 2-20 q11 4 9 17 M834 582 q-8-12 2-20 q11 4 9 17" fill="#f2edbf" stroke="none" />
              <path d="M905 571 q-8-12 2-20 q11 4 9 17 M890 591 q-8-12 2-20 q11 4 9 17 M873 609 q-8-12 2-20 q11 4 9 17" fill="#f2edbf" stroke="none" />
              <path d="M883 520 q-8-12 2-20 q11 4 9 17 M865 540 q-8-12 2-20 q11 4 9 17" fill="#f2edbf" stroke="none" />
              <path d="M852 686 Q808 664 785 670 M854 703 Q905 674 932 681 M853 718 Q816 705 791 715" stroke="#b3d180" />
            </g>
            <g className="rice-sway rice-sway-quick" fill="none" stroke="#d3e6a3" strokeLinecap="round" strokeWidth="3.5">
              <path d="M796 762 Q780 674 787 563" />
              <path d="M787 634 Q755 602 750 574 M790 660 Q825 625 832 592" />
              <path d="M752 577 q-7-10 2-17 q9 3 8 15 M765 592 q-7-10 2-17 q9 3 8 15 M826 596 q-7-10 2-17 q9 3 8 15 M812 612 q-7-10 2-17 q9 3 8 15" fill="#f2edbf" stroke="none" />
            </g>
            <g className="rice-sway rice-sway-mid" fill="none" stroke="#d3e6a3" strokeLinecap="round" strokeWidth="3.5">
              <path d="M916 754 Q929 673 921 590" />
              <path d="M922 655 Q890 621 887 595 M924 671 Q958 647 964 620" />
              <path d="M889 599 q-7-10 2-17 q9 3 8 15 M903 615 q-7-10 2-17 q9 3 8 15 M960 624 q-7-10 2-17 q9 3 8 15 M945 640 q-7-10 2-17 q9 3 8 15" fill="#f2edbf" stroke="none" />
            </g>
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <PadiGuardLogo
            tone="inverse"
            tagline="Teman tumbuh petani Indonesia"
            wordmarkClassName="text-xl"
          />
          <span className="ml-auto hidden rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-green-50 sm:inline-flex">
            AGRI DECISION SUPPORT
          </span>
        </div>

        <div className="relative z-10 mt-10 max-w-2xl sm:mt-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FEF3C7]/30 bg-[#FEF3C7]/10 px-3 py-1.5 text-xs font-semibold text-[#FEF3C7]">
            <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" /> Pendamping keputusan untuk setiap petak
          </div>
          <h1 className="font-display max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
            Lindungi Hasil Panen <span className="text-[#FEF3C7]">Sebelum Terlambat</span>
          </h1>
          <p className="explanatory mt-5 max-w-xl text-sm leading-6 text-green-50/90 sm:text-base">
            Kenali tanda awal serangan, pahami risiko finansial, dan tentukan tindakan yang paling berarti untuk sawah Anda.
          </p>
        </div>

        <ul className="relative z-10 mt-8 divide-y divide-white/15 border-y border-white/15 sm:grid sm:grid-cols-3 sm:divide-y-0">
          {[
            { icon: <Activity size={21} strokeWidth={1.7} aria-hidden="true" />, title: "Analisis Risiko AI", detail: "Baca gejala dan kondisi lahan lebih dini." },
            { icon: <ShieldCheck size={21} strokeWidth={1.7} aria-hidden="true" />, title: "Kerugian vs Cegah", detail: "Bandingkan estimasi dampak dan biaya aksi." },
            { icon: <WifiOff size={21} strokeWidth={1.7} aria-hidden="true" />, title: "Siap di Lapangan", detail: "Mode aksesibilitas dan antrean offline." },
          ].map((feature, index) => (
            <li key={feature.title} className={`flex items-start gap-3 py-4 sm:px-3 sm:py-5 ${index > 0 ? "sm:border-l sm:border-white/15" : ""}`}>
              <span className="mt-0.5 shrink-0 text-[#FDE68A]" aria-hidden="true">{feature.icon}</span>
              <div>
                <p className="text-sm font-semibold">{feature.title}</p>
                <p className="explanatory mt-1 text-xs leading-5 text-green-100/80">{feature.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="relative z-10 mt-auto border-t border-white/15 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-green-50/80">Ringkasan dari riwayat di perangkat ini</p>
            <LocalDataBadge landing />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-medium leading-4 text-green-50/75 sm:text-xs">Total potensi hemat tercatat</dt>
              <dd className="tabular-nums mt-1 text-lg font-semibold tracking-tight text-[#FEF3C7]">{formatCompactRupiah(stats.totalSavings)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium leading-4 text-green-50/75 sm:text-xs">Petak tersimpan di perangkat</dt>
              <dd className="tabular-nums mt-1 text-lg font-semibold tracking-tight text-[#FEF3C7]">{stats.trackedCount}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium leading-4 text-green-50/75 sm:text-xs">Perlu perhatian</dt>
              <dd className="tabular-nums mt-1 text-lg font-semibold tracking-tight text-[#FEF3C7]">{stats.attentionCount}</dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-white/15 pt-4 text-xs leading-5 text-green-50/85">
            {stats.latest
              ? <>Terakhir: <span className="font-semibold text-[#FEF3C7]">{stats.latest.plotName} · Risiko {formatRiskLevel(stats.latest.riskLevel)}</span></>
              : "Siap memantau petak pertama Anda"}
          </p>
        </div>
      </section>

      <div className="flex items-center justify-center py-2 lg:py-8">
        <section className="surface mx-auto w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-bold text-green-800">Ruang kerja petani</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Mulai jaga panen Anda</h2>
            <p className="muted mt-2 text-sm leading-6 text-slate-500">Masuk untuk memeriksa kondisi petak dan melihat langkah yang bisa dilakukan.</p>
          </div>
          <button type="button" onClick={() => login(demoEmail, demoPassword)} className="primary-button flex w-full items-center justify-center gap-2 rounded-xl bg-green-800 px-4 py-3.5 text-center text-sm font-extrabold text-white transition hover:bg-green-900">
            <Sprout size={18} aria-hidden="true" /> Masuk dengan Akun Demo Juri (1-Klik)
          </button>
          <p className="explanatory mt-2 text-center text-[11px] text-slate-500">Langsung masuk menggunakan akun demo bawaan.</p>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">atau masuk manual</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              login();
            }}
            className="space-y-4"
          >
            <label htmlFor="login-email" className="block text-sm font-bold text-slate-700">
              Email
              <input id="login-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" placeholder="nama@email.com" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-100" required />
            </label>
            <label htmlFor="login-password" className="block text-sm font-bold text-slate-700">
              Kata sandi
              <input id="login-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-100" required />
            </label>
            {error && <p role="alert" aria-live="assertive" className="flex items-start gap-2 text-sm font-semibold text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p>}
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-800 bg-white px-4 py-3 text-sm font-bold text-green-800 transition hover:bg-green-50">
              Masuk <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <p className="font-extrabold text-slate-800">Kredensial demo juri</p>
            <p className="mt-1">Email: <span className="font-semibold">{demoEmail}</span></p>
            <p>Kata sandi: <span className="font-semibold">{demoPassword}</span></p>
          </div>
          <p className="muted mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Shield size={13} aria-hidden="true" /> Prototipe demo · data tersimpan di perangkat ini
          </p>
        </section>
      </div>
    </main>
  );
}

function RiskBadge({ level, score }: { level: Analysis["riskLevel"]; score: number }) {
  const style = {
    RENDAH: "bg-green-100 text-green-800",
    SEDANG: "bg-amber-100 text-amber-800",
    TINGGI: "bg-red-100 text-red-800",
  }[level];
  const Icon = level === "RENDAH" ? CheckCircle2 : level === "SEDANG" ? AlertTriangle : AlertCircle;
  return (
    <span className={`risk-badge risk-${level.toLowerCase()} inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${style}`}>
      <Icon size={15} aria-hidden="true" /> RISIKO {level} <span className="font-semibold">· {score}/100</span>
    </span>
  );
}

function RiskGauge({ score, level }: { score: number; level: Analysis["riskLevel"] }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeColor = {
    RENDAH: "#15803d",
    SEDANG: "#d97706",
    TINGGI: "#dc2626",
  }[level];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimatedScore(score));
    return () => window.cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div
      className="risk-gauge relative mx-auto w-full max-w-[190px]"
      role="img"
      aria-label={`Skor risiko ${score} dari 100, kategori ${level}`}
    >
      <svg viewBox="0 0 200 122" className="block w-full" aria-hidden="true">
        <path
          d="M 18 105 A 82 82 0 0 1 182 105"
          fill="none"
          pathLength="100"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className="gauge-track"
        />
        <path
          d="M 18 105 A 82 82 0 0 1 182 105"
          fill="none"
          pathLength="100"
          stroke={strokeColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={100 - animatedScore}
          className="risk-meter-fill"
        />
      </svg>
      <div className="absolute inset-x-0 top-[48%] -translate-y-1/2 text-center">
        <p className="tabular-nums text-3xl font-semibold leading-none tracking-tight">{score}</p>
        <p className="muted mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">dari 100</p>
      </div>
    </div>
  );
}

function AnalysisLoadingCard({ stage }: { stage: number }) {
  const progress = [
    "Membaca kondisi petak...",
    "Menganalisis risiko agronomi...",
    "Menghitung estimasi kerugian & aksi...",
  ];

  return (
    <section
      className="surface field-loading overflow-hidden rounded-3xl border border-green-100 bg-white p-6 shadow-soft sm:p-8"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-950 via-green-900 to-emerald-800 px-5 pb-5 pt-6 text-white">
        <svg className="loading-field-art absolute inset-x-0 bottom-0 h-20 w-full" viewBox="0 0 500 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 64 Q110 20 220 65 T500 55 V100 H0Z" fill="#86b64d" opacity=".8" />
          <path d="M0 79 Q130 41 270 78 T500 69 V100 H0Z" fill="#447d38" opacity=".9" />
          <path d="M0 91 Q150 60 300 88 T500 83 V100 H0Z" fill="#285d32" />
        </svg>
        <div className="relative z-10 flex min-h-32 flex-col items-center justify-center text-center">
          <div className="rice-pulse mb-3 rounded-2xl border border-white/20 bg-white/10 p-3">
            <Sprout size={34} aria-hidden="true" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-green-100">PadiGuard sedang bekerja</p>
          <p className="mt-2 text-base font-extrabold sm:text-lg">{progress[stage]}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2" aria-hidden="true">
        {progress.map((label, index) => (
          <div key={label} className={`h-1.5 rounded-full transition-colors duration-500 ${index <= stage ? "bg-green-700" : "bg-slate-100"}`} />
        ))}
      </div>
      <p className="explanatory muted mt-4 text-center text-xs text-slate-500">Mohon tunggu sebentar. Hasil ini akan mempertimbangkan gejala, cuaca, dan luas lahan.</p>
    </section>
  );
}

function AnalysisCard({
  item,
  compact = false,
  speechRate = 1,
}: {
  item: HistoryItem;
  compact?: boolean;
  speechRate?: 0.85 | 1 | 1.2;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [gkpPrice, setGkpPrice] = useState(6500);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(() =>
    item.actionSteps.map(() => false),
  );
  const [progressSaveError, setProgressSaveError] = useState("");

  useEffect(() => {
    const stored = readStorage<unknown>(actionProgressKey, {});
    const savedProgress =
      stored && typeof stored === "object" && !Array.isArray(stored)
        ? (stored as Record<string, unknown>)
        : {};
    const savedSteps = Array.isArray(savedProgress[item.id])
      ? savedProgress[item.id] as boolean[]
      : [];
    setCompletedSteps(item.actionSteps.map((_, index) => savedSteps?.[index] === true));
    setProgressSaveError("");
  }, [item.id, item.actionSteps]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const priceRatio = gkpPrice / 6500;
  const simulatedLoss = Math.round(item.estimatedLossRupiah * priceRatio);
  const simulatedSavings = Math.round(item.potentialSavingsRupiah * priceRatio);
  const completedCount = completedSteps.filter(Boolean).length;
  const progressPercent = item.actionSteps.length
    ? (completedCount / item.actionSteps.length) * 100
    : 0;

  const updateStepProgress = (index: number, checked: boolean) => {
    const nextProgress = completedSteps.map((value, stepIndex) =>
      stepIndex === index ? checked : value,
    );
    setCompletedSteps(nextProgress);
    try {
      const stored = readStorage<unknown>(actionProgressKey, {});
      const savedProgress =
        stored && typeof stored === "object" && !Array.isArray(stored)
          ? (stored as Record<string, unknown>)
          : {};
      localStorage.setItem(
        actionProgressKey,
        JSON.stringify({ ...savedProgress, [item.id]: nextProgress }),
      );
      setProgressSaveError("");
    } catch {
      setProgressSaveError("Progres tindakan tidak dapat disimpan di perangkat ini.");
    }
  };

  const speakResult = () => {
    if (!("speechSynthesis" in window)) {
      setSpeechError("Fitur suara tidak tersedia di browser ini.");
      return;
    }

    window.speechSynthesis.cancel();
    const summary = [
      `Hasil analisis untuk ${item.plotName}.`,
      `Risiko ${item.riskLevel}, skor ${item.riskScore} dari 100.`,
      `Dengan asumsi harga gabah kering panen ${formatRupiah(gkpPrice)} per kilogram, estimasi kerugian ${formatRupiah(simulatedLoss)}.`,
      `Biaya tindakan dini ${formatRupiah(item.earlyActionCostRupiah)}.`,
      `Potensi penghematan ${formatRupiah(simulatedSavings)}.`,
      ...item.actionSteps.map((step, index) => `Langkah ${index + 1}: ${step.title}. ${step.detail} Urgensi ${step.urgency}.`),
    ].join(" ");
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = "id-ID";
    utterance.rate = speechRate;
    const indonesianVoice = window.speechSynthesis.getVoices().find((voice) => /^id(?:-|_)/i.test(voice.lang));
    if (indonesianVoice) utterance.voice = indonesianVoice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeechError("");
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const shareResult = () => {
    const text = [
      `🌾 *Ringkasan PadiGuard — ${item.plotName}*`,
      `Risiko: ${item.riskLevel} (${item.riskScore}/100)`,
      `Asumsi harga GKP: ${formatRupiah(gkpPrice)}/kg`,
      `Estimasi kerugian: ${formatRupiah(simulatedLoss)}`,
      `Biaya tindakan dini: ${formatRupiah(item.earlyActionCostRupiah)}`,
      `Potensi penghematan: ${formatRupiah(simulatedSavings)}`,
      "",
      "Langkah yang disarankan:",
      ...item.actionSteps.map((step, index) => `${index + 1}. ${step.title} — ${step.detail} [${step.urgency}]`),
      "",
      "Estimasi ini merupakan dukungan keputusan, bukan diagnosis pasti.",
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const roiRatio =
    item.earlyActionCostRupiah > 0
      ? simulatedLoss / item.earlyActionCostRupiah
      : null;
  const delayedLoss = Math.round(simulatedLoss * 1.35);

  return (
    <article
      id="analysis-report"
      className="surface lift-card rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6"
      tabIndex={0}
      aria-label={`Hasil analisis ${item.plotName}. Risiko ${item.riskLevel}, skor ${item.riskScore} dari 100.`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="muted text-xs font-bold uppercase tracking-[.13em] text-slate-500">Hasil analisis · {item.date}</p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight">{item.plotName}</h3>
        </div>
        <RiskBadge level={item.riskLevel} score={item.riskScore} />
      </div>
      {item.source === "gemini" && (
        <p
          role="status"
          aria-live="polite"
          className="soft-surface mt-3 rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-semibold text-green-900"
        >
          ✓ Hasil dari Google Gemini{item.model ? ` · ${item.model}` : ""}
        </p>
      )}
      {item.source === "fallback" && (
        <p
          role="status"
          aria-live="polite"
          className="soft-surface mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-800"
        >
          Gemini AI tidak tersedia — menampilkan estimasi dari Mesin Cadangan Lokal. Coba Analisis Ulang beberapa saat lagi untuk hasil Gemini AI.
        </p>
      )}
      <div className="mt-4 grid items-center gap-3 sm:grid-cols-[180px_1fr]">
        <div>
          <RiskGauge score={item.riskScore} level={item.riskLevel} />
          <p className="mt-1 text-center text-[11px] font-bold text-slate-500">Skor risiko lapangan</p>
        </div>
        <p className="explanatory muted text-sm leading-6 text-slate-600">{item.diagnosisSummary}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="soft-surface rounded-2xl border border-red-100 bg-red-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-red-700"><ArrowDownRight size={16} aria-hidden="true" /> POTENSI KERUGIAN</div>
          <p className="tabular-nums mt-2 text-lg font-semibold tracking-tight">{formatRupiah(simulatedLoss)}</p>
        </div>
        <div className="soft-surface rounded-2xl border border-green-100 bg-green-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-green-800"><ShieldCheck size={16} aria-hidden="true" /> BIAYA TINDAKAN DINI</div>
          <p className="tabular-nums mt-2 text-lg font-semibold tracking-tight">{formatRupiah(item.earlyActionCostRupiah)}</p>
        </div>
      </div>
      <details className="simulator-panel soft-surface mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300">
          <span>Simulasi Harga Gabah (GKP)</span>
          <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
            {formatRupiah(gkpPrice)}/kg
          </span>
          <ChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform" />
        </summary>
        <div className="mt-3">
          <label htmlFor={`gkp-price-${item.id}`} className="block text-xs font-bold">
            Asumsi harga GKP per kilogram
          </label>
          <input
            id={`gkp-price-${item.id}`}
            className="gkp-price-slider mt-3 min-h-11 w-full cursor-pointer accent-green-700 focus-visible:ring-4 focus-visible:ring-green-300"
            type="range"
            min="5000"
            max="9000"
            step="250"
            value={gkpPrice}
            aria-label="Asumsi harga gabah kering panen per kilogram"
            aria-valuetext={`${formatRupiah(gkpPrice)} per kilogram`}
            onChange={(event) => setGkpPrice(Number(event.target.value))}
          />
          <div className="muted flex justify-between text-[11px] text-slate-500">
            <span>Rp5.000/kg</span>
            <span>Rp9.000/kg</span>
          </div>
          <p className="explanatory muted mt-2 text-xs leading-5 text-slate-600">
            Estimasi kerugian dan penghematan berubah proporsional terhadap harga. Biaya tindakan dini tetap.
          </p>
          <p aria-live="polite" className="mt-2 text-xs font-bold">
            Kerugian: {formatRupiah(simulatedLoss)} · Penghematan: {formatRupiah(simulatedSavings)}
          </p>
        </div>
      </details>
      <div className="print-only mt-3 text-xs">
        Simulasi GKP: {formatRupiah(gkpPrice)}/kg · Kerugian {formatRupiah(simulatedLoss)} · Penghematan {formatRupiah(simulatedSavings)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white">
        <span className="text-xs font-semibold text-slate-200">Potensi penghematan</span>
        <span className="text-sm font-extrabold">{formatRupiah(simulatedSavings)}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="soft-surface rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-green-800">Rasio penghematan · ROI</p>
          <p className="mt-1.5 text-sm font-extrabold">
            {roiRatio === null
              ? "Biaya tindakan dini Rp 0"
              : `Setiap Rp 1 biaya cegah selamatkan Rp ${roiRatio.toLocaleString("id-ID", { maximumFractionDigits: 1 })}`}
          </p>
        </div>
        <div className="soft-surface rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-amber-800">
            <AlertTriangle size={13} aria-hidden="true" /> Simulasi jika ditunda 7 hari
          </p>
          <p className="mt-1.5 text-sm font-extrabold">Potensi kerugian +35% · {formatRupiah(delayedLoss)}</p>
          <p className="explanatory mt-1 text-[10px] text-amber-900">Simulasi indikatif, bukan prediksi pasti.</p>
        </div>
      </div>
      <div className="analysis-action-buttons mt-4 flex flex-wrap gap-2">
        <button type="button" data-reader-command onClick={speaking ? stopSpeaking : speakResult} aria-pressed={speaking} aria-label={speaking ? "Berhenti membacakan hasil" : "Bacakan hasil analisis"} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-green-800 bg-white px-3 py-2 text-xs font-bold text-green-800 transition hover:bg-green-50">
          {speaking ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
          {speaking ? "Berhenti membacakan" : "Bacakan Hasil"}
        </button>
        <button type="button" onClick={shareResult} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-900">
          <Share2 size={16} aria-hidden="true" /> Bagikan ke WhatsApp Penyuluh
        </button>
        <button type="button" data-reader-command onClick={() => window.print()} aria-label="Simpan atau cetak laporan hasil analisis" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
          <Printer size={16} aria-hidden="true" /> Simpan / Cetak Laporan
        </button>
      </div>
      {speechError && <p role="status" className="muted mt-2 text-xs text-slate-500">{speechError}</p>}
      {!compact && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-extrabold"><CheckCircle2 size={17} className="text-green-700" aria-hidden="true" /> Langkah yang disarankan</h4>
            {completedCount === item.actionSteps.length && item.actionSteps.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-xs font-extrabold text-green-800">
                <CheckCircle2 size={15} aria-hidden="true" /> Penanganan Selesai
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span aria-live="polite">Progres Penanganan: {completedCount}/{item.actionSteps.length} selesai</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Progres penanganan tindakan lapangan"
              aria-valuemin={0}
              aria-valuemax={item.actionSteps.length}
              aria-valuenow={completedCount}
            >
              <div className="h-full rounded-full bg-green-700 transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {item.actionSteps.map((step, index) => (
              <li key={`${item.id}-${step.step}`} className="flex gap-3">
                <label htmlFor={`action-step-${item.id}-${index}`} className="flex min-h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                  <input
                    id={`action-step-${item.id}-${index}`}
                    type="checkbox"
                    className="h-6 w-6 cursor-pointer accent-green-700 focus-visible:ring-4 focus-visible:ring-green-300"
                    checked={completedSteps[index] === true}
                    aria-label={`Tandai langkah ${step.step} selesai: ${step.title}`}
                    onChange={(event) => updateStepProgress(index, event.target.checked)}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-bold ${completedSteps[index] ? "line-through opacity-70" : ""}`}>{step.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${step.urgency === "SEGERA" ? "bg-red-100 text-red-700" : step.urgency === "HARI INI" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                      {step.urgency === "SEGERA" ? "⚠ SEGERA" : step.urgency === "HARI INI" ? "◷ HARI INI" : "✓ PANTAU"}
                    </span>
                  </div>
                  <p className="explanatory muted mt-1 text-xs leading-5 text-slate-500">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          {progressSaveError && <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{progressSaveError}</p>}
          <p className="explanatory mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
            Estimasi ini merupakan dukungan keputusan, bukan diagnosis pasti. Konfirmasikan kondisi berisiko tinggi dengan penyuluh pertanian setempat.
          </p>
        </div>
      )}
    </article>
  );
}

function RiskSavingsTrend({ items }: { items: HistoryItem[] }) {
  const recent = items.slice(0, 5).reverse();
  const maxLoss = Math.max(1, ...recent.map((item) => item.estimatedLossRupiah));

  return (
    <section className="surface min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-green-800">Peta keputusan bisnis</p>
          <h2 className="mt-1 text-lg font-extrabold">Tren risiko & nilai tindakan</h2>
          <p className="explanatory muted mt-1 text-xs text-slate-500">Bandingkan estimasi kerugian dengan biaya pencegahan per petak.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-600" aria-label="Legenda grafik">
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="chart-legend-loss h-2.5 w-2.5 rounded-sm" /> Estimasi Kerugian</span>
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="chart-legend-cost h-2.5 w-2.5 rounded-sm" /> Biaya Pencegahan</span>
        </div>
      </div>
      <div className="mt-4 flex min-w-0 items-end gap-3 overflow-x-auto border-b border-slate-100 pb-3 pt-2">
        {recent.map((item) => {
          const lossHeight = Math.max(8, (item.estimatedLossRupiah / maxLoss) * 100);
          const costHeight = Math.max(8, (item.earlyActionCostRupiah / maxLoss) * 100);
          return (
            <div key={item.id} className="flex min-w-[86px] flex-col items-center">
              <span className="mb-1 text-[10px] font-bold text-slate-500">{item.riskScore}/100</span>
              <div className="flex h-28 items-end gap-2" role="img" aria-label={`${item.plotName}: risiko ${item.riskScore}, kerugian ${formatRupiah(item.estimatedLossRupiah)}, biaya tindakan dini ${formatRupiah(item.earlyActionCostRupiah)}`}>
                <div className="chart-bar chart-bar-loss w-7 rounded-t-lg" style={{ height: `${lossHeight}%` }} title={`Potensi kerugian ${formatRupiah(item.estimatedLossRupiah)}`} />
                <div className="chart-bar chart-bar-cost w-7 rounded-t-lg" style={{ height: `${costHeight}%` }} title={`Biaya tindakan dini ${formatRupiah(item.earlyActionCostRupiah)}`} />
              </div>
              <span className="mt-2 max-w-[86px] truncate text-center text-[10px] font-bold text-slate-600" title={item.plotName}>{item.plotName}</span>
            </div>
          );
        })}
      </div>
      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-slate-500">
          <span>Skor risiko ditampilkan di atas setiap pasangan batang.</span>
          <span>Terbaru: {recent[recent.length - 1].date}</span>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<MainTab>("beranda");
  const [historyFilter, setHistoryFilter] = useState<RiskFilter>("SEMUA");
  const [loggedIn, setLoggedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [preferences, setPreferences] = useState<Preferences>({
    theme: "light",
    colorVision: "normal",
    largeText: false,
    quickView: false,
    screenReader: false,
  });
  const [form, setForm] = useState<FieldInput>(initialForm);
  const [history, setHistory] = useState<HistoryItem[]>(sampleHistory);
  const historyRef = useRef(history);
  const [activeAnalysis, setActiveAnalysis] = useState<HistoryItem | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [speechRate, setSpeechRate] = useState<0.85 | 1 | 1.2>(1);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechRateRef = useRef(speechRate);
  const queueProcessingRef = useRef(false);
  const queueAutoAttemptRef = useRef("");
  const offlineQueue = useMemo(() => readStorage<FieldInput[]>(queueKey, []), [queueCount]);
  const filteredHistory = useMemo(
    () => historyFilter === "SEMUA" ? history : history.filter((item) => item.riskLevel === historyFilter),
    [history, historyFilter],
  );

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  const speakText = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      setSpeechMessage("Pembaca suara tidak tersedia di browser ini.");
      return;
    }

    const synthesis = window.speechSynthesis;
    if (speechUtteranceRef.current) {
      speechUtteranceRef.current.onend = null;
      speechUtteranceRef.current.onerror = null;
    }
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = speechRateRef.current;
    const indonesianVoice = synthesis.getVoices().find((voice) => /^id(?:-|_)/i.test(voice.lang));
    if (indonesianVoice) utterance.voice = indonesianVoice;
    utterance.onstart = () => {
      setSpeechPaused(false);
      setSpeechMessage("Sedang membacakan.");
    };
    utterance.onend = () => {
      setSpeechPaused(false);
      setSpeechMessage("Pembacaan selesai.");
    };
    utterance.onerror = () => {
      setSpeechPaused(false);
      setSpeechMessage("Suara tidak dapat diputar. Coba lagi atau gunakan pembaca layar perangkat.");
    };
    speechUtteranceRef.current = utterance;
    setSpeechPaused(false);
    setSpeechMessage("Menyiapkan suara Bahasa Indonesia.");
    synthesis.speak(utterance);
  }, []);

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) {
      if (speechUtteranceRef.current) {
        speechUtteranceRef.current.onend = null;
        speechUtteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
    }
    speechUtteranceRef.current = null;
    setSpeechPaused(false);
    setSpeechMessage("Pembacaan dihentikan.");
  }, []);

  const toggleSpeechPause = () => {
    if (!("speechSynthesis" in window)) return;
    if (speechPaused) {
      window.speechSynthesis.resume();
      setSpeechPaused(false);
      setSpeechMessage("Pembacaan dilanjutkan.");
    } else {
      window.speechSynthesis.pause();
      setSpeechPaused(true);
      setSpeechMessage("Pembacaan dijeda.");
    }
  };

  const saveHistory = useCallback((item: HistoryItem) => {
    const items = [item, ...historyRef.current].slice(0, 10);
    localStorage.setItem(historyKey, JSON.stringify(items));
    historyRef.current = items;
    setHistory(items);
  }, []);

  const processField = useCallback(async (field: FieldInput) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field),
      });
      const data = (await response.json()) as Analysis & { error?: string };
      if (!response.ok) throw new Error(data.error || "Analisis gagal. Silakan coba kembali.");
      const item: HistoryItem = {
        ...data,
        id: `${Date.now()}`,
        plotName: field.plotName.trim() || "Petak tanpa nama",
        date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date()),
      };
      setActiveAnalysis(item);
      saveHistory(item);
      setMessage("Analisis selesai dan tersimpan di riwayat.");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analisis gagal. Periksa koneksi lalu coba kembali.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [saveHistory]);

  useEffect(() => {
    setLoggedIn(localStorage.getItem("padiguard-session") === "demo");
    setOnline(navigator.onLine);
    setForm(readStorage(draftKey, initialForm));
    const savedHistory = readStorage(historyKey, sampleHistory);
    if (localStorage.getItem(historyKey) === null) {
      localStorage.setItem(historyKey, JSON.stringify(savedHistory));
    }
    historyRef.current = savedHistory;
    setHistory(savedHistory);
    setPreferences(readPreferences());
    setQueueCount(readStorage<FieldInput[]>(queueKey, []).length);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  }, [preferences, hydrated]);

  useEffect(() => {
    if (!preferences.screenReader) {
      stopSpeech();
      return;
    }
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [preferences.screenReader, stopSpeech]);

  useEffect(() => {
    if (!hydrated || !preferences.screenReader || !activeAnalysis) return;
    speakText(getAnalysisAnnouncement(activeAnalysis));
  }, [activeAnalysis, hydrated, preferences.screenReader, speakText]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = preferences.largeText ? "120%" : "100%";
    return () => {
      document.documentElement.style.fontSize = "100%";
    };
  }, [preferences.largeText]);

  useEffect(() => {
    if (!busy) {
      setAnalysisStage(0);
      return;
    }

    setAnalysisStage(0);
    const timer = window.setInterval(() => {
      setAnalysisStage((stage) => (stage + 1) % 3);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const processOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || busy || queueProcessingRef.current) return;
    queueProcessingRef.current = true;
    let processedCount = 0;
    try {
      while (navigator.onLine) {
        const queue = readStorage<FieldInput[]>(queueKey, []);
        if (!queue.length) break;

        const [next, ...remaining] = queue;
        localStorage.setItem(queueKey, JSON.stringify(remaining));
        setQueueCount(remaining.length);
        const succeeded = await processField(next);
        if (!succeeded) {
          const currentQueue = readStorage<FieldInput[]>(queueKey, []);
          const restoredQueue = [next, ...currentQueue];
          localStorage.setItem(queueKey, JSON.stringify(restoredQueue));
          setQueueCount(restoredQueue.length);
          queueAutoAttemptRef.current = String(restoredQueue.length);
          break;
        }
        processedCount += 1;
      }

      if (processedCount > 0 && readStorage<FieldInput[]>(queueKey, []).length === 0) {
        setMessage("Semua petak di antrean offline berhasil diproses.");
      }
    } catch (cause) {
      console.error(cause);
      setError("Antrean offline tidak dapat diperbarui. Coba proses kembali saat koneksi tersedia.");
    } finally {
      queueProcessingRef.current = false;
    }
  }, [busy, processField]);

  useEffect(() => {
    if (!hydrated || !loggedIn) return;
    if (!online) {
      queueAutoAttemptRef.current = "";
      return;
    }
    if (queueCount === 0) {
      queueAutoAttemptRef.current = "";
      return;
    }
    if (busy || queueAutoAttemptRef.current === String(queueCount)) return;
    queueAutoAttemptRef.current = String(queueCount);
    void processOfflineQueue();
  }, [online, loggedIn, hydrated, busy, queueCount, processOfflineQueue]);

  const historyStats = useMemo(() => getHistoryStats(history), [history]);
  const growthPhase = useMemo(() => {
    if (form.ageDays <= 35) {
      return {
        name: "Fase Vegetatif",
        range: "0–35 HST",
        tip: "Jaga air dangkal, dukung pembentukan anakan, dan amati daun muda secara rutin.",
      };
    }
    if (form.ageDays <= 65) {
      return {
        name: "Fase Generatif / Bunting",
        range: "36–65 HST",
        tip: "Jaga kecukupan air dan pantau bakal malai serta gejala hama di pangkal rumpun.",
      };
    }
    return {
      name: "Fase Pematangan",
      range: ">65 HST",
      tip: "Awasi pengisian bulir, kurangi genangan bertahap, dan siapkan panen saat matang.",
    };
  }, [form.ageDays]);

  const updateForm = <K extends keyof FieldInput>(key: K, value: FieldInput[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
  };

  const applyPreset = (field: FieldInput) => {
    setForm(field);
    localStorage.setItem(draftKey, JSON.stringify(field));
    setError("");
    setMessage(`Preset "${field.plotName}" siap dianalisis.`);
  };

  const submitAnalysis = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!online) {
      saveOffline();
      return;
    }
    await processField(form);
  };

  const saveOffline = () => {
    if (!form.plotName.trim()) {
      setError("Isi nama petak sebelum menyimpan ke antrean offline.");
      return;
    }
    const queue = readStorage<FieldInput[]>(queueKey, []);
    queue.push(form);
    localStorage.setItem(queueKey, JSON.stringify(queue));
    setQueueCount(queue.length);
    setMessage("");
    setToast("Data petak masuk antrean. Analisis berjalan saat koneksi kembali.");
    setError("");
  };

  const toggleSymptom = (symptom: string) => {
    const next = form.symptoms.includes(symptom)
      ? form.symptoms.filter((item) => item !== symptom)
      : [...form.symptoms, symptom];
    updateForm("symptoms", next);
  };

  const announceInteractive = useCallback((target: EventTarget | null) => {
    if (!preferences.screenReader || !(target instanceof HTMLElement)) return;
    const control = target.closest<HTMLElement>(
      'button, input, select, textarea, a[href], summary, [role="button"], [role="checkbox"], [tabindex]:not([tabindex="-1"])',
    );
    if (!control || control.closest("[data-reader-command]")) return;
    const description = describeInteractiveElement(control);
    if (description) speakText(description);
  }, [preferences.screenReader, speakText]);

  const handleReaderClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!preferences.screenReader || !(event.target instanceof HTMLElement)) return;
    const control = event.target.closest<HTMLElement>(
      'button, input, select, textarea, a[href], summary, [role="button"], [role="checkbox"], [tabindex]:not([tabindex="-1"])',
    );
    if (!control || control.closest("[data-reader-command]")) return;
    window.setTimeout(() => announceInteractive(control), 0);
  };

  const handleReaderHover = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!preferences.screenReader || event.pointerType !== "mouse" || !(event.target instanceof HTMLElement)) return;
    const control = event.target.closest<HTMLElement>(
      'button, input, select, textarea, a[href], summary, [role="button"], [role="checkbox"], [tabindex]:not([tabindex="-1"])',
    );
    if (!control || control.closest("[data-reader-command]")) return;
    if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) return;
    announceInteractive(control);
  };

  const wrapperClass = [
    "app-shell",
    preferences.theme === "high-contrast" ? "high-contrast" : "",
    preferences.quickView ? "quick-view" : "",
  ].filter(Boolean).join(" ");
  const colorFilter = preferences.colorVision !== "normal" && preferences.theme !== "high-contrast"
    ? `url(#${preferences.colorVision})`
    : undefined;

  if (!hydrated) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div
      className={wrapperClass}
      style={{ filter: colorFilter }}
      onFocusCapture={(event) => announceInteractive(event.target)}
      onClickCapture={handleReaderClick}
      onPointerOverCapture={handleReaderHover}
    >
      <a className="skip-link" href="#main-content">Loncat ke Konten Utama</a>
      {!loggedIn ? (
        <>
          <AppHeader preferences={preferences} setPreferences={setPreferences} online={online} loggedIn={loggedIn} activeTab={activeTab} onLogout={() => { localStorage.removeItem("padiguard-session"); setLoggedIn(false); }} />
          <LoginPanel onLogin={() => setLoggedIn(true)} stats={historyStats} />
        </>
      ) : (
        <div className="md:flex md:min-h-screen">
          <MainNavigation activeTab={activeTab} onNavigate={setActiveTab} />
          <div className="min-w-0 flex-1">
            <AppHeader preferences={preferences} setPreferences={setPreferences} online={online} loggedIn={loggedIn} activeTab={activeTab} onLogout={() => { localStorage.removeItem("padiguard-session"); setLoggedIn(false); }} />
            <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 md:pb-8 lg:px-8">
              <div className="min-w-0">
              {activeTab === "beranda" && (
                <div className="space-y-5">
          <section className="dashboard-hero surface relative min-h-[250px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#123E29] to-[#1A5336] px-5 py-7 text-white shadow-soft sm:px-8 sm:py-9 print:hidden">
            <div className="hero-art pointer-events-none absolute inset-x-0 bottom-0 z-0 h-36 sm:h-40" aria-hidden="true">
              <svg viewBox="0 0 1000 220" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="terrace-back" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#9cc86b" />
                    <stop offset="1" stopColor="#3f7a43" />
                  </linearGradient>
                  <linearGradient id="terrace-mid" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#679b50" />
                    <stop offset="1" stopColor="#205c3a" />
                  </linearGradient>
                  <radialGradient id="morning-light">
                    <stop offset="0" stopColor="#fff7c2" stopOpacity=".85" />
                    <stop offset="1" stopColor="#fff7c2" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle className="morning-glint" cx="790" cy="36" r="95" fill="url(#morning-light)" />
                <path d="M0 102 Q165 42 340 96 T690 84 T1000 75 V220 H0Z" fill="#b3d47a" opacity=".7" />
                <path d="M0 133 Q155 84 310 126 T625 115 T1000 107 V220 H0Z" fill="url(#terrace-back)" />
                <path d="M0 155 Q150 112 310 148 T655 139 T1000 130" fill="none" stroke="#d7e9a1" strokeWidth="3" opacity=".7" />
                <path d="M0 167 Q170 123 342 161 T680 151 T1000 146 V220 H0Z" fill="url(#terrace-mid)" />
                <path d="M0 184 Q165 145 330 178 T665 169 T1000 161" fill="none" stroke="#b9d47f" strokeWidth="3" opacity=".6" />
                <path d="M0 193 Q175 160 350 188 T700 180 T1000 175 V220 H0Z" fill="#174e35" />
                <g className="rice-sway" fill="none" stroke="#d8e9a1" strokeLinecap="round" strokeWidth="3">
                  <path d="M850 183 Q858 124 849 74" />
                  <path d="M852 129 Q824 103 814 82 M852 145 Q880 122 888 99 M850 112 Q874 88 875 69" />
                  <path d="M820 82 q-5-8 1-13 q8 2 7 11 M831 94 q-5-8 1-13 q8 2 7 11 M841 107 q-5-8 1-13 q8 2 7 11" fill="#e7edb5" stroke="none" />
                  <path d="M880 99 q-5-8 1-13 q8 2 7 11 M870 113 q-5-8 1-13 q8 2 7 11 M860 126 q-5-8 1-13 q8 2 7 11" fill="#e7edb5" stroke="none" />
                  <path d="M867 76 q-5-8 1-13 q8 2 7 11 M857 89 q-5-8 1-13 q8 2 7 11" fill="#e7edb5" stroke="none" />
                  <path d="M852 157 Q825 142 808 141 M852 168 Q879 151 900 153 M852 174 Q829 167 815 171" stroke="#a9cd78" />
                </g>
                <g className="rice-sway rice-sway-quick" fill="none" stroke="#d8e9a1" strokeLinecap="round" strokeWidth="2.5">
                  <path d="M810 186 Q801 145 806 112 M806 142 Q786 125 783 111 M807 151 Q828 133 833 118" />
                  <path d="M785 112 q-4-7 1-11 q7 2 6 9 M795 122 q-4-7 1-11 q7 2 6 9 M829 119 q-4-7 1-11 q7 2 6 9 M819 130 q-4-7 1-11 q7 2 6 9" fill="#e7edb5" stroke="none" />
                </g>
                <g className="rice-sway rice-sway-mid" fill="none" stroke="#d8e9a1" strokeLinecap="round" strokeWidth="2.5">
                  <path d="M900 185 Q909 150 905 124 M906 150 Q887 134 884 120 M907 160 Q929 145 933 130" />
                  <path d="M886 121 q-4-7 1-11 q7 2 6 9 M897 132 q-4-7 1-11 q7 2 6 9 M929 132 q-4-7 1-11 q7 2 6 9 M918 143 q-4-7 1-11 q7 2 6 9" fill="#e7edb5" stroke="none" />
                </g>
              </svg>
            </div>
            <div className="relative z-10 max-w-2xl text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-green-50">
                <Sun size={14} aria-hidden="true" /> MUSIM TANAM · PANTAU HARI INI
              </div>
              <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Selamat pagi, Pak Tani</h1>
              <p className="explanatory mt-2 max-w-xl text-sm leading-6 text-emerald-50">Satu langkah kecil hari ini bisa menjaga hasil panen esok hari. Mari cek kondisi petak Anda.</p>
            </div>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4 print:hidden" aria-label="Ringkasan KPI bisnis">
            <div className="surface flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4" tabIndex={0} aria-label={`Petak tersimpan di perangkat: ${historyStats.trackedCount}`}>
              <div className="rounded-xl bg-green-100 p-2.5 text-green-800"><Leaf size={19} aria-hidden="true" /></div>
              <div><p className="tabular-nums text-xl font-semibold">{historyStats.trackedCount}</p><p className="muted text-xs font-semibold text-slate-500">Petak tersimpan di perangkat</p></div>
            </div>
            <div className="surface flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4" tabIndex={0} aria-label={`Total potensi hemat tercatat: ${formatRupiah(historyStats.totalSavings)}`}>
              <div className="rounded-xl bg-green-100 p-2.5 text-green-800"><ShieldCheck size={19} aria-hidden="true" /></div>
              <div><p className="tabular-nums text-lg font-semibold tracking-tight">{formatCompactRupiah(historyStats.totalSavings)}</p><p className="muted text-xs font-semibold text-slate-500">Total potensi hemat tercatat</p></div>
            </div>
            <div className="surface flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4" tabIndex={0} aria-label={`${historyStats.attentionCount} petak perlu perhatian, risiko sedang atau tinggi`}>
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><AlertTriangle size={19} aria-hidden="true" /></div>
              <div><p className="tabular-nums text-xl font-semibold">{historyStats.attentionCount}</p><p className="muted text-xs font-semibold text-slate-500">Petak perlu perhatian</p></div>
            </div>
            <div className="surface flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4" tabIndex={0} aria-label={`Antrean offline: ${queueCount} petak. ${online ? "Online, siap sinkron" : "Offline"}`}>
              <div className={`rounded-xl p-2.5 ${online ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{online ? <Cloud size={19} aria-hidden="true" /> : <CloudOff size={19} aria-hidden="true" />}</div>
              <div><p className="tabular-nums text-xl font-semibold">{queueCount} petak</p><p className="muted text-xs font-semibold text-slate-500">{online ? "Antrean offline · siap sinkron" : "Status antrean · offline"}</p></div>
            </div>
          </section>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="muted text-xs text-slate-500">
              {historyStats.latest
                ? <>Terakhir: {historyStats.latest.plotName} · Risiko {formatRiskLevel(historyStats.latest.riskLevel)}</>
                : "Siap memantau petak pertama Anda"}
            </p>
            <LocalDataBadge />
          </div>
          <div className="mt-5 print:hidden">
            <RiskSavingsTrend items={history} />
          </div>
                  <section className="surface flex flex-col items-start justify-between gap-4 rounded-3xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:p-6">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[.12em] text-green-800">Pemeriksaan dini membantu menjaga hasil panen</p>
                      <h2 className="mt-1 text-lg font-extrabold">Siap memeriksa kondisi petak?</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("periksa")}
                      className="primary-button flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-900 sm:w-auto"
                    >
                      Mulai Pemeriksaan Petak <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  </section>
                </div>
              )}

              {activeTab === "periksa" && (
                <div className="space-y-6">
            <section className="surface min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6 print:hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.12em] text-green-800">Pemeriksaan petak</p>
                  <h1 id="inspection-heading" tabIndex={-1} className="mt-1 text-xl font-extrabold focus:outline-none">Bagaimana kondisi sawah?</h1>
                  <p className="explanatory muted mt-1 text-xs text-slate-500">Isi kondisi terkini untuk mendapatkan saran yang relevan.</p>
                </div>
                <span className="rounded-xl bg-green-50 p-2.5 text-green-800"><Sprout size={20} aria-hidden="true" /></span>
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold text-slate-700">Isi cepat untuk demo juri</p>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Preset skenario cepat">
                  {presetScenarios.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.field)}
                      className="preset-chip rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-left text-xs font-bold text-green-900 transition hover:border-green-500 hover:bg-green-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={submitAnalysis}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label htmlFor="plot-name" className="text-xs font-bold text-slate-700 sm:col-span-2">Nama petak
                    <input id="plot-name" value={form.plotName} onChange={(event) => updateForm("plotName", event.target.value)} placeholder="Contoh: Petak Utara" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-green-700 focus:ring-4 focus:ring-green-100" required />
                  </label>
                  <label htmlFor="rice-variety" className="text-xs font-bold text-slate-700">Varietas padi
                    <select id="rice-variety" value={form.variety} onChange={(event) => updateForm("variety", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-green-700">
                      {["IR64", "Ciherang", "Inpari 32", "Mekongga", "Inpari 42", "Lainnya"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label htmlFor="age-days" className="text-xs font-bold text-slate-700">Umur tanam <span className="font-medium text-slate-500">(HST)</span>
                    <div className="relative mt-1.5"><input id="age-days" aria-label="Umur tanam dalam hari setelah tanam" type="number" min="0" max="200" value={form.ageDays} onChange={(event) => updateForm("ageDays", Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-14 text-sm outline-none focus:border-green-700" required /><span className="absolute right-3 top-3 text-xs font-semibold text-slate-400" aria-hidden="true">hari</span></div>
                  </label>
                  <label htmlFor="area-hectares" className="text-xs font-bold text-slate-700">Luas lahan <span className="font-medium text-slate-500">(hektare)</span>
                    <div className="relative mt-1.5"><input id="area-hectares" aria-label="Luas lahan dalam hektare" type="number" min="0.01" step="0.01" value={form.areaHectares} onChange={(event) => updateForm("areaHectares", Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-12 text-sm outline-none focus:border-green-700" required /><span className="absolute right-3 top-3 text-xs font-semibold text-slate-400" aria-hidden="true">ha</span></div>
                  </label>
                  <label htmlFor="weather-condition" className="text-xs font-bold text-slate-700">Cuaca / kelembapan
                    <select id="weather-condition" value={form.weather} onChange={(event) => updateForm("weather", event.target.value as Weather)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-green-700">
                      {(["Kering", "Normal", "Lembap/Hujan Terus", "Terendam"] as Weather[]).map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>

                <div className="phase-card soft-surface rounded-2xl border border-green-100 bg-green-50/70 p-4" role="status" aria-live="polite">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-green-100 p-2 text-green-800"><Sprout size={19} aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-green-800">Fase pertumbuhan · {growthPhase.range}</p>
                      <h3 className="mt-1 text-sm font-extrabold">{growthPhase.name}</h3>
                      <p className="explanatory muted mt-1 text-xs leading-5 text-slate-600"><span className="font-bold">Fokus perawatan:</span> {growthPhase.tip}</p>
                    </div>
                  </div>
                </div>

                <fieldset>
                  <legend className="text-xs font-bold text-slate-700">Gejala yang terlihat <span className="font-medium text-slate-500">(pilih semua yang sesuai)</span></legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {symptomsList.map((symptom) => {
                      const selected = form.symptoms.includes(symptom);
                      return <button key={symptom} type="button" aria-pressed={selected} data-reader-pressed-label={selected ? "dipilih" : "tidak dipilih"} onClick={() => toggleSymptom(symptom)} className={`symptom-chip rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? "border-green-800 bg-green-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-green-700"}`}>{selected && <Check size={12} className="mr-1 inline" aria-hidden="true" />}{symptom}</button>;
                    })}
                  </div>
                </fieldset>
                <label htmlFor="field-notes" className="block text-xs font-bold text-slate-700">Catatan tambahan <span className="font-medium text-slate-500">(opsional)</span>
                  <textarea id="field-notes" rows={2} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Ceritakan kondisi lain yang Anda amati..." className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-green-700" />
                </label>

                {error && <div role="alert" aria-live="assertive" aria-atomic="true" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</div>}
                {message && <div role="status" aria-live="polite" aria-atomic="true" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{message}</div>}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <button disabled={busy || !online} type="submit" className="primary-button flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-800 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60">
                    {busy ? <><RefreshCw size={17} aria-hidden="true" /> Menganalisis...</> : <><Activity size={17} aria-hidden="true" /> Analisis kondisi petak</>}
                  </button>
                  {!online && <button type="button" onClick={saveOffline} className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"><CloudOff size={17} aria-hidden="true" /> Simpan ke Antrean Offline</button>}
                </div>
                <p className="explanatory muted flex items-center gap-1.5 text-[11px] text-slate-400"><CheckCircle2 size={13} aria-hidden="true" /> Draft tersimpan otomatis di perangkat ini</p>
              </form>
            </section>

            <section aria-label="Hasil analisis terbaru" aria-live="polite">
              {busy ? (
                <AnalysisLoadingCard stage={analysisStage} />
              ) : activeAnalysis ? (
                <AnalysisCard key={activeAnalysis.id} item={activeAnalysis} speechRate={speechRate} />
              ) : (
                <div className="surface flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="rounded-2xl bg-green-50 p-4 text-green-800"><Activity size={28} aria-hidden="true" /></div>
                  <h2 className="mt-4 text-lg font-extrabold">Hasil analisis akan muncul di sini</h2>
                  <p className="explanatory muted mt-2 max-w-sm text-sm leading-6 text-slate-500">Lengkapi kondisi petak, lalu analisis risiko untuk melihat perkiraan kerugian dan tindakan pencegahan.</p>
                </div>
              )}
            </section>
                </div>
              )}

              {activeTab === "riwayat" && (
                <div className="space-y-6">
                  <section className="surface rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.12em] text-green-800">Arsip petak</p>
                        <h1 className="mt-1 text-2xl font-extrabold">Riwayat Analisis</h1>
                        <p className="explanatory muted mt-1 text-sm text-slate-500">Pilih catatan untuk membuka kembali detail hasilnya.</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{filteredHistory.length} catatan</span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter riwayat berdasarkan tingkat risiko">
                      {([
                        ["SEMUA", "Semua"],
                        ["TINGGI", "Tinggi"],
                        ["SEDANG", "Sedang"],
                        ["RENDAH", "Rendah"],
                      ] as Array<[RiskFilter, string]>).map(([filter, label]) => (
                        <button
                          key={filter}
                          type="button"
                          aria-pressed={historyFilter === filter}
                          onClick={() => setHistoryFilter(filter)}
                          className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold transition ${historyFilter === filter ? "border-green-800 bg-green-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {filteredHistory.length ? filteredHistory.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-current={activeAnalysis?.id === item.id ? "page" : undefined}
                          aria-label={`Buka hasil ${item.plotName}, risiko ${item.riskLevel}, skor ${item.riskScore}`}
                          onClick={() => setActiveAnalysis(item)}
                          className={`history-entry flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${activeAnalysis?.id === item.id ? "border-green-700 bg-green-50" : "border-slate-200 bg-slate-50/70 hover:border-green-300"}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{item.plotName}</p>
                            <p className="muted mt-1 text-xs text-slate-500">{item.date} · {formatRupiah(item.potentialSavingsRupiah)} potensi hemat</p>
                          </div>
                          <RiskBadge level={item.riskLevel} score={item.riskScore} />
                        </button>
                      )) : (
                        <p className="muted rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                          Belum ada riwayat untuk filter risiko ini.
                        </p>
                      )}
                    </div>
                    <p className="explanatory muted mt-4 text-xs text-slate-500">Riwayat tersimpan hanya di perangkat ini.</p>
                  </section>

                  {activeAnalysis && (
                    <section aria-label="Detail hasil riwayat" aria-live="polite">
                      <AnalysisCard key={activeAnalysis.id} item={activeAnalysis} speechRate={speechRate} />
                    </section>
                  )}

                  <section className="surface rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6" aria-labelledby="offline-queue-heading">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.12em] text-amber-800">Sinkronisasi lapangan</p>
                        <h2 id="offline-queue-heading" className="mt-1 text-xl font-extrabold">Antrean Offline · {queueCount} petak</h2>
                        <p className="muted mt-1 text-sm text-slate-500" role="status">{online ? "Koneksi tersedia; antrean akan diproses otomatis." : "Offline; data tersimpan di perangkat dan diproses saat online."}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!online || busy || queueCount === 0}
                        onClick={() => void processOfflineQueue()}
                        className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-green-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Proses semua data antrean offline saat online"
                      >
                        {busy ? <RefreshCw size={16} aria-hidden="true" /> : <Cloud size={16} aria-hidden="true" />}
                        {busy ? "Memproses antrean..." : "Proses Semua Saat Online"}
                      </button>
                    </div>
                    {error && <p role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
                    {message && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</p>}
                    {offlineQueue.length ? (
                      <ol className="mt-4 space-y-2">
                        {offlineQueue.map((field, index) => (
                          <li key={`${field.plotName}-${index}`} className="soft-surface flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                            <span className="min-w-0 truncate font-semibold">{field.plotName || "Petak tanpa nama"}</span>
                            <span className="muted shrink-0 text-xs text-slate-500">{field.variety} · {field.ageDays} HST</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="muted mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Antrean kosong. Data baru yang disimpan saat offline akan tampil di sini.</p>
                    )}
                  </section>
                </div>
              )}

              {activeTab === "panduan" && (
                <div className="space-y-6">
                  <section>
                    <p className="text-xs font-extrabold uppercase tracking-[.12em] text-green-800">Referensi cepat lapangan</p>
                    <h1 className="mt-1 text-2xl font-extrabold">Panduan Padi</h1>
                    <p className="explanatory muted mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                      Gunakan sebagai pengingat awal saat mengamati petak. Gejala serupa dapat memiliki penyebab berbeda; konfirmasikan temuan penting dengan penyuluh.
                    </p>
                  </section>
                  <section aria-labelledby="phase-guide-heading">
                    <h2 id="phase-guide-heading" className="text-lg font-extrabold">Ringkasan Fase Pertumbuhan</h2>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {ricePhaseGuide.map((phase) => (
                        <article key={phase.name} className="surface lift-card rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                          <span className="inline-flex min-h-9 items-center rounded-full bg-green-100 px-3 text-xs font-extrabold text-green-800">{phase.range}</span>
                          <h3 className="mt-3 text-lg font-extrabold">{phase.name}</h3>
                          <p className="explanatory muted mt-2 text-sm leading-6 text-slate-600">{phase.focus}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section aria-labelledby="symptom-guide-heading">
                    <h2 id="symptom-guide-heading" className="text-lg font-extrabold">Kamus Cepat Gejala</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {quickSymptomGuide.map((entry) => (
                        <article key={entry.name} className="surface lift-card rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                          <h3 className="text-base font-extrabold">{entry.name}</h3>
                          <p className="mt-2 text-sm leading-6"><span className="font-bold">Yang diamati:</span> {entry.cue}</p>
                          <p className="explanatory muted mt-2 text-sm leading-6 text-slate-600"><span className="font-bold">Langkah awal:</span> {entry.action}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              </div>
              <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row print:hidden">
                <span className="flex items-center gap-1.5"><Sprout size={14} aria-hidden="true" /> PadiGuard <span>· Teman tumbuh petani Indonesia</span></span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} aria-hidden="true" /> Gunakan sebagai dukungan keputusan lapangan</span>
              </footer>
            </main>
          </div>
        </div>
      )}
      {preferences.screenReader && (
        <section className="speech-control-bar surface fixed bottom-20 left-3 right-3 z-[60] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:left-auto sm:right-6 md:bottom-4 print:hidden" role="region" aria-label="Kontrol pembaca suara">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" data-reader-command onClick={() => {
              const content = document.getElementById("main-content")?.innerText.replace(/\s+/g, " ").trim();
              if (content) speakText(content);
            }} aria-label="Bacakan halaman ini" className="min-h-11 rounded-xl bg-green-800 px-3 py-2 text-xs font-bold text-white focus-visible:ring-4">
              Bacakan Halaman Ini
            </button>
            <button type="button" data-reader-command onClick={toggleSpeechPause} aria-label={speechPaused ? "Lanjutkan pembacaan" : "Jeda pembacaan"} aria-pressed={speechPaused} className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus-visible:ring-4">
              {speechPaused ? "Lanjutkan" : "Jeda"}
            </button>
            <button type="button" data-reader-command onClick={stopSpeech} aria-label="Berhenti membacakan" className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus-visible:ring-4">
              Berhenti
            </button>
            <label htmlFor="speech-rate" className="sr-only">Kecepatan suara</label>
            <select id="speech-rate" data-reader-command aria-label="Kecepatan suara" value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value) as 0.85 | 1 | 1.2)} className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold focus-visible:ring-4">
              <option value="0.85">0.85x Lambat</option>
              <option value="1">1.0x Normal</option>
              <option value="1.2">1.2x Cepat</option>
            </select>
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{speechMessage}</p>
        </section>
      )}
      {toast && (
        <div className={`toast-notice surface fixed left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-green-200 bg-white px-4 py-3 shadow-soft sm:left-auto sm:right-6 print:hidden ${preferences.screenReader ? "bottom-28" : "bottom-20"} md:bottom-4`} role="status" aria-live="polite" aria-atomic="true">
          <span className="rounded-full bg-green-100 p-2 text-green-800"><Cloud size={17} aria-hidden="true" /></span>
          <p className="flex-1 text-sm font-semibold">{toast}</p>
          <button type="button" onClick={() => setToast("")} aria-label="Tutup notifikasi" className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
