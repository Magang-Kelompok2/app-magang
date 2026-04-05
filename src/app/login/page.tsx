"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    // TODO: ganti dengan logic auth kamu (NextAuth, JWT, dsb.)
    await new Promise((r) => setTimeout(r, 1000)); // simulasi loading
    setLoading(false);

    // Contoh: redirect ke dashboard setelah login
    router.push("/");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      {/* Outer card */}
      <div
        className="w-full max-w-[1000px] min-h-[580px] rounded-[28px] overflow-hidden flex shadow-2xl"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* ── Kiri: Form ── */}
        <div className="flex-1 flex flex-col justify-center px-16 py-14">
          {/* Logo kecil */}
          <div className="flex items-center gap-3 mb-10">
            <Image
              src="/Logo Alpha.png"
              alt="Logo Alpha"
              width={40}
              height={40}
              className="object-contain"
            />
            <span
              className="text-[#0C4E8C] text-sm font-light leading-tight"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Sistem Informasi Analisis<br />
              <span className="text-[#0C81E4] font-light">Putusan Pajak</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-[2.6rem] text-gray-900 leading-none mb-2"
              style={{ fontFamily: "var(--font-coolvetica)" }}
            >
              Login
            </h1>
            <p
              className="text-sm text-gray-400"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Silahkan lakukan Login terlebih dahulu
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div
              className="flex items-center gap-3 border rounded-xl px-4 py-3 transition-all focus-within:border-[#0C81E4] focus-within:ring-2 focus-within:ring-[#0C81E4]/10"
              style={{ borderColor: "#e5e7eb" }}
            >
              <Mail size={16} className="text-gray-400 shrink-0" />
              <div className="w-px h-4 bg-gray-200 shrink-0" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                style={{ fontFamily: "var(--font-montserrat)" }}
              />
            </div>

            {/* Password */}
            <div
              className="flex items-center gap-3 border rounded-xl px-4 py-3 transition-all focus-within:border-[#0C81E4] focus-within:ring-2 focus-within:ring-[#0C81E4]/10"
              style={{ borderColor: "#e5e7eb" }}
            >
              <Lock size={16} className="text-gray-400 shrink-0" />
              <div className="w-px h-4 bg-gray-200 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                style={{ fontFamily: "var(--font-montserrat)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-xs text-red-500"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                ⚠️ {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#0C81E4",
                fontFamily: "var(--font-montserrat)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Masuk...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>

        {/* ── Kanan: Gambar ── */}
        <div className="w-[460px] shrink-0 relative rounded-[20px] overflow-hidden m-4">
          {/* Background image — ganti src dengan foto gedung kamu */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80')",
            }}
          />

          {/* Overlay gradient bawah */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(12,78,140,0.85) 0%, rgba(12,78,140,0.2) 50%, transparent 100%)",
            }}
          />

          {/* Brand badge bawah */}
          <div className="absolute bottom-6 left-6 flex items-center gap-3">
            <Image
              src="/Logo Alpha.png"
              alt="Logo Alpha"
              width={44}
              height={44}
              className="object-contain rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", padding: "6px" }}
            />
            <div>
              <p
                className="text-white font-light text-base leading-snug"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Sistem Informasi Analisis
              </p>
              <p
                className="text-white/80 font-light text-base leading-snug"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Putusan Pajak
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}