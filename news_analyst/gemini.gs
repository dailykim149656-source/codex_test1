/**
 * AI Analysis Engine
 * Integrates Google Gemini and Anthropic Claude for robust analysis.
 * Primary: Google Gemini (2.x) - Optimized with JSON Mode & v1beta
 * Fallback: Anthropic Claude (3.5 Sonnet)
 */

// Models Configuration
// Note: Using 2.x models as logs confirmed 1.x are deprecated/unavailable in this environment.
var GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
];
var CLAUDE_MODEL = "claude-3-5-sonnet-20240620";

/**
 * Main Analysis Function
 * Tries Gemini first, then falls back to Claude if Gemini fails.
 */
function analyzeNews(articles, keywords) {
  var geminiKey =
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  var claudeKey =
    PropertiesService.getScriptProperties().getProperty("CLAUDE_API_KEY");

  if (!articles || articles.length === 0) {
    return {
      summary: "분석할 뉴스 기사를 찾지 못했습니다.",
      sentiment: "Neutral",
    };
  }

  var topArticles = articles.slice(0, 10);
  var prompt = constructPrompt(topArticles, keywords);

  // 1. Try Gemini Models
  if (geminiKey) {
    for (var i = 0; i < GEMINI_MODELS.length; i++) {
      var model = GEMINI_MODELS[i];
      try {
        console.log("Attempting analysis with Gemini: " + model);

        // Rate Limit Safeguard (Prevent 429)
        if (i > 0) Utilities.sleep(2000);

        // Use v1beta for advanced features like response_mime_type
        var responseText = callGeminiAPI(geminiKey, prompt, model, "v1beta");
        return parseAIResponse(responseText);
      } catch (e) {
        console.warn("Gemini (" + model + ") failed: " + e.toString());
      }
    }
  } else {
    console.warn("GEMINI_API_KEY is missing. Skipping Gemini.");
  }

  // 2. Fallback to Claude
  if (claudeKey) {
    try {
      console.log("Attempting analysis with Claude: " + CLAUDE_MODEL);
      var responseText = callClaudeAPI(claudeKey, prompt, CLAUDE_MODEL);
      return parseAIResponse(responseText);
    } catch (e) {
      console.error("Claude analysis failed: " + e.toString());
      throw new Error(
        "Both Gemini and Claude failed. Last error: " + e.message
      );
    }
  } else {
    console.warn(
      "CLAUDE_API_KEY is missing. Add it to Script Properties for fallback."
    );
  }

  throw new Error("All AI models failed or API keys are missing.");
}

/**
 * Constructs the prompt (Shared for both AIs).
 */
function constructPrompt(articles, keywords) {
  var articlesText = articles
    .map(function (a, i) {
      // Including link can help AI context, though usually description is enough
      return (
        i +
        1 +
        ". [" +
        a.source +
        "] " +
        a.title +
        " (" +
        a.pubDate +
        ")\n" +
        a.description
      );
    })
    .join("\n\n");

  var keywordStr =
    keywords && keywords.length > 0
      ? keywords.join(", ")
      : "General Market Trends";

  return (
    "You are a professional stock market analyst.\n" +
    "Analyze the following news articles focusing on these keywords: " +
    keywordStr +
    "\n\n" +
    "Articles:\n" +
    articlesText +
    "\n\n" +
    "Provide the output in valid JSON format with the following fields:\n" +
    "- market_summary: A brief summary of the market situation (max 3 sentences) in Korean.\n" +
    "- key_events: An array of strings highlighting key events in Korean.\n" +
    "- investment_insight: Actionable advice based on the news in Korean.\n" +
    "- sentiment: One of 'Bullish', 'Bearish', or 'Neutral'\n" +
    "Ensure all the text content is in Korean language suitable for a Korean investor."
  );
}

/**
 * Gemini API Call - Optimized for JSON
 */
function callGeminiAPI(apiKey, prompt, model, version) {
  var url =
    "https://generativelanguage.googleapis.com/" +
    version +
    "/models/" +
    model +
    ":generateContent?key=" +
    apiKey;

  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: "application/json", // Force strict JSON
    },
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  var content = response.getContentText();
  var json = JSON.parse(content);

  if (json.error) {
    throw new Error(json.error.message);
  }

  try {
    return json.candidates[0].content.parts[0].text;
  } catch (e) {
    throw new Error("Invalid response format from Gemini");
  }
}

/**
 * Claude API Call
 */
function callClaudeAPI(apiKey, prompt, model) {
  var url = "https://api.anthropic.com/v1/messages";

  var payload = {
    model: model,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  };

  var options = {
    method: "post",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  var content = response.getContentText();

  if (response.getResponseCode() !== 200) {
    throw new Error(
      "Claude API Error (" + response.getResponseCode() + "): " + content
    );
  }

  var json = JSON.parse(content);
  return json.content[0].text;
}

/**
 * Parses JSON response.
 * Simplified thanks to JSON enforcement.
 */
function parseAIResponse(text) {
  try {
    var cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parsing failed. Text: " + text);
    return {
      market_summary: "분석 결과를 파싱하는데 실패했습니다.",
      key_events: [],
      investment_insight: "다시 시도해 주세요. (Parsing Error)",
      sentiment: "Neutral",
    };
  }
}
