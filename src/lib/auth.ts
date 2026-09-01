import "@/lib/ensure-auth-url";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { isEmploymentEnded } from "@/lib/employees/status";
import { canAccessCompany } from "@/lib/tenancy/workspace";
import { ensureAuthUrlEnv } from "@/lib/app-url";
import { nextAuthSecret } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      /** Active workspace — APIs filter on this. */
      companyId: string;
      /** Login home; never changes on switch. */
      homeCompanyId: string;
      employeeId?: string | null;
    };
  }

  interface User {
    role: UserRole;
    companyId: string;
    homeCompanyId: string;
    employeeId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    companyId: string;
    homeCompanyId: string;
    employeeId?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  // Getter so the secret is read per request, after Vercel runtime env is present.
  // A one-shot `secret: nextAuthSecret()` is empty if the module loaded at build.
  get secret() {
    ensureAuthUrlEnv();
    return nextAuthSecret();
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) return null;

        if (user.role === "EMPLOYEE") {
          if (!user.employeeId) return null;
          const employee = await prisma.employee.findFirst({
            where: { id: user.employeeId, companyId: user.companyId },
            select: { status: true, employmentType: true },
          });
          if (!employee || isEmploymentEnded(employee.status)) return null;
          if (employee.employmentType === "CONTRACT") return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          homeCompanyId: user.companyId,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.homeCompanyId = user.homeCompanyId ?? user.companyId;
        token.companyId = user.companyId;
        token.employeeId = user.employeeId;
      }
      if (trigger === "update" && session && typeof session === "object") {
        const activeCompanyId =
          "activeCompanyId" in session
            ? (session as { activeCompanyId?: string }).activeCompanyId
            : undefined;
        if (
          activeCompanyId &&
          token.homeCompanyId &&
          token.role &&
          (await canAccessCompany(
            token.homeCompanyId,
            token.role,
            activeCompanyId
          ))
        ) {
          token.companyId = activeCompanyId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.homeCompanyId = token.homeCompanyId ?? token.companyId;
        session.user.employeeId = token.employeeId;
      }
      return session;
    },
  },
};
