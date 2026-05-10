import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

type UserRow = {
  id: number;
  name: string;
  email: string;
  password: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Ingat Aku", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await query<UserRow>(
          "SELECT id, name, email, password FROM users WHERE email = $1",
          [credentials.email]
        );

        const user = result.rows[0];
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari (untuk "Ingat Aku")
  },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? false;
        // Tanpa "Ingat Aku": session expired dalam 8 jam
        if (!token.rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
};
