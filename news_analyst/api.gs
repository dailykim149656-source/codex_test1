/**
 * API Handlers
 * Backend logic called by frontend via google.script.run
 */

function executeAnalysisWrapper(keywordString) {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) throw new Error("Please log in to Google.");

    // Check credits
    if (!hasCredits(email)) {
      return {
        error: "Insufficient credits. Please upgrade or wait for daily reset.",
      };
    }

    // Parse keywords
    var keywords = keywordString
      ? keywordString.split(",").map(function (k) {
          return k.trim();
        })
      : [];

    // 1. Collect Data
    var articles = collectNewsFromRSS();

    // 2. Analyze
    // Tries Gemini first, then Claude
    var analysis = analyzeNews(articles, keywords);

    // 3. Generate Report
    var reportUrl = createDailyReport(analysis, email);

    // 3.5 Log Analysis History
    logAnalysisHistory(email, keywords, reportUrl);
    searchKeywordLog(email, keywords);
    reportInteractionLog(email, reportUrl);

    // 4. Deduct Credit
    consumeCredit(email);

    // Return combined result
    analysis.report_url = reportUrl;
    return analysis;
  } catch (e) {
    console.error("Analysis Failed", e);
    return { error: e.message };
  }
}

function getHistoryWrapper() {
  // Placeholder for history retrieval
  return [];
}

function getUserInfoWrapper() {
  var email = Session.getActiveUser().getEmail();
  return getUserInfo(email);
}
