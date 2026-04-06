import localFont from "next/font/local";
import { Montserrat } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kapha - Sistem Informasi Analisis Putusan Pajak Indonesia",
  description: "Sistem Informasi Analisis Putusan Pajak Indonesia",
  icons: {
    icon: "/Logo_Alpha.svg",
  },
};

// 1. Setup Montserrat dari Google Fonts
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

// 2. Setup Coolvetica dari file lokal di public/fonts/
const coolvetica = localFont({
  src: "../../public/fonts/coolvetica rg.ttf", // Sesuaikan nama file & path
  variable: "--font-coolvetica",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 3. Masukkan variabel font ke body agar bisa diakses CSS/Tailwind */}
      <body className={`${montserrat.variable} ${coolvetica.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}