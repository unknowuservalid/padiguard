# PadiGuard

Prototipe Next.js App Router untuk mendukung pemantauan risiko tanaman padi, perbandingan estimasi kerugian dan biaya tindakan dini, serta aksesibilitas lapangan.

## Menjalankan aplikasi

1. Pasang Node.js 20.9 atau lebih baru.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env.local`, lalu isi `GEMINI_API_KEY` dari Google AI Studio. Kunci hanya digunakan oleh route server dan tidak diekspos ke browser.
4. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

Login demo: `juri@padiguard.id` / `demo123`. Tombol **Masuk dengan Akun Demo** mengisi dan memproses login sekaligus.

## Fitur prototipe

- Analisis petak melalui `POST /api/analyze` dengan Gemini `gemini-3.8-flash` dan JSON terstruktur. Respons hasil cloud menyertakan `source: "gemini"` dan nama model aktual; kartu hasil menampilkan keduanya. Untuk error `429`/`503`, endpoint mencoba ulang model utama sekali setelah 1,5 detik lalu beralih ke `gemini-3.5-flash-lite`.
- Draft, preferensi aksesibilitas, sesi demo, riwayat, dan antrean offline disimpan di `localStorage` browser.
- Tema terang/gelap/kontras tinggi, skala teks, tampilan ringkas, serta filter simulasi buta warna tersimpan sebagai preferensi lokal.
- Pembaca Suara opsional memakai Web Speech API Bahasa Indonesia, mengumumkan kontrol saat fokus/hover, membacakan hasil analisis, dan menyediakan kontrol kecepatan/jeda.
- Navigasi keyboard mencakup tautan loncat ke konten utama, focus ring, dan drawer aksesibilitas dengan perangkap fokus serta tombol Escape.
- Analisis antrean offline dicoba otomatis saat koneksi internet kembali.
- Visual risiko interaktif, rasio penghematan dan simulasi penundaan, pembacaan hasil, serta berbagi ringkasan ke WhatsApp.
- Kartu hasil menyediakan simulasi harga GKP real-time, checklist tindakan tersimpan per riwayat, dan laporan siap cetak/simpan PDF.
- Ilustrasi sawah SVG, status proses analisis, dan micro-interactions menghormati mode kontras tinggi serta preferensi reduced motion.
- Tipografi memakai Plus Jakarta Sans untuk UI dan Lora untuk headline; angka KPI, skor, dan nominal menggunakan angka tabular.
- Landing page split-screen dengan akses demo 1-klik, daftar manfaat ringkas, ringkasan riwayat lokal, empat KPI bisnis, tren biaya/kerugian, fase tumbuh padi, dan preset skenario lapangan.
- Dashboard berisi empat menu: Beranda, Periksa, Riwayat dengan filter risiko serta antrean offline, dan Panduan fase/gejala; navigasi memakai sidebar desktop dan bar bawah mobile.
- Ringkasan Landing Page dan Beranda dihitung dinamis dari riwayat lokal, termasuk potensi hemat, petak yang perlu perhatian, dan pemantauan terakhir. Dua entri awal membantu mengisi dashboard saat kunjungan pertama.
- Analisis adalah dukungan keputusan; konfirmasi kondisi lapangan dengan penyuluh.

Jika kedua model Gemini gagal karena alasan apa pun (termasuk `404`, `429`, `503`, timeout, atau kunci API tidak tersedia), endpoint mengembalikan estimasi lokal berbasis aturan dengan `source: "fallback"` dan UI menandainya secara transparan. Input yang tidak valid tetap ditolak; estimasi lokal bukan diagnosis pasti dan kondisi berisiko perlu dikonfirmasi dengan penyuluh.

## Deploy ke Vercel

Hubungkan repositori ke Vercel, atur `GEMINI_API_KEY` sebagai environment variable server, lalu deploy. Jangan mengatur kunci dengan awalan `NEXT_PUBLIC_`.
