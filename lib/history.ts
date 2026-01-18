import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type AnalysisHistoryItem = {
  id: string;
  email: string;
  tenantId: string;
  createdAt: string;
  keywords: string[];
  provider: "gemini" | "claude";
  sentiment: string;
  market_summary: string;
};

type HistoryStore = {
  version: 2;
  tenants: Record<string, Record<string, AnalysisHistoryItem[]>>;
};

const HISTORY_DIR = path.join(process.cwd(), ".data");
const HISTORY_FILE = path.join(HISTORY_DIR, "analysis-history.json");
const MAX_HISTORY_PER_USER = 10;

async function loadStore(): Promise<HistoryStore> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<HistoryStore> & {
      users?: Record<string, AnalysisHistoryItem[]>;
    };
    if (!parsed || typeof parsed !== "object") {
      return { version: 2, tenants: {} };
    }
    if (parsed.tenants) {
      return { version: 2, tenants: parsed.tenants };
    }
    if (parsed.users) {
      return { version: 2, tenants: { default: parsed.users } };
    }
    return { version: 2, tenants: {} };
  } catch {
    return { version: 2, tenants: {} };
  }
}

async function saveStore(store: HistoryStore) {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function addHistoryEntry(input: {
  email: string;
  tenantId: string;
  keywords: string[];
  provider: "gemini" | "claude";
  sentiment: string;
  market_summary: string;
}) {
  const store = await loadStore();
  const entry: AnalysisHistoryItem = {
    id: randomUUID(),
    email: input.email,
    tenantId: input.tenantId,
    createdAt: new Date().toISOString(),
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    provider: input.provider,
    sentiment: input.sentiment,
    market_summary: input.market_summary,
  };

  const tenantBucket = store.tenants[input.tenantId] ?? {};
  const existing = tenantBucket[input.email] ?? [];
  tenantBucket[input.email] = [entry, ...existing].slice(0, MAX_HISTORY_PER_USER);
  store.tenants[input.tenantId] = tenantBucket;
  await saveStore(store);

  return entry;
}

export async function getHistory(
  tenantId: string,
  email: string,
  limit = MAX_HISTORY_PER_USER
) {
  const store = await loadStore();
  const items = store.tenants[tenantId]?.[email] ?? [];
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : MAX_HISTORY_PER_USER;

  return items.slice(0, safeLimit);
}
