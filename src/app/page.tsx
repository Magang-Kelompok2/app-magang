"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
