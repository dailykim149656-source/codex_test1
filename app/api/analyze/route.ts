import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { collectNewsFromRSS } from "@/lib/rss";
import { analyzeNews } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: {
    keywords?: string[];
    provider?: "gemini" | "claude";
    apiKey?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { keywords = [], provider = "gemini", apiKey } = body;

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "API Key가 필요합니다." }, { status: 400 });
  }

  try {
    const articles = await collectNewsFromRSS();
    const analysis = await analyzeNews(articles, keywords, provider, apiKey);

    return NextResponse.json({
      ...analysis,
      report_url: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
