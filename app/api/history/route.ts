import { getHistory } from "@/lib/history";
import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { parseLimitParam } from "@/lib/validation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApi(request, async (context) => {
    const user = await requireUser();
    context.setActor({
      user: user.email,
      tenant: user.tenantId,
      role: user.role,
    });
    context.applyRateLimit(
      `history:${user.tenantId}:${user.email}:${context.ip}`,
      { windowMs: 60_000, max: 30 }
    );
    context.setAudit({
      action: "history:list",
      metadata: {},
    });
    const url = new URL(request.url);
    const limit = parseLimitParam(url.searchParams.get("limit"));
    context.setAudit({
      action: "history:list",
      metadata: { limit: limit ?? 10 },
    });
    const items = await getHistory(user.tenantId, user.email, limit);
    const safeItems = items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      keywords: item.keywords,
      provider: item.provider,
      sentiment: item.sentiment,
      market_summary: item.market_summary,
    }));

    return NextResponse.json({ items: safeItems });
  });
}
