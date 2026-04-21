"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Cek saat browser dibuka kembali:
 * - Kalau user login tanpa "Ingat Aku", sessionStorage diberi flag "session-keep-alive"
 * - SessionStorage otomatis hilang saat semua tab browser ditutup
 * - Kalau flag tidak ada tapi session JWT masih valid → berarti browser pernah ditutup
 *   tanpa remember me → paksa sign out
 */
export default function SessionGuard() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const keepAlive = sessionStorage.getItem("session-keep-alive");
    const remembered = localStorage.getItem("remember-me");

    // Kalau tidak ada flag sama sekali (bukan sesi ini & bukan remember me) → sign out
    if (!keepAlive && remembered !== "true") {
      signOut({ callbackUrl: "/login" });
    }
  }, [status]);

  return null;
}
