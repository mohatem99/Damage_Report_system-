import type { Permission } from "@/lib/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      roleName: string | null;
      permissions: Permission[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    roleName: string | null;
    permissions: Permission[];
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleName: string | null;
    permissions: Permission[];
    accessToken: string;
  }
}
