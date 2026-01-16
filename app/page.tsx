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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">RSS 인사이트 대시보드</h1>
        <p className="text-sm text-slate-600">
          입력한 API Key는 요청 처리에만 사용되며 서버에 저장되지 않습니다.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">로그인 상태</p>
            <p className="font-medium">
              {status === "loading" && "확인 중..."}
              {status === "authenticated" && session?.user?.email}
              {status === "unauthenticated" && "로그인이 필요합니다"}
            </p>
          </div>
          {status === "authenticated" ?
            (
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                onClick={() => signOut()}
              >
                로그아웃
              </button>
            ) : (
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() => signIn("google")}
              >
                Google 로그인
              </button>
            )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">분석 설정</h2>
        <div className="mt-4 grid gap-4">
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
          <label className="grid gap-2 text-sm">
            API Key
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              type="password"
              placeholder="API Key를 입력하세요"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            키워드
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              type="text"
              placeholder="예: Tesla, AI, 반도체"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
            />
          </label>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={onAnalyze}
            disabled={loading || status !== "authenticated"}
          >
            {loading ? "분석 중..." : "분석하기"}
          </button>
          {status !== "authenticated" && (
            <p className="text-xs text-slate-500">
              분석을 실행하려면 Google 로그인이 필요합니다.
            </p>
          )}
        </div>
      </section>

      {error && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      )}

      {result && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">분석 결과</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
              {result.sentiment}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-700">{result.market_summary}</p>
          {result.key_events?.length ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {result.key_events.map((event) => (
                <li key={event}>{event}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
            {result.investment_insight}
          </div>
        </section>
      )}
    </main>
  );
}
