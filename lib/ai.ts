import type { Article } from "./rss";

type AnalysisResult = {
  market_summary: string;
  key_events: string[];
  investment_insight: string;
  sentiment: string;
};

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-exp"];
const CLAUDE_MODEL = "claude-3-5-sonnet-20240620";

export async function analyzeNews(
  articles: Article[],
  keywords: string[],
  provider: "gemini" | "claude",
  apiKey: string
): Promise<AnalysisResult> {
  if (!articles.length) {
    return {
      market_summary: "분석할 뉴스 기사를 찾지 못했습니다.",
      key_events: [],
      investment_insight: "추가 기사를 수집한 후 다시 시도해주세요.",
      sentiment: "Neutral",
    };
  }

  const topArticles = articles.slice(0, 10);
  const prompt = constructPrompt(topArticles, keywords);

  if (provider === "gemini") {
    const responseText = await callGeminiAPI(apiKey, prompt, GEMINI_MODELS[0], "v1beta");
    return parseAIResponse(responseText);
  }

  const responseText = await callClaudeAPI(apiKey, prompt, CLAUDE_MODEL);
  return parseAIResponse(responseText);
}

function constructPrompt(articles: Article[], keywords: string[]) {
  const articlesText = articles
    .map(
      (article, index) =>
        `${index + 1}. [${article.source}] ${article.title} (${article.pubDate})\n${
          article.description
        }`
    )
    .join("\n\n");

  const keywordStr = keywords.length ? keywords.join(", ") : "General Market Trends";

  return (
    "You are a professional stock market analyst.\n" +
    `Analyze the following news articles focusing on these keywords: ${keywordStr}\n\n` +
    `Articles:\n${articlesText}\n\n` +
    "Provide the output in valid JSON format with the following fields:\n" +
    "- market_summary: A brief summary of the market situation (max 3 sentences) in Korean.\n" +
    "- key_events: An array of strings highlighting key events in Korean.\n" +
    "- investment_insight: Actionable advice based on the news in Korean.\n" +
    "- sentiment: One of 'Bullish', 'Bearish', or 'Neutral'\n" +
    "Ensure all the text content is in Korean language suitable for a Korean investor."
  );
}

async function callGeminiAPI(apiKey: string, prompt: string, model: string, version: string) {
  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || "Gemini API 요청이 실패했습니다.");
  }

  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callClaudeAPI(apiKey: string, prompt: string, model: string) {
  const url = "https://api.anthropic.com/v1/messages";

  const payload = {
    model,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "Claude API 요청이 실패했습니다.");
  }

  return json?.content?.[0]?.text ?? "";
}

function parseAIResponse(text: string): AnalysisResult {
  try {
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return {
      market_summary: "분석 결과를 파싱하는데 실패했습니다.",
      key_events: [],
      investment_insight: "다시 시도해 주세요. (Parsing Error)",
      sentiment: "Neutral",
    };
  }
}
