import { AppError } from "./errors";

const REQUIRED_IN_PROD = ["NEXTAUTH_SECRET", "NEXTAUTH_URL"];

export function assertServerConfig() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = REQUIRED_IN_PROD.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new AppError("INTERNAL_ERROR", "서버 설정 오류입니다.", {
      status: 500,
    });
  }
}
