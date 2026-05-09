"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, AlertCircle } from "lucide-react";

const loginImage =
  "https://images.unsplash.com/photo-1724985284026-dd2451e4857a?q=80&w=2072&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      rememberMe: String(rememberMe),
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email atau password salah.");
    } else {
      // Kalau ingat aku dicheck, simpan di localStorage agar persistent
      if (rememberMe) {
        localStorage.setItem("remember-me", "true");
      } else {
        localStorage.removeItem("remember-me");
      }
      // Set session active flag di localStorage supaya shared across tabs
      localStorage.setItem("session-active", "true");
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F9F9F9" }}>
      {/* Left — Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          {/* Header */}
          <div>
            <h1
              className="text-3xl text-gray-900"
              style={{ fontFamily: "var(--font-coolvetica)" }}
            >
              Masuk
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Silakan login untuk melanjutkan ke dashboard.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 pt-6 pb-2">
              <p className="text-base font-semibold text-gray-800">Akun Anda</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Gunakan email dan password yang terdaftar.
              </p>
            </div>

            <div className="px-6 pb-6 pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0C81E4] focus:ring-1 focus:ring-[#0C81E4] transition-all"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0C81E4] focus:ring-1 focus:ring-[#0C81E4] transition-all"
                  />
                </div>

                {/* Remember Me */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: rememberMe ? "#0C81E4" : "white",
                        borderColor: rememberMe ? "#0C81E4" : "#D1D5DB",
                      }}
                    >
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                    Ingat Aku
                  </span>
                </label>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 hover:brightness-110"
                  style={{ backgroundColor: "#0C81E4" }}
                >
                  {loading ? "Memproses..." : "Login"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Image panel */}
      <div className="relative hidden lg:flex flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={loginImage}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #0C4E8C 0%, #0C4E8Ccc 35%, #0C4E8C55 65%, transparent 100%)",
          }}
        />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-2">
              <Image
                src="/Logo_Alpha.svg"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <p
                className="text-2xl"
                style={{ fontFamily: "var(--font-coolvetica)" }}
              >
                Sistem Analisis Putusan Pajak
              </p>
              <p className="text-sm text-white/80 mt-0.5">
                Analisis cerdas putusan perpajakan Indonesia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
