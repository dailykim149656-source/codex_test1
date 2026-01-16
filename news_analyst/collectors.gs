/**
 * RSS Feed Collector
 * Collects news articles from configured RSS feeds.
 * NOW INCLUDES: Deduplication, Weighting, and Trend Clustering.
 */

// Configuration
var RSS_FEEDS = [
  // --- Finance (경제/금융) ---
  "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", // CNBC Markets
  "https://finance.yahoo.com/news/rssindex", // Yahoo Finance Top News
  "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", // Reuters Business (매우 신속)
  "https://www.ft.com/news-feed?format=rss", // Financial Times (심층 분석)
  "https://feeds.a.dj.com/rss/WSJBusiness.xml", // WSJ Business (미국 시장 핵심)
  "https://www.marketwatch.com/rss/topstories", // MarketWatch (실시간 시장 흐름)

  // --- Technology (기술/IT) ---
  "https://techcrunch.com/feed/", // TechCrunch (스타트업 및 하이테크)
  "https://www.theverge.com/rss/index.xml", // The Verge (소비자 가전 및 IT 트렌드)
  "https://feeds.feedburner.com/wired/index", // Wired (미래 기술 및 문화)
  "https://www.zdnet.com/news/rss.xml", // ZDNet (엔터프라이즈 기술/비즈니스 IT)
  "https://arstechnica.com/feed/", // Ars Technica (심도 있는 기술 분석)

  // --- Crypto/Emerging Tech (선택사항) ---
  "https://cointelegraph.com/rss", // Cointelegraph (가상자산 및 블록체인)

  // --- 국내 경제/종합 (Finance & General) ---
  "https://www.hankyung.com/feed/all-news", // 한국경제 (전체 뉴스)
  "https://www.hankyung.com/feed/economy", // 한국경제 (경제 섹션)
  "https://www.mk.co.kr/rss/30100041/", // 매일경제 (경제 전체)
  "https://www.yonhapnewseconomytv.com/rss/allArticle.xml", // 연합인포맥스 (금융/증권 특화)
  "https://fs.jtbc.co.kr/RSS/newsflash.xml", // JTBC (속보)
  "https://news.sbs.co.kr/news/newsflashRssFeed.do", // SBS (속보)

  // --- 국내 IT/기술 (Tech) ---
  "https://rss.etnews.com/Section_001.xml", // 전자신문 (IT 종합)
  "https://zdnet.co.kr/rss/all.xml", // ZDNet Korea (IT 비즈니스)
  "https://www.digitaltoday.co.kr/rss/allArticle.xml", // 디지털투데이 (모빌리티/핀테크)

  // --- 정부/정책 (Public Policy) ---
  "https://www.korea.kr/rss/policy.xml", // 대한민국 정책브리핑 (공신력 있는 정부 발표)
];

/**
 * Main function to collect news from all RSS feeds.
 * Now includes smart filtering to prioritize important news.
 * @returns {Array} Array of sorted, high-quality article objects
 */
function collectNewsFromRSS() {
  var allArticles = [];

  // 1. Fetch from all feeds
  RSS_FEEDS.forEach(function (feedUrl) {
    try {
      var articles = fetchAndParseRSS(feedUrl);
      allArticles = allArticles.concat(articles);
    } catch (e) {
      console.error("Error fetching feed: " + feedUrl, e);
    }
  });

  if (allArticles.length === 0) return [];

  // 2. Pre-processing: Deduplication & Scoring
  var uniqueArticles = deduplicateArticles(allArticles);
  var scoredArticles = scoreArticles(uniqueArticles);

  // 3. Trend Clustering (Identify Hot Topics)
  var trends = identifyHotTopics(scoredArticles);

  // 4. Boost score based on Trends
  scoredArticles.forEach(function (article) {
    var title = article.title.toLowerCase();
    trends.forEach(function (trend) {
      if (title.indexOf(trend.word) !== -1) {
        article.score += trend.count * 0.5; // Boost score by trend popularity
        // article.title += " [Trending: " + trend.word + "]"; // Optional: Tag title
      }
    });
  });

  // 5. Final Sort by Score (Desc) then Date (Desc)
  scoredArticles.sort(function (a, b) {
    if (Math.abs(b.score - a.score) > 1) {
      // If score difference is significant
      return b.score - a.score;
    }
    return new Date(b.pubDate) - new Date(a.pubDate);
  });

  return scoredArticles;
}

