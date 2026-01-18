"use client";

import { useCallback, useEffect, useState } from "react";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import styles from "./page.module.css";

type AnalysisResponse = {
  market_summary: string;
  key_events: string[];
  investment_insight: string;
  sentiment: "Bullish" | "Bearish" | "Neutral" | string;
  report_url?: string | null;
};

type ApiError = {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  keywords: string[];
  provider: "gemini" | "claude" | "solar-pro-2";
  sentiment: string;
  market_summary: string;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [keywords, setKeywords] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"gemini" | "claude" | "solar-pro-2">("gemini");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isGoogleAuthEnabled, setIsGoogleAuthEnabled] = useState(
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"
  );

  useEffect(() => {
    let active = true;

    void getProviders()
      .then((providers) => {
        if (!active) {
          return;
        }
        setIsGoogleAuthEnabled(Boolean(providers?.google));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setIsGoogleAuthEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formatHistoryDate = (isoDate: string) => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return isoDate;
    }
    return parsed.toLocaleString("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const historyTitle = (keywordsList: string[]) =>
    keywordsList.length ? keywordsList.join(", ") : "전체 시장";
  const historyProviderLabel = (value: HistoryItem["provider"]) => {
    if (value === "gemini") {
      return "Gemini";
    }
    if (value === "claude") {
      return "Claude";
    }
    return "Solar Pro 2";
  };

  const fetchHistory = useCallback(async () => {
    if (status !== "authenticated") {
      setHistoryItems([]);
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/history");
      const data = (await response.json()) as
        | { items?: HistoryItem[] }
        | ApiError;
      if (!response.ok) {
        const errorMessage =
          "message" in data && data.message
            ? `${data.message} (요청 ID: ${data.requestId})`
            : "분석 기록을 불러오지 못했습니다.";
        throw new Error(errorMessage);
      }
      const items =
        "items" in data && Array.isArray(data.items) ? data.items : [];
      setHistoryItems(items);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "분석 기록을 불러오지 못했습니다."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const onAnalyze = async () => {
    setError(null);
    setResult(null);

    if (!apiKey.trim()) {
      setError("API Key를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keywords: keywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          provider,
          apiKey,
        }),
      });

      const data = (await response.json()) as AnalysisResponse | ApiError;
      if (!response.ok) {
        const errorMessage =
          "message" in data && data.message
            ? `${data.message} (요청 ID: ${data.requestId})`
            : "분석 요청에 실패했습니다.";
        throw new Error(errorMessage);
      }
      setResult(data as AnalysisResponse);
      void fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류입니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>📊</span>
            <h1 className={styles.brandTitle}>StockAI Analyst (KR)</h1>
          </div>
          <div className={styles.navMeta}>
            <div>
              상태:{" "}
              <strong>
                {status === "loading" && "확인 중..."}
                {status === "authenticated" && "로그인됨"}
                {status === "unauthenticated" && "로그인 필요"}
              </strong>
            </div>
            <div>
              {status === "authenticated" ? session?.user?.email : "게스트"}
            </div>
            {status === "authenticated" ? (
              <button
                className={styles.pillButton}
                onClick={() => signOut()}
              >
                로그아웃
              </button>
            ) : (
              <button
                className={`${styles.pillButton} ${styles.primaryButton}`}
                onClick={() => signIn("google")}
                disabled={!isGoogleAuthEnabled}
              >
                Google 로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h2 className={styles.heroTitle}>오늘의 미국 주식 시장 분석</h2>
          <p className={styles.heroSubtitle}>
            AI가 전하는 글로벌 증시 인사이트. 관심 키워드로 맞춤 분석을
            받아보세요.
          </p>

          <div className={styles.searchCard}>
            <div className={styles.searchRow}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="키워드 입력 (예: Tesla, AI, 반도체)"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
              />
              <button
                className={styles.searchButton}
                onClick={onAnalyze}
                disabled={loading || status !== "authenticated"}
              >
                {loading ? "분석 중..." : "분석하기"}
                {loading && <span className={styles.spinner} />}
              </button>
            </div>
            <p className={styles.helperText}>
              팁: 여러 키워드는 쉼표(,)로 구분하세요.
            </p>
          </div>
        </section>

        {!isGoogleAuthEnabled && (
          <section className={styles.warning}>
            Google OAuth 설정이 아직 완료되지 않았습니다. Vercel 환경 변수에
            `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`,
            `NEXTAUTH_URL`을 등록한 뒤 다시 시도해주세요.
          </section>
        )}

        <section className={`${styles.grid} ${styles.twoColumn}`}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>분석 설정</h3>
            <p className={styles.cardDescription}>
              입력한 API Key는 요청 처리에만 사용되며 서버에 저장되지 않습니다.
            </p>
            <div className={styles.settingsGrid}>
              <label className={styles.field}>
                사용 API 선택
                <select
                  className={styles.select}
                  value={provider}
                  onChange={(event) =>
                    setProvider(
                      event.target.value as "gemini" | "claude" | "solar-pro-2"
                    )
                  }
                >
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude</option>
                  <option value="solar-pro-2">Solar Pro 2</option>
                </select>
              </label>
              <label className={styles.field}>
                API Key
                <input
                  className={styles.input}
                  type="password"
                  placeholder="API Key를 입력하세요"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </label>
              {status !== "authenticated" && (
                <p className={styles.mutedText}>
                  분석을 실행하려면 Google 로그인이 필요합니다.
                </p>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>최근 분석 기록</h3>
            <ul className={styles.historyList}>
              {historyLoading && (
                <li className={styles.emptyState}>
                  기록을 불러오는 중입니다.
                </li>
              )}
              {!historyLoading && historyItems.length === 0 && (
                <li className={styles.emptyState}>
                  {status === "authenticated"
                    ? "아직 표시할 기록이 없습니다."
                    : "로그인 후 기록을 확인할 수 있습니다."}
                </li>
              )}
              {!historyLoading &&
                historyItems.map((item) => (
                  <li key={item.id} className={styles.historyItem}>
                    <div className={styles.historyHeader}>
                      <span className={styles.historyTitle}>
                        {historyTitle(item.keywords)}
                      </span>
                      <span className={styles.historyBadge}>
                        {item.sentiment}
                      </span>
                    </div>
                    <div className={styles.historyMeta}>
                      <span>{formatHistoryDate(item.createdAt)}</span>
                      <span>{historyProviderLabel(item.provider)}</span>
                    </div>
                    <p className={styles.historySummary}>
                      {item.market_summary}
                    </p>
                  </li>
                ))}
            </ul>
            {historyError && (
              <p className={styles.historyError}>{historyError}</p>
            )}
          </div>
        </section>

        {error && <section className={styles.error}>{error}</section>}

        {result && (
          <section className={`${styles.grid} ${styles.resultGrid}`}>
            <div className={styles.card}>
              <div className={styles.resultHeader}>
                <h3 className={styles.cardTitle}>📝 시장 요약</h3>
                <span className={styles.badge}>{result.sentiment}</span>
              </div>
              <p className={styles.summaryText}>{result.market_summary}</p>
              <h4 className={styles.cardTitle}>주요 이벤트</h4>
              {result.key_events?.length ? (
                <ul className={styles.eventsList}>
                  {result.key_events.map((event) => (
                    <li key={event}>{event}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.mutedText}>주요 이벤트가 없습니다.</p>
              )}
              <div className={styles.insightBox}>
                <strong>💡 투자 인사이트</strong>
                <p>{result.investment_insight}</p>
              </div>
              {result.report_url && (
                <a
                  className={styles.reportLink}
                  href={result.report_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  전체 리포트 보기 →
                </a>
              )}
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>인사이트 스냅샷</h3>
              <p className={styles.snapshotText}>
                감정 지표: <strong>{result.sentiment}</strong>
              </p>
              <p className={styles.helperText}>
                결과는 최신 기사 기준으로 자동 업데이트됩니다.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
