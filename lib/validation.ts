import { AppError } from "./errors";

export type AnalyzePayload = {
  keywords: string[];
  provider: "gemini" | "claude" | "solar-pro-2";
  apiKey: string;
};

const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 40;
const MAX_API_KEY_LENGTH = 200;

export async function parseAnalyzeRequest(
  request: Request
): Promise<AnalyzePayload> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "body" },
    });
  }

  if (!body || typeof body !== "object") {
    throw new AppError("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "body" },
    });
  }

  const { keywords, provider, apiKey } = body as Record<string, unknown>;
  const cleanedKeywords = Array.isArray(keywords)
    ? keywords
        .filter((keyword) => typeof keyword === "string")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, MAX_KEYWORDS)
    : [];

  if (cleanedKeywords.some((keyword) => keyword.length > MAX_KEYWORD_LENGTH)) {
    throw new AppError("VALIDATION_ERROR", "키워드 길이가 너무 깁니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "keywords" },
    });
  }

  if (provider !== "gemini" && provider !== "claude" && provider !== "solar-pro-2") {
    throw new AppError("VALIDATION_ERROR", "지원하지 않는 공급자입니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "provider" },
    });
  }

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "API Key가 필요합니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "apiKey" },
    });
  }

  if (apiKey.length > MAX_API_KEY_LENGTH) {
    throw new AppError("VALIDATION_ERROR", "API Key 길이가 너무 깁니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "apiKey" },
    });
  }

  return {
    keywords: cleanedKeywords,
    provider,
    apiKey: apiKey.trim(),
  };
}

export function parseLimitParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError("VALIDATION_ERROR", "limit 값이 올바르지 않습니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "limit" },
    });
  }

  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}