/**
 * Calculates an importance score for each article.
 */
function scoreArticles(articles) {
  var now = new Date().getTime();

  return articles.map(function (article) {
    var score = 0;
    var title = article.title;

    // A. Keyword Weights (Fast-tracking Breaking/Exclusive news)
    if (
      /\[속보\]|\[단독\]|\[Breaking\]|\[Exclusive\]|URGENT|BREAKING/i.test(
        title
      )
    ) {
      score += 10;
      article.isBreaking = true;
    }

    // B. Recency (Newer is better, but decays slowly)
    var pubTime = new Date(article.pubDate).getTime();
    if (!isNaN(pubTime)) {
      var hoursOld = (now - pubTime) / (1000 * 60 * 60);
      score += Math.max(0, 10 - hoursOld); // Up to 10 points for very recent news
    }

    article.score = score;
    return article;
  });
}

/**
 * Identify freqeuntly occurring words across titles to find "Issues".
 */
function identifyHotTopics(articles) {
  var wordCounts = {};
  var stopWords = [
    "the",
    "a",
    "in",
    "of",
    "to",
    "for",
    "on",
    "and",
    "at",
    "is",
    "with",
    "by",
    "up",
    "down",
    "new", // EN
    "뉴스",
    "종합",
    "특징주",
    "오전",
    "오후",
    "장마감",
    "코스피",
    "코스닥",
    "증시",
    "오늘",
    "속보",
  ]; // KR

  articles.forEach(function (article) {
    // 수정된 부분 (Line 141 근처)
    var words = article.title
      .toLowerCase()
      .replace(/[^\w가-힣]/g, " ")
      .split(/\s+/);

    words.forEach(function (w) {
      if (w.length > 1 && stopWords.indexOf(w) === -1 && !/^\d+$/.test(w)) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    });
  });

  // Convert to array and sort
  var sortedWords = Object.keys(wordCounts)
    .map(function (w) {
      return { word: w, count: wordCounts[w] };
    })
    .sort(function (a, b) {
      return b.count - a.count;
    });

  // Return top 10 trends that appear at least 3 times
  return sortedWords
    .filter(function (w) {
      return w.count >= 2;
    })
    .slice(0, 10);
}

/**
 * Removes duplicates based on identical links or very similar titles.
 */
function deduplicateArticles(articles) {
  var seen = {};
  var result = [];

  articles.forEach(function (article) {
    // 1. Check strict Link
    if (seen[article.link]) return;

    // 2. Check strict Title
    var cleanTitle = article.title.trim();
    if (seen[cleanTitle]) return;

    seen[article.link] = true;
    seen[cleanTitle] = true;
    result.push(article);
  });

  return result;
}

/**
 * Fetches and parses a single RSS feed.
 */
function fetchAndParseRSS(url) {
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return [];

    var xml = response.getContentText();
    // Simple check for valid XML
    if (xml.trim().indexOf("<") !== 0) return [];

    var document = XmlService.parse(xml);
    var root = document.getRootElement();
    var channel = root.getChild("channel");
    if (!channel) return [];

    var items = channel.getChildren("item");
    var newsItems = [];

    items.forEach(function (item) {
      var title = item.getChildText("title");
      var link = item.getChildText("link");
      var pubDate = item.getChildText("pubDate");
      var description = item.getChildText("description");

      if (title && link) {
        newsItems.push({
          title: title,
          link: link,
          pubDate: pubDate,
          description: cleanHtml(description),
          source: url,
        });
      }
    });

    return newsItems;
  } catch (parseErr) {
    console.warn("RSS Parse Fail for " + url + ": " + parseErr.message);
    return [];
  }
}

/**
 * Removes HTML tags from description.
 */
function cleanHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}
