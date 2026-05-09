"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Session guard - maintain session flags across tabs
 * JWT validity & expiry di-handle oleh NextAuth & middleware
 */
export default function SessionGuard() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    // Maintain session-active flag saat authenticated
    // Ini memastikan flag ada di localStorage untuk semua tab
    localStorage.setItem("session-active", "true");
  }, [status]);

  return null;
}
