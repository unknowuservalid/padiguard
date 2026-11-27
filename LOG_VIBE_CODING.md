# Dokumentasi AI Coding Assistant (Log Vibe Coding) — PadiGuard

## 1. Identitas

| Informasi | Keterangan |
|---|---|
| Tim | Kata Arkan Terserah \| Politeknik Astra (ASTRAtech) |
| Anggota | Salsabilla Febyanti (0320250068 — Ketua) dan Raditya Arkan Megantoro (0320250057 — Anggota) |
| Live Demo | [padiguard.vercel.app](https://padiguard.vercel.app/) |
| Akun Demo | `juri@padiguard.id` / `demo123` |

PadiGuard adalah prototipe pendukung keputusan untuk membantu petani padi dan penyuluh mengamati kondisi petak, memahami indikasi risiko, dan membandingkan estimasi dampak finansial dengan biaya tindakan dini. Hasilnya bersifat indikatif dan bukan pengganti pemeriksaan lapangan.

## 2. Daftar Prompt Utama

Tabel berikut merangkum arahan utama yang membentuk produk; ini adalah ringkasan tema prompt, bukan transkrip verbatim.

| No. | Fokus arahan | Hasil yang diwujudkan |
|---:|---|---|
| 1 | Bangun aplikasi Next.js App Router yang mobile-first, dengan landing page, login demo satu klik, navigasi dashboard, dan form pemeriksaan petak. | Landing/login dan empat menu Beranda, Periksa, Riwayat, serta Panduan; input mencakup varietas, umur tanam, luas, cuaca, gejala, dan catatan. |
| 2 | Buat `POST /api/analyze` memakai `@google/genai` dan instruksi sistem agronomi Indonesia yang mengikuti prinsip Pengendalian Hama Terpadu (PHT). | Route server mengirim input petak ke Gemini, meminta JSON terstruktur melalui `responseMimeType` dan `responseSchema`, lalu memeriksa bentuk hasilnya. |
| 3 | Tambahkan ketahanan bertingkat: `gemini-3.8-flash` → `gemini-3.5-flash-lite` → `createLocalFallback()`, serta antrean saat offline. | Error kapasitas `429`/`503` pada model utama dicoba ulang sekali setelah jeda 1.500 ms; setelahnya route mencoba model cadangan. Kegagalan model atau API key kosong mengaktifkan fallback lokal. Form yang disimpan saat offline masuk antrean `localStorage` dan dicoba saat koneksi kembali. |
| 4 | Buat kalkulasi ekonomi yang dapat dipahami, simulasi harga Gabah Kering Panen (GKP), serta berbagi ringkasan lewat WhatsApp. | Kartu hasil membandingkan estimasi kerugian dan biaya tindakan dini, menghitung penghematan, menyediakan slider asumsi GKP, checklist aksi, serta tombol berbagi WhatsApp yang membuka aplikasi dengan teks ringkasan untuk ditinjau pengguna. |
| 5 | Sediakan paket aksesibilitas untuk penggunaan di lapangan: Aa Besar, Kontras Tinggi, filter buta warna, dan TTS. | Preferensi tema, ukuran teks, tampilan ringkas, dan filter warna disimpan lokal. Pembaca Suara menggunakan Web Speech API dengan bahasa `id-ID`; navigasi juga menyediakan label semantik, tautan skip, dan dukungan keyboard. |

## 3. Catatan Intervensi Manusia (Human-in-the-Loop)

Implementasi dan asumsi berikut perlu dipahami serta ditinjau manusia; keputusan akhir tentang kondisi sawah tetap melibatkan petani atau penyuluh.

### Pemeriksaan input dan kerahasiaan API

- `POST()` di `app/api/analyze/route.ts` menolak body JSON yang tidak terbaca, object yang tidak valid, varietas kosong, HST non-finite/negatif, luas non-finite/tidak positif/lebih dari 10.000 hektare, cuaca di luar pilihan, serta gejala yang bukan array string. Server memeriksa `plotName` sebagai string tetapi tidak mewajibkan nilainya non-kosong; daftar nilai gejala juga tidak dibatasi server ke `symptomsList` frontend.
- `notes` dikirim bersama objek input ke prompt Gemini, tetapi tidak memiliki pemeriksaan tipe tersendiri pada validasi server saat ini. Form frontend menyediakan catatan bebas.
- Route membaca `process.env.GEMINI_API_KEY?.trim()` di server dan membuat instance `GoogleGenAI` di route tersebut. Kunci tidak dimasukkan ke bundle browser; konfigurasi deployment harus menggunakan environment variable server tanpa awalan `NEXT_PUBLIC_`.

### Validasi keluaran dan kalkulasi

- Hasil model diminta dengan `responseSchema`, dibersihkan dari pembungkus Markdown bila ada, diparsing sebagai JSON, lalu diperiksa oleh `isValidAnalysis()`. Pemeriksaan runtime ini memastikan kategori/skor risiko, nominal non-negatif dan finite, serta tepat tiga langkah aksi.
- Ini merupakan dua lapis pembatasan keluaran (schema Gemini dan validasi runtime server), **bukan** pemanggilan `isValidAnalysis()` dua kali. Frontend memeriksa status HTTP dan menangani error; ia belum menjalankan validasi schema kedua terhadap payload sukses.
- Untuk hasil Gemini, route menghitung ulang `potentialSavingsRupiah` sebagai `max(0, estimatedLossRupiah - earlyActionCostRupiah)` sebelum mengirim respons. Fallback lokal juga menggunakan rumus tersebut.

### Tinjauan aturan fallback

`createLocalFallback()` adalah heuristik deterministik, bukan model machine learning dan bukan hasil dataset pelatihan. Bobot yang saat ini ditetapkan di kode meliputi:

- Skor dasar `8`, ditambah bobot fase HST (`5`, `8`, atau `3`), cuaca (`0`, `7`, `18`, atau `27`), dan gejala yang dipilih (antara `8` dan `22` per gejala), kemudian dibatasi pada rentang 0–100.
- Estimasi kerugian per hektare memakai asumsi `Rp10.000.000 × (0,02 + 0,38 × skor risiko / 100)`. Biaya tindakan per hektare memakai `Rp120.000`, ditambah `Rp42.000` per gejala serta biaya cuaca `Rp100.000` saat terendam, `Rp65.000` saat lembap/hujan terus, atau `Rp20.000` untuk kondisi cuaca lainnya; hasil dibulatkan ke ribuan rupiah. Varietas ditampilkan dalam ringkasan fallback, tetapi tidak menambah atau mengurangi skor pada aturan saat ini.
- Angka-angka tersebut adalah asumsi aturan pada implementasi saat ini. Tim perlu mengkalibrasi dan meninjau kewajarannya bersama penyuluh/ahli agronomi sebelum menggunakannya sebagai rekomendasi operasional.

### Pemeriksaan antrean offline

Kode mendeteksi status koneksi melalui `navigator.onLine` dan event `online`/`offline`. `saveOffline()` menyimpan input ke antrean lokal; `processOfflineQueue()` mengirim antrean ketika koneksi tersedia dan mengembalikan item ke antrean jika pemrosesan gagal.

**Catatan bukti uji:** repository tidak menyertakan laporan atau automated test yang membuktikan pengujian Mode Pesawat telah lulus. Sebelum menyatakan pengujian selesai, tim perlu mencatat hasil pemeriksaan manual: aktifkan Mode Pesawat, simpan petak ke antrean, pastikan antrean tetap ada setelah reload, pulihkan koneksi, lalu pastikan item diproses dan masuk ke riwayat. Ketersediaan koneksi internet diperlukan untuk analisis cloud; fallback lokal di server adalah jalur saat panggilan model gagal, bukan pengganti antrean browser yang belum terkirim.

## 4. Sumber Dataset dan Aset Pihak Ketiga

### Pustaka, API, dan lisensi

Versi berikut adalah **rentang versi yang tertulis di `package.json`**. Kolom versi terpasang dan lisensi diperiksa dari metadata paket lokal; rentang `^` dapat mengizinkan versi patch/minor yang lebih baru, sedangkan `package-lock.json` mengunci resolusi instalasi.

| Paket / layanan | Peran | `package.json` | Terpasang saat pemeriksaan | Lisensi / ketentuan |
|---|---|---:|---:|---|
| `next` | App Router, server route, build, dan optimasi font | `^16.4.6` | `16.4.6` | MIT |
| `react` | UI dan state komponen | `^19.2.0` | `19.3.1` | MIT |
| `react-dom` | Rendering React untuk web | `^19.2.0` | `19.3.1` | MIT |
| `@google/genai` | SDK untuk pemanggilan Gemini dari server | `^1.11.0` | `1.52.0` | Apache-2.0 |
| `lucide-react` | Ikon UI | `^0.468.0` | `0.468.0` | ISC |
| `@types/node` | Deklarasi tipe Node.js | `^22.10.2` | `22.20.7` | MIT |
| `@types/react` | Deklarasi tipe React | `^19.2.0` | `19.3.3` | MIT |
| `@types/react-dom` | Deklarasi tipe React DOM | `^19.2.0` | `19.3.0` | MIT |
| `autoprefixer` | Pemrosesan kompatibilitas CSS | `^10.4.23` | `10.7.0` | MIT |
| `postcss` | Pemrosesan CSS | `^8.5.23` | `8.5.33` | MIT |
| `tailwindcss` | Utility CSS | `^3.4.17` | `3.4.19` | MIT |
| `typescript` | Pemeriksaan dan kompilasi tipe | `^5.7.2` | `5.9.3` | Apache-2.0 |
| Google Gemini API | Model `gemini-3.8-flash` dan `gemini-3.5-flash-lite` melalui SDK | Layanan eksternal; bukan paket terpisah di manifest | — | Tunduk pada ketentuan Google AI/Gemini API |
| Web Speech API | TTS opsional melalui browser (`speechSynthesis`) | API browser; bukan dependency npm | — | Disediakan browser/platform; bukan aset aplikasi |
| Plus Jakarta Sans, Lora | Font UI dan headline melalui `next/font/google` | Disediakan melalui Next.js; bukan dependency font npm terpisah | — | Google Fonts, SIL Open Font License (OFL) |

### Data dan rujukan agronomi

- Aplikasi tidak mengimpor dataset tertutup atau dataset eksternal untuk menghasilkan skor fallback. Data pemeriksaan berasal dari input pengguna; dua entri pada `sampleHistory` adalah data sintetis untuk mengisi tampilan awal.
- Skor dan estimasi pada `createLocalFallback()` berasal dari aturan serta asumsi finansial yang tertulis di kode, bukan statistik yang diklaim berasal dari dataset Kementan, FAO, atau BPS.
- Referensi terbuka yang relevan untuk ditinjau tim: Kementerian Pertanian Republik Indonesia (2022), [portal Kementerian Pertanian](https://www.pertanian.go.id/); FAO (2021), [portal publikasi FAO](https://www.fao.org/publications/); dan BPS (2024), [portal publikasi BPS](https://www.bps.go.id/id/publication). Repository tidak mencatat judul dokumen, nomor publikasi, halaman, atau dataset spesifik dari tiga lembaga tersebut. Karena itu, ketiganya dicantumkan sebagai rujukan kontekstual yang perlu dilengkapi sitasi bibliografis spesifik sebelum dipresentasikan sebagai sumber angka atau bobot model.

### Aset visual

| Aset | Sumber / penggunaan |
|---|---|
| Logo PadiGuard | Mark perisai dan bulir padi berupa SVG inline buatan proyek pada `app/components/PadiGuardLogo.tsx`; tidak memerlukan file gambar atau paket ikon untuk mark tersebut. |
| Ikon antarmuka | Komponen dari `lucide-react`; lisensi paket tercantum pada tabel di atas. |
| Ilustrasi sawah | SVG inline/CSS di aplikasi, bukan dataset visual eksternal. |
| Canva | Tidak ada aset Canva yang dirujuk atau diimpor oleh source code aplikasi. Jika tim memakai Canva untuk materi presentasi/poster kompetisi, catat aset dan lisensinya pada materi tersebut secara terpisah; jangan menganggapnya sebagai aset runtime aplikasi. |

## Ringkasan Alur Teknis

1. Pengguna mengisi data petak pada frontend dan draft disimpan di `localStorage`.
2. Saat online, frontend mengirim JSON melalui `fetch("/api/analyze", { method: "POST" })`. Saat offline, `saveOffline()` menambahkan input ke antrean lokal.
3. Route memvalidasi input, memanggil Gemini dengan instruksi PHT dan schema JSON, lalu memberi metadata `source: "gemini"` serta nama model yang berhasil.
4. Jika model gagal, route beralih melalui retry/cadangan yang sesuai dan akhirnya dapat menghasilkan `source: "fallback"` dari `createLocalFallback()`.
5. Hasil disimpan di riwayat lokal, ditampilkan bersama simulasi ekonomi dan langkah tindakan, dan dapat dibacakan atau dibagikan oleh pengguna.

> Semua estimasi risiko dan finansial dalam prototipe merupakan dukungan keputusan indikatif. Validasi lapangan dan arahan penyuluh tetap diperlukan.
