import type { Metadata } from "next";
import { Noto_Naskh_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["500", "700"],
  variable: "--font-noto-arabic",
});

export const metadata: Metadata = {
  title: "Arabic Block Rush — CMS Materi & Tingkat Kesulitan",
  description:
    "Panel admin untuk mengelola Bab, Mufrodat Bahasa Arab, dan tingkat kesulitan arena game Roblox Arabic Block Rush dengan Neon PostgreSQL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${notoArabic.variable}`}>
      <body className="min-h-screen antialiased selection:bg-amber-400/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
