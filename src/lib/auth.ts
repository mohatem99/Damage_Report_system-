import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_URL } from "./api";
import type { Permission, User } from "./types";

/**
 * Server-side base URL for reaching the API. In Docker/behind a reverse proxy
 * the browser-facing API_URL (e.g. http://localhost) is not reachable from
 * inside the web container, so we call the API directly over the internal
 * network (e.g. http://api:4000). Falls back to API_URL for local dev.
 */
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || API_URL;

interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const res = await fetch(`${INTERNAL_API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        if (!res.ok) return null;

        const data = (await res.json()) as LoginResponse;
        // Whatever is returned here is stored in the NextAuth JWT (see callbacks).
        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          roleName: data.user.roleName,
          permissions: data.user.permissions,
          accessToken: data.accessToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roleName = token.roleName as string | null;
        session.user.permissions = (token.permissions as Permission[]) ?? [];
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};
