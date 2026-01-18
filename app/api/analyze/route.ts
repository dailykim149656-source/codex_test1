import { collectNewsFromRSS } from "@/lib/rss";
import { analyzeNews } from "@/lib/ai";
import { addHistoryEntry } from "@/lib/history";
import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { parseAnalyzeRequest } from "@/lib/validation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApi(request, async (context) => {
    const user = await requireUser();
    context.setActor({
      user: user.email,
      tenant: user.tenantId,
      role: user.role,
    });
    context.applyRateLimit(
      `analyze:${user.tenantId}:${user.email}:${context.ip}`,
      { windowMs: 60_000, max: 10 }
    );
    context.setAudit({
      action: "analyze",
      metadata: {},
    });
    const payload = await parseAnalyzeRequest(request);
    context.setAudit({
      action: "analyze",
      metadata: {
        provider: payload.provider,
        keywordCount: payload.keywords.length,
      },
    });

    const articles = await collectNewsFromRSS();
    const analysis = await analyzeNews(
      articles,
      payload.keywords,
      payload.provider,
      payload.apiKey
    );

    await addHistoryEntry({
      email: user.email,
      tenantId: user.tenantId,
      keywords: payload.keywords,
      provider: payload.provider,
      sentiment: analysis.sentiment,
      market_summary: analysis.market_summary,
    });

    return NextResponse.json({
      ...analysis,
      report_url: null,
    });
  });
}
