import type { Metadata } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "PadiGuard — Teman Tumbuh Petani",
  description:
    "Pantau risiko tanaman padi lebih awal dan ambil keputusan yang tepat untuk setiap petak.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="light" className={`${plusJakartaSans.variable} ${lora.variable}`}>
      <body>
        <svg className="sr-only" aria-hidden="true" focusable="false">
          <defs>
            <filter id="protanopia" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.567 0.433 0 0 0
                        0.558 0.442 0 0 0
                        0 0.242 0.758 0 0
                        0 0 0 1 0"
              />
            </filter>
            <filter id="deuteranopia" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.625 0.375 0 0 0
                        0.700 0.300 0 0 0
                        0 0.300 0.700 0 0
                        0 0 0 1 0"
              />
            </filter>
            <filter id="tritanopia" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.950 0.050 0 0 0
                        0 0.433 0.567 0 0
                        0 0.475 0.525 0 0
                        0 0 0 1 0"
              />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
