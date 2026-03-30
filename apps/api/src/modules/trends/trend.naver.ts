import {
  TREND_PAGE_SIZE,
  TREND_TOTAL_PAGES,
  serializeTrendFilter,
  type TrendAgeCode,
  type TrendCategoryNode,
  type TrendDeviceCode,
  type TrendGenderCode
} from "@runacademy/shared";
import { mergeKeywordRankPages, monthPeriodToDateRange, sleep, summarizeFailureSnippet, type NaverKeywordRankPage } from "./trend.utils";

const NAVER_BASE_URL = "https://datalab.naver.com";
const NAVER_CATEGORY_PAGE_URL = `${NAVER_BASE_URL}/shoppingInsight/sCategory.naver`;
const NAVER_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

type CookieJar = Map<string, string>;

interface RawCategoryNode {
  cid: number;
  name: string;
  fullPath: string;
  level: number;
  leaf: boolean;
}

interface RawCategoryResponse extends RawCategoryNode {
  childList: RawCategoryNode[];
}

export interface CollectMonthlyRanksInput {
  categoryCid: number;
  period: string;
  devices: TrendDeviceCode[];
  genders: TrendGenderCode[];
  ages: TrendAgeCode[];
}

export interface TrendSourceClient {
  fetchCategoryChildren(cid: number): Promise<TrendCategoryNode[]>;
  collectMonthlyRanks(input: CollectMonthlyRanksInput): Promise<NaverKeywordRankPage["ranks"]>;
}

export class TrendSourceError extends Error {
  constructor(
    message: string,
    readonly snippet?: string
  ) {
    super(message);
    this.name = "TrendSourceError";
  }
}

export class NaverTrendClient implements TrendSourceClient {
  async fetchCategoryChildren(cid: number) {
    const jar = await this.bootstrapSession();
    const payload = await this.requestJson<RawCategoryResponse>(jar, `/shoppingInsight/getCategory.naver?cid=${cid}`);
    return (payload.childList ?? []).map((node) => ({
      cid: node.cid,
      name: node.name,
      fullPath: node.fullPath,
      level: node.level,
      leaf: node.leaf
    }));
  }

  async collectMonthlyRanks(input: CollectMonthlyRanksInput) {
    const jar = await this.bootstrapSession();
    const { startDate, endDate } = monthPeriodToDateRange(input.period);
    const pages: NaverKeywordRankPage[] = [];

    for (let page = 1; page <= TREND_TOTAL_PAGES; page += 1) {
      const body = new URLSearchParams({
        cid: String(input.categoryCid),
        timeUnit: "month",
        startDate,
        endDate,
        page: String(page),
        count: String(TREND_PAGE_SIZE),
        device: serializeTrendFilter(input.devices),
        gender: serializeTrendFilter(input.genders),
        age: serializeTrendFilter(input.ages)
      });

      const payload = await this.requestJson<NaverKeywordRankPage>(jar, "/shoppingInsight/getCategoryKeywordRank.naver", {
        method: "POST",
        body
      });

      if (!Array.isArray(payload.ranks) || payload.ranks.length === 0) {
        throw new TrendSourceError(`No ranks were returned for ${input.period} page ${page}.`);
      }

      pages.push(payload);

      if (page < TREND_TOTAL_PAGES) {
        await sleep(140 + Math.round(Math.random() * 120));
      }
    }

    return mergeKeywordRankPages(pages);
  }

  private async bootstrapSession() {
    const jar: CookieJar = new Map();
    const response = await fetch(NAVER_CATEGORY_PAGE_URL, {
      headers: {
        "User-Agent": NAVER_BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!response.ok) {
      throw new TrendSourceError(`Failed to bootstrap Naver session: ${response.status}`);
    }

    this.storeResponseCookies(jar, response);
    return jar;
  }

  private async requestJson<T>(jar: CookieJar, pathname: string, init: { method?: "GET" | "POST"; body?: URLSearchParams } = {}) {
    const response = await fetch(`${NAVER_BASE_URL}${pathname}`, {
      method: init.method ?? "GET",
      headers: {
        "User-Agent": NAVER_BROWSER_USER_AGENT,
        Referer: NAVER_CATEGORY_PAGE_URL,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: this.cookieHeader(jar)
      },
      body: init.body?.toString()
    });

    this.storeResponseCookies(jar, response);
    const text = await response.text();

    if (!response.ok) {
      throw new TrendSourceError(`Naver request failed with status ${response.status}.`, summarizeFailureSnippet(text));
    }

    if (text.trim().startsWith("<!DOCTYPE html") || text.trim().startsWith("<html")) {
      throw new TrendSourceError("Naver returned an HTML error page.", summarizeFailureSnippet(text));
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new TrendSourceError("Naver returned invalid JSON.", summarizeFailureSnippet(text));
    }
  }

  private cookieHeader(jar: CookieJar) {
    return Array.from(jar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private storeResponseCookies(jar: CookieJar, response: Response) {
    extractSetCookieHeaders(response.headers).forEach((headerValue) => {
      const [pair] = headerValue.split(";");
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex < 1) {
        return;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (!name || !value) {
        return;
      }

      jar.set(name, value);
    });
  }
}

function extractSetCookieHeaders(headers: Headers) {
  const headerWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headerWithSetCookie.getSetCookie === "function") {
    return headerWithSetCookie.getSetCookie();
  }

  const merged = headers.get("set-cookie");
  if (!merged) {
    return [];
  }

  return merged.split(/,(?=[^;]+=[^;]+)/g);
}
