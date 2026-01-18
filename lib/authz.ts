import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { AppError } from "./errors";

type UserRole = "admin" | "user";

type UserContext = {
  email: string;
  role: UserRole;
  tenantId: string;
};

function parseCsv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedDomains() {
  return parseCsv(process.env.ALLOWED_EMAIL_DOMAINS);
}

function getAdminEmails() {
  return parseCsv(process.env.ADMIN_EMAILS);
}

export function resolveTenantId(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ?? process.env.DEFAULT_TENANT_ID ?? "default";
}

export function resolveRole(email: string): UserRole {
  const admins = getAdminEmails();
  if (admins.includes(email.toLowerCase())) {
    return "admin";
  }
  return "user";
}

export function ensureAllowedDomain(email: string) {
  const allowedDomains = getAllowedDomains();
  if (allowedDomains.length === 0) {
    return;
  }

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || !allowedDomains.includes(domain)) {
    throw new AppError("FORBIDDEN", "허용되지 않은 계정입니다.", {
      status: 403,
    });
  }
}

export async function requireUser(): Promise<UserContext> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    throw new AppError("AUTH_REQUIRED", "로그인이 필요합니다.", {
      status: 401,
    });
  }

  ensureAllowedDomain(email);
  const tenantId = resolveTenantId(email);
  const role = resolveRole(email);

  return {
    email,
    role,
    tenantId,
  };
}

export function requireRole(user: UserContext, required: UserRole) {
  if (required === "admin" && user.role !== "admin") {
    throw new AppError("FORBIDDEN", "권한이 없습니다.", {
      status: 403,
    });
  }
}

export type { UserContext, UserRole };
