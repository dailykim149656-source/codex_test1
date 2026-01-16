"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type AnalysisResponse = {
  market_summary: string;
  key_events: string[];
  investment_insight: string;
  sentiment: "Bullish" | "Bearish" | "Neutral" | string;
  report_url?: string | null;
  error?: string;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [keywords, setKeywords] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"gemini" | "claude">("gemini");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      const data = (await response.json()) as AnalysisResponse;
      if (!response.ok) {
        throw new Error(data.error || "분석 요청에 실패했습니다.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류입니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 text-slate-800">
      <nav className="sticky top-0 z-50 border border-white/30 bg-white/70 px-6 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-xl font-bold text-slate-900">
              StockAI Analyst (KR)
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="hidden sm:block text-slate-500">
              상태:{" "}
              <span className="font-semibold text-slate-700">
                {status === "loading" && "확인 중..."}
                {status === "authenticated" && "로그인됨"}
                {status === "unauthenticated" && "로그인 필요"}
              </span>
            </div>
            <div className="text-slate-500">
              {status === "authenticated" ? session?.user?.email : "게스트"}
            </div>
            {status === "authenticated" ? (
              <button
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
                onClick={() => signOut()}
              >
                로그아웃
              </button>
            ) : (
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={() => signIn("google")}
              >
                Google 로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12">
        <section className="text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            오늘의 미국 주식 시장 분석
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            AI가 전하는 글로벌 증시 인사이트. 관심 키워드로 맞춤 분석을
            받아보세요.
          </p>

          <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg sm:flex-row sm:items-center">
            <input
              className="flex-1 rounded-lg bg-transparent px-4 py-3 text-slate-700 outline-none transition focus:bg-slate-50"
              type="text"
              placeholder="키워드 입력 (예: Tesla, AI, 반도체)"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
            />
            <button
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
              onClick={onAnalyze}
              disabled={loading || status !== "authenticated"}
            >
              {loading ? "분석 중..." : "분석하기"}
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            팁: 여러 키워드는 쉼표(,)로 구분하세요.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">분석 설정</h3>
            <p className="mt-1 text-sm text-slate-500">
              입력한 API Key는 요청 처리에만 사용되며 서버에 저장되지 않습니다.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                사용 API 선택
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as "gemini" | "claude")
                  }
                >
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm sm:col-span-2">
                API Key
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  type="password"
                  placeholder="API Key를 입력하세요"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </label>
            </div>
            {status !== "authenticated" && (
              <p className="mt-3 text-xs text-slate-500">
                분석을 실행하려면 Google 로그인이 필요합니다.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">최근 분석 기록</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center">
                아직 표시할 기록이 없습니다.
              </li>
            </ul>
          </div>
        </section>

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </section>
        )}

        {result && (
          <section className="grid gap-6 lg:grid-cols-[1.6fr_0.4fr]">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <span className="rounded-md bg-blue-100 px-2 py-1 text-blue-600">
                    📝
                  </span>
                  시장 요약
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {result.sentiment}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {result.market_summary}
              </p>
              <h4 className="mt-6 text-sm font-semibold text-slate-900">
                주요 이벤트
              </h4>
              {result.key_events?.length ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                  {result.key_events.map((event) => (
                    <li key={event}>{event}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  주요 이벤트가 없습니다.
                </p>
              )}
              <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <span>💡</span> 투자 인사이트
                </h4>
                <p className="mt-2 text-sm text-amber-900/80">
                  {result.investment_insight}
                </p>
              </div>
              {result.report_url && (
                <div className="mt-6 flex justify-end">
                  <a
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                    href={result.report_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    전체 리포트 보기 <span>→</span>
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">
                인사이트 스냅샷
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                감정 지표:{" "}
                <span className="font-semibold text-slate-700">
                  {result.sentiment}
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-400">
                결과는 최신 기사 기준으로 자동 업데이트됩니다.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
