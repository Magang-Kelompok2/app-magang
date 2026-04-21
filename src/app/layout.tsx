import localFont from "next/font/local";
import { Montserrat } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import ConditionalNavbar from "@/components/ConditionalNavbar";

export const metadata: Metadata = {
  title: "Sistem Analisis Putusan Pajak",
  description: "Aplikasi Analisis Putusan Pajak Indonesia",
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
        <Providers>
          <div className="flex flex-col h-screen overflow-hidden">
            <ConditionalNavbar />
            <main className="flex-1 overflow-y-auto flex flex-col">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}