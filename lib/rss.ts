import { XMLParser } from "fast-xml-parser";

export type Article = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  score?: number;
  isBreaking?: boolean;
};

const RSS_FEEDS = [
  "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
  "https://finance.yahoo.com/news/rssindex",
  "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
  "https://www.ft.com/news-feed?format=rss",
  "https://feeds.a.dj.com/rss/WSJBusiness.xml",
  "https://www.marketwatch.com/rss/topstories",
  "https://techcrunch.com/feed/",
  "https://www.theverge.com/rss/index.xml",
  "https://feeds.feedburner.com/wired/index",
  "https://www.zdnet.com/news/rss.xml",
  "https://arstechnica.com/feed/",
  "https://cointelegraph.com/rss",
  "https://www.hankyung.com/feed/all-news",
  "https://www.hankyung.com/feed/economy",
  "https://www.mk.co.kr/rss/30100041/",
  "https://www.yonhapnewseconomytv.com/rss/allArticle.xml",
  "https://fs.jtbc.co.kr/RSS/newsflash.xml",
  "https://news.sbs.co.kr/news/newsflashRssFeed.do",
  "https://rss.etnews.com/Section_001.xml",
  "https://zdnet.co.kr/rss/all.xml",
  "https://www.digitaltoday.co.kr/rss/allArticle.xml",
  "https://www.korea.kr/rss/policy.xml",
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  ignoreDeclaration: true,
  ignorePiTags: true,
  removeNSPrefix: true,
  trimValues: true,
});

export async function collectNewsFromRSS() {
  const fetches = await Promise.all(
    RSS_FEEDS.map(async (feedUrl) => {
      try {
        return await fetchAndParseRSS(feedUrl);
      } catch {
        return [];
      }
    })
  );

  const allArticles = fetches.flat();
  if (allArticles.length === 0) return [];

  const uniqueArticles = deduplicateArticles(allArticles);
  const scoredArticles = scoreArticles(uniqueArticles);
  const trends = identifyHotTopics(scoredArticles);

  scoredArticles.forEach((article) => {
    const title = article.title.toLowerCase();
    trends.forEach((trend) => {
      if (title.includes(trend.word)) {
        article.score = (article.score ?? 0) + trend.count * 0.5;
      }
    });
  });

  scoredArticles.sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (Math.abs(scoreDiff) > 1) return scoreDiff;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  return scoredArticles;
}

function scoreArticles(articles: Article[]) {
  const now = Date.now();
  return articles.map((article) => {
    let score = 0;
    const title = article.title;

    if (/\[속보\]|\[단독\]|\[Breaking\]|\[Exclusive\]|URGENT|BREAKING/i.test(title)) {
      score += 10;
      article.isBreaking = true;
    }

    const pubTime = new Date(article.pubDate).getTime();
    if (!Number.isNaN(pubTime)) {
      const hoursOld = (now - pubTime) / (1000 * 60 * 60);
      score += Math.max(0, 10 - hoursOld);
    }

    article.score = score;
    return article;
  });
}

function identifyHotTopics(articles: Article[]) {
  const wordCounts: Record<string, number> = {};
  const stopWords = [
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
    "new",
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
  ];

  articles.forEach((article) => {
    const words = article.title
      .toLowerCase()
      .replace(/[^\w가-힣]/g, " ")
      .split(/\s+/);

    words.forEach((word) => {
      if (word.length > 1 && !stopWords.includes(word) && !/^\d+$/.test(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .filter((item) => item.count >= 2)
    .slice(0, 10);
}

function deduplicateArticles(articles: Article[]) {
  const seen = new Set<string>();
  const result: Article[] = [];

  for (const article of articles) {
    const cleanTitle = article.title.trim();
    if (seen.has(article.link) || seen.has(cleanTitle)) {
      continue;
    }
    seen.add(article.link);
    seen.add(cleanTitle);
    result.push(article);
  }

  return result;
}

async function fetchAndParseRSS(url: string): Promise<Article[]> {
  if (!RSS_FEEDS.includes(url)) {
    return [];
  }
  const response = await fetch(url, {
    headers: {
      "User-Agent": "RSSInsightBot/1.0",
      Accept: "application/rss+xml, application/xml",
    },
    cache: "no-store",
  });

  if (!response.ok) return [];
  const xml = await response.text();
  if (!xml.trim().startsWith("<")) return [];

  const data = parser.parse(xml);
  const channel = data?.rss?.channel ?? data?.channel;
  if (!channel) return [];

  const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
  return items
    .map((item: Record<string, string>) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate ?? item.published ?? "",
      description: cleanHtml(item.description ?? item.summary ?? ""),
      source: url,
    }))
    .filter((item: Article) => item.title && item.link);
}

function cleanHtml(html: string) {
  return html.replace(/<[^>]*>?/gm, "").trim();
}
