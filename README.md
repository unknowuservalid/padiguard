# PadiGuard

**PadiGuard** adalah prototipe pendukung keputusan bisnis agribisnis untuk petani padi dan penyuluh lapangan. Aplikasi membantu menilai indikasi risiko hama/penyakit, membandingkan estimasi kerugian dengan biaya tindakan dini, dan menyediakan antarmuka yang lebih mudah digunakan di lapangan.

## Live Demo dan akun uji coba

- Live demo: [https://padiguard.vercel.app/](https://padiguard.vercel.app/)
- Akun demo: **juri@padiguard.id** / **demo123**
- Tombol **Masuk dengan Akun Demo Juri (1-Klik)** dapat digunakan untuk langsung mencoba aplikasi.

## Menjalankan secara lokal

1. Gunakan Node.js 20.9 atau lebih baru.
2. Pasang dependency:

   ```bash
   npm install
   ```

3. Salin `.env.example` ke `.env.local`, kemudian isi `GEMINI_API_KEY` dari Google AI Studio. Kunci dibaca oleh route server dan tidak boleh memakai awalan `NEXT_PUBLIC_`.
4. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000).

## Ringkasan fitur

- Pemeriksaan petak melalui `POST /api/analyze`, memakai `@google/genai`, instruksi sistem PHT, dan keluaran JSON terstruktur.
- Cascade model `gemini-3.8-flash` → retry satu kali untuk error kapasitas `429`/`503` → `gemini-3.5-flash-lite` → fallback lokal berbasis aturan jika semua panggilan gagal.
- Indikator sumber hasil (`gemini` atau `fallback`) dan nama model yang digunakan untuk hasil cloud.
- Draft, sesi demo, preferensi aksesibilitas, riwayat, progres checklist, dan antrean offline pada `localStorage`.
- Empat menu utama: Beranda, Periksa, Riwayat, dan Panduan; sidebar desktop dan navigasi bawah pada mobile.
- Simulasi harga GKP, estimasi kerugian dan biaya tindakan, checklist penanganan, berbagi ringkasan lewat WhatsApp, serta cetak/simpan PDF.
- Tema terang/gelap/kontras tinggi, Aa Besar, filter buta warna, Mode Ringkas, Pembaca Suara Bahasa Indonesia, dan dukungan navigasi keyboard.

Fallback merupakan estimasi indikatif berbasis aturan, bukan diagnosis atau hasil dataset pelatihan. Selalu konfirmasikan indikasi berisiko dengan pemeriksaan lapangan atau penyuluh.

## Dokumentasi kompetisi

Dokumentasi prompt, intervensi manusia, alur teknis, dependency, data, dan aset pihak ketiga tersedia di [LOG_VIBE_CODING.md](./LOG_VIBE_CODING.md).

## Deploy ke Vercel

Hubungkan repository ke Vercel, tambahkan `GEMINI_API_KEY` sebagai environment variable server untuk environment yang digunakan, lalu deploy. Jangan mengatur kunci dengan awalan `NEXT_PUBLIC_`.
