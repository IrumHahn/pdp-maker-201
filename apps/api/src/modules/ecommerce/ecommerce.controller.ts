import { Body, Controller, Post } from "@nestjs/common";

type SourcePlatform = "coupang" | "smartstore" | "other";
type CollectionMode = "direct_fetch" | "provided_snapshot";

interface AnalyzeProductRequest {
  url: string;
  pageSnapshotText?: string;
  reviewSnapshotText?: string;
}

interface AgentReportSection {
  score: number;
  diagnosis: string;
  strengths: string[];
  risks: string[];
  actionItems: string[];
}

interface CollectionInfo {
  requestedUrl: string;
  sourcePlatform: SourcePlatform;
  mode: CollectionMode;
  directFetchSuccess: boolean;
  blockedRisk: boolean;
  needsSnapshot: boolean;
  notes: string[];
}

interface ExtractedSignals {
  name: string;
  description: string;
  brand?: string;
  priceKrw?: number;
  ratingValue?: number;
  reviewCount?: number;
  imageCount: number;
  detailTextLength: number;
  positiveReviewSignals: number;
  negativeReviewSignals: number;
  promotionSignals: string[];
  rawText: string;
  category: string;
  hasStructuredProductData: boolean;
}

interface ScoreStatus {
  label: string;
  color: string;
  interpretation: string;
}

const BLOCK_SENSITIVE_HOSTS = ["coupang.com", "smartstore.naver.com", "brand.naver.com"];

const PROMOTION_KEYWORDS = [
  "무료배송",
  "당일배송",
  "할인",
  "특가",
  "정품",
  "공식",
  "보장",
  "1+1",
  "사은품",
  "교환",
  "환불"
];

const REVIEW_POSITIVE_KEYWORDS = [
  "만족",
  "재구매",
  "좋아요",
  "추천",
  "가성비",
  "빠른배송",
  "튼튼",
  "편리",
  "효과"
];

const REVIEW_NEGATIVE_KEYWORDS = ["불량", "파손", "별로", "환불", "느림", "실망", "불만", "냄새", "미흡"];

const CATEGORY_RULES: Array<{ category: string; keywords: string[]; benchmarkRange: [number, number] }> = [
  {
    category: "뷰티/스킨케어",
    keywords: ["세럼", "토너", "크림", "선크림", "마스크팩"],
    benchmarkRange: [15000, 45000]
  },
  {
    category: "식품/건강식품",
    keywords: ["프로틴", "유산균", "비타민", "홍삼", "간식"],
    benchmarkRange: [12000, 39000]
  },
  {
    category: "생활/주방",
    keywords: ["세제", "주방", "수세미", "텀블러", "청소"],
    benchmarkRange: [8000, 32000]
  },
  {
    category: "디지털/가전",
    keywords: ["이어폰", "충전기", "키보드", "마우스", "블루투스"],
    benchmarkRange: [25000, 89000]
  },
  {
    category: "패션/잡화",
    keywords: ["티셔츠", "셔츠", "슬랙스", "운동화", "가방"],
    benchmarkRange: [19000, 69000]
  }
];

@Controller("ecommerce")
export class EcommerceController {
  @Post("analyze")
  async analyzeProduct(@Body() body: AnalyzeProductRequest) {
    const targetUrl = normalizeWhitespace(body.url);
    if (!targetUrl) {
      return {
        ok: false,
        code: "INVALID_URL",
        message: "url 값이 필요합니다."
      };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      return {
        ok: false,
        code: "INVALID_URL",
        message: "http(s) URL 형식이 아닙니다."
      };
    }

    const sourcePlatform = detectSourcePlatform(parsedUrl.hostname);
    const blockedRisk = isBlockedSensitiveHost(parsedUrl.hostname);

    const snapshotText = normalizeWhitespace(body.pageSnapshotText);
    const snapshotReviewText = normalizeWhitespace(body.reviewSnapshotText);

    let html = "";
    let directFetchSuccess = false;
    const notes: string[] = [];

    if (!snapshotText) {
      const directFetch = await fetchHtml(targetUrl);
      if (directFetch.ok) {
        html = directFetch.html;
        directFetchSuccess = true;
      } else {
        notes.push(`직접 수집 실패: ${directFetch.reason}`);
      }
    } else {
      notes.push("사용자 제공 스냅샷 텍스트로 분석함");
    }

    if (!snapshotText && !directFetchSuccess && blockedRisk) {
      return {
        ok: false,
        code: "COLLECTION_BLOCKED",
        collection: {
          requestedUrl: targetUrl,
          sourcePlatform,
          mode: "direct_fetch",
          directFetchSuccess,
          blockedRisk,
          needsSnapshot: true,
          notes: [
            ...notes,
            "쿠팡/스마트스토어 계열 페이지는 서버 직접 수집이 차단될 수 있습니다.",
            "브라우저에서 상세페이지 텍스트/후기 텍스트를 붙여넣어 재분석하면 정확도를 높일 수 있습니다."
          ]
        }
      };
    }

    const signals = extractSignals({
      html,
      snapshotText,
      snapshotReviewText,
      fallbackName: inferNameFromUrl(parsedUrl)
    });

    const marketPosition = analyzeMarketPosition(signals);
    const priceCompetitiveness = analyzePriceCompetitiveness(signals);
    const detailPage = analyzeDetailPage(signals);
    const reviewAnalysis = analyzeReview(signals);
    const newProductProposal = analyzeNewProductProposal(signals);

    const overallScore = calculateOverallScore({
      marketPosition: marketPosition.score,
      priceCompetitiveness: priceCompetitiveness.score,
      detailPage: detailPage.score,
      reviewAnalysis: reviewAnalysis.score,
      newProductProposal: newProductProposal.score
    });

    const status = toScoreStatus(overallScore);
    const collection: CollectionInfo = {
      requestedUrl: targetUrl,
      sourcePlatform,
      mode: snapshotText ? "provided_snapshot" : "direct_fetch",
      directFetchSuccess,
      blockedRisk,
      needsSnapshot: !snapshotText && blockedRisk && !directFetchSuccess,
      notes
    };

    const summary = buildOverallSummary({
      signals,
      status,
      overallScore,
      marketPosition,
      priceCompetitiveness,
      detailPage,
      reviewAnalysis
    });

    return {
      ok: true,
      analyzedAt: new Date().toISOString(),
      collection,
      score: {
        overall: overallScore,
        ...status
      },
      report: {
        overallSummary: summary,
        marketPositionAndCompetitiveness: marketPosition,
        priceCompetitiveness,
        detailPageAnalysis: detailPage,
        reviewAnalysis,
        newProductProposal
      },
      extractedSignals: {
        name: signals.name,
        category: signals.category,
        priceKrw: signals.priceKrw,
        ratingValue: signals.ratingValue,
        reviewCount: signals.reviewCount,
        brand: signals.brand,
        imageCount: signals.imageCount,
        detailTextLength: signals.detailTextLength
      }
    };
  }
}

function detectSourcePlatform(hostname: string): SourcePlatform {
  if (hostname.includes("coupang.com")) {
    return "coupang";
  }
  if (hostname.includes("smartstore.naver.com") || hostname.includes("brand.naver.com")) {
    return "smartstore";
  }
  return "other";
}

function isBlockedSensitiveHost(hostname: string): boolean {
  return BLOCK_SENSITIVE_HOSTS.some((host) => hostname.includes(host));
}

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; reason?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal,
      redirect: "follow"
    });

    if (!response.ok) {
      return {
        ok: false,
        html: "",
        reason: `HTTP ${response.status}`
      };
    }

    const html = await response.text();
    return { ok: true, html };
  } catch (error) {
    return {
      ok: false,
      html: "",
      reason: error instanceof Error ? error.message : "unknown fetch error"
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractSignals(params: {
  html: string;
  snapshotText: string;
  snapshotReviewText: string;
  fallbackName: string;
}): ExtractedSignals {
  const { html, snapshotText, snapshotReviewText, fallbackName } = params;
  const jsonLdNodes = html ? extractJsonLdNodes(html) : [];
  const productNode = findProductNode(jsonLdNodes);

  const titleFromHtml = html ? extractTitle(html) : "";
  const descriptionFromHtml = html ? extractDescription(html) : "";
  const textFromHtml = html ? htmlToText(html) : "";

  const rawText = [snapshotText, textFromHtml].filter(Boolean).join("\n");
  const reviewText = [snapshotReviewText, rawText].filter(Boolean).join("\n");

  const name =
    normalizeWhitespace(readString(productNode?.name)) ||
    normalizeWhitespace(titleFromHtml) ||
    fallbackName ||
    "제품명 추정 실패";

  const description =
    normalizeWhitespace(readString(productNode?.description)) ||
    normalizeWhitespace(descriptionFromHtml) ||
    firstSentences(rawText, 220);

  const brand = normalizeWhitespace(resolveBrandName(productNode?.brand));

  const structuredPrice = readNumber(resolveOfferValue(productNode?.offers, "price"));
  const priceFromHtml = extractPriceFromText(rawText);
  const priceKrw = structuredPrice ?? priceFromHtml;

  const ratingValue = readNumber(resolveAggregateRatingValue(productNode?.aggregateRating, "ratingValue"));
  const reviewCountFromSchema = readNumber(resolveAggregateRatingValue(productNode?.aggregateRating, "reviewCount"));
  const reviewCount = reviewCountFromSchema ?? extractReviewCountFromText(reviewText);

  const imageCount = html ? countMatches(html, "<img") : estimateImageCountFromText(rawText);
  const detailTextLength = rawText.length;

  const promotionSignals = PROMOTION_KEYWORDS.filter((keyword) => reviewText.includes(keyword));
  const positiveReviewSignals = REVIEW_POSITIVE_KEYWORDS.reduce(
    (sum, keyword) => sum + countMatches(reviewText, keyword),
    0
  );
  const negativeReviewSignals = REVIEW_NEGATIVE_KEYWORDS.reduce(
    (sum, keyword) => sum + countMatches(reviewText, keyword),
    0
  );

  const category = inferCategory(name + " " + description + " " + rawText);

  return {
    name,
    description,
    brand,
    priceKrw,
    ratingValue,
    reviewCount,
    imageCount,
    detailTextLength,
    positiveReviewSignals,
    negativeReviewSignals,
    promotionSignals,
    rawText,
    category,
    hasStructuredProductData: Boolean(productNode)
  };
}

function analyzeMarketPosition(signals: ExtractedSignals): AgentReportSection {
  let score = 36;

  if (signals.hasStructuredProductData) {
    score += 16;
  }
  if (signals.brand) {
    score += 10;
  }
  if (signals.name.length >= 12) {
    score += 8;
  }
  if (signals.description.length >= 100) {
    score += 10;
  }
  if (signals.promotionSignals.length >= 2) {
    score += 8;
  }

  score = clampScore(score);

  const strengths: string[] = [];
  const risks: string[] = [];
  const actionItems: string[] = [];

  if (signals.brand) {
    strengths.push(`브랜드 인지 포인트가 노출됨 (${signals.brand})`);
  } else {
    risks.push("브랜드/스토어 신뢰요소가 약해 보임");
    actionItems.push("상세페이지 상단에 브랜드 신뢰요소(공식 인증, 누적 판매/리뷰)를 배치하세요.");
  }

  if (signals.description.length >= 100) {
    strengths.push("핵심 가치 설명 텍스트가 일정 수준 확보됨");
  } else {
    risks.push("차별점 설명이 짧아 제품 포지셔닝이 흐릴 수 있음");
    actionItems.push("첫 스크린에서 타깃 고객 + 해결 문제 + 핵심 효익을 3줄로 정리하세요.");
  }

  if (!signals.hasStructuredProductData) {
    risks.push("구조화 데이터 신호가 약해 자동해석 품질이 떨어질 수 있음");
    actionItems.push("제품명/가격/리뷰/옵션 정보를 정형 블록으로 명확히 분리하세요.");
  }

  return {
    score,
    diagnosis: `현재 포지션은 '${signals.category}' 카테고리 기준으로 ${score >= 70 ? "중상" : score >= 50 ? "중" : "중하"} 수준입니다.`,
    strengths,
    risks,
    actionItems: uniqueNonEmpty(actionItems)
  };
}

function analyzePriceCompetitiveness(signals: ExtractedSignals): AgentReportSection {
  let score = 48;
  const strengths: string[] = [];
  const risks: string[] = [];
  const actionItems: string[] = [];

  const benchmark = getCategoryBenchmark(signals.category);

  if (signals.priceKrw) {
    score += 12;

    if (signals.priceKrw >= benchmark[0] && signals.priceKrw <= benchmark[1]) {
      score += 16;
      strengths.push(`추정 카테고리 가격대(${formatKrw(benchmark[0])}~${formatKrw(benchmark[1])})에 근접함`);
    } else if (signals.priceKrw < benchmark[0]) {
      score += 6;
      strengths.push("가격 진입장벽이 낮아 트래픽 전환에 유리할 가능성");
      risks.push("저가 인식으로 품질 신뢰가 낮아질 수 있음");
      actionItems.push("저가 포지션이면 품질 보증/원산지/AS 정책을 함께 강조하세요.");
    } else {
      score -= 12;
      risks.push("카테고리 평균 대비 고가 가능성이 높음");
      actionItems.push("상위 가격의 근거(내구성, 성분, 구성품)를 표 형태로 제시하세요.");
    }
  } else {
    score -= 8;
    risks.push("가격 신호를 찾지 못해 경쟁력 판단 신뢰도가 낮음");
    actionItems.push("가격, 쿠폰가, 배송비를 텍스트로 명확히 표기해 주세요.");
  }

  if (signals.promotionSignals.length > 0) {
    score += Math.min(12, signals.promotionSignals.length * 3);
    strengths.push(`프로모션 신호 감지: ${signals.promotionSignals.join(", ")}`);
  } else {
    risks.push("프로모션/구매유인 문구가 약함");
    actionItems.push("기간한정 쿠폰, 묶음할인, 무료배송 조건 중 최소 1개를 고정 운영하세요.");
  }

  score = clampScore(score);

  return {
    score,
    diagnosis: signals.priceKrw
      ? `현재 판매가 ${formatKrw(signals.priceKrw)} 기준으로 가격 포지션은 ${score >= 70 ? "경쟁형" : score >= 50 ? "보통" : "열세"}입니다.`
      : "가격 정보가 부족하여 보수적으로 평가했습니다.",
    strengths,
    risks,
    actionItems: uniqueNonEmpty(actionItems)
  };
}

function analyzeDetailPage(signals: ExtractedSignals): AgentReportSection {
  let score = 30;
  const strengths: string[] = [];
  const risks: string[] = [];
  const actionItems: string[] = [];

  if (signals.detailTextLength >= 2000) {
    score += 22;
    strengths.push("상세설명 텍스트 볼륨이 충분함");
  } else if (signals.detailTextLength >= 900) {
    score += 12;
    strengths.push("기본 설명은 확보되어 있음");
  } else {
    risks.push("상세설명 텍스트가 부족해 전환에 불리함");
    actionItems.push("사용 전/후, 핵심 기능, 사용 방법, 주의사항을 섹션으로 분리해 추가하세요.");
  }

  if (signals.imageCount >= 8) {
    score += 20;
    strengths.push("이미지 컷 수가 충분해 정보 전달력이 좋음");
  } else if (signals.imageCount >= 4) {
    score += 10;
  } else {
    risks.push("이미지 컷 수가 적어 상세페이지 설득력이 약할 수 있음");
    actionItems.push("제품 단독컷, 사용컷, 사이즈컷, 비교컷 4종 이상을 확보하세요.");
  }

  if (signals.promotionSignals.length >= 2) {
    score += 10;
  }

  score = clampScore(score);

  actionItems.push("상세페이지 상단 5초 안에 '대상 고객-문제-해결 포인트'를 읽히도록 재배치하세요.");

  return {
    score,
    diagnosis: `상세페이지 완성도는 ${score >= 70 ? "상" : score >= 50 ? "중" : "하"} 수준으로 평가됩니다.`,
    strengths,
    risks,
    actionItems: uniqueNonEmpty(actionItems)
  };
}

function analyzeReview(signals: ExtractedSignals): AgentReportSection {
  let score = 42;
  const strengths: string[] = [];
  const risks: string[] = [];
  const actionItems: string[] = [];

  if (signals.ratingValue) {
    if (signals.ratingValue >= 4.6) {
      score += 20;
      strengths.push(`평점이 높음 (${signals.ratingValue.toFixed(1)})`);
    } else if (signals.ratingValue >= 4.1) {
      score += 10;
    } else {
      score -= 8;
      risks.push(`평점이 낮은 편 (${signals.ratingValue.toFixed(1)})`);
    }
  } else {
    risks.push("평점 데이터 미확보");
  }

  if (signals.reviewCount) {
    if (signals.reviewCount >= 500) {
      score += 18;
      strengths.push(`리뷰 풀이 충분함 (${signals.reviewCount.toLocaleString()}건)`);
    } else if (signals.reviewCount >= 100) {
      score += 10;
    } else {
      score -= 6;
      risks.push("리뷰 모수가 작아 사회적 증거가 약함");
      actionItems.push("구매확정 리뷰 이벤트로 리뷰 수를 먼저 100건까지 확보하세요.");
    }
  } else {
    risks.push("리뷰 수 데이터 미확보");
    actionItems.push("후기 요약 섹션(만족/불만 Top3)을 상세페이지에 노출하세요.");
  }

  if (signals.positiveReviewSignals > signals.negativeReviewSignals) {
    score += 8;
    strengths.push("긍정 후기 시그널이 부정 시그널보다 우세");
  } else if (signals.negativeReviewSignals > 0) {
    score -= 8;
    risks.push("부정 후기 키워드가 관찰됨");
    actionItems.push("부정 키워드 원인을 유형화해 FAQ/응대 스크립트를 선제 배포하세요.");
  }

  score = clampScore(score);

  return {
    score,
    diagnosis: `후기 경쟁력은 ${score >= 70 ? "강함" : score >= 50 ? "보통" : "약함"}으로 판단됩니다.`,
    strengths,
    risks,
    actionItems: uniqueNonEmpty(actionItems)
  };
}

function analyzeNewProductProposal(signals: ExtractedSignals): AgentReportSection {
  let score = 52;
  const strengths: string[] = [];
  const risks: string[] = [];
  const actionItems: string[] = [];

  const proposals: string[] = [];

  if (signals.category === "디지털/가전") {
    proposals.push("본품 + 케이스/케이블 번들형 SKU 추가");
  } else if (signals.category === "뷰티/스킨케어") {
    proposals.push("체험용 소용량 + 본품 세트 구성");
  } else if (signals.category === "식품/건강식품") {
    proposals.push("2주 체험팩과 정기구독형 패키지 동시 운영");
  } else {
    proposals.push("입문형(저가) + 프리미엄형(고마진) 2트랙 SKU 구성");
  }

  if (signals.negativeReviewSignals > 0) {
    proposals.push("부정 후기 원인을 해결한 개선형 버전(리뉴얼 라인) 테스트 판매");
    score += 6;
  }

  if (signals.reviewCount && signals.reviewCount >= 300) {
    strengths.push("리뷰 데이터가 충분해 파생상품 실험의 리스크가 낮음");
    score += 10;
  } else {
    risks.push("리뷰 데이터가 작아 신규 SKU 검증 속도가 느릴 수 있음");
    actionItems.push("광고 전환 데이터와 리뷰 키워드를 묶어 최소 2개 가설 SKU를 소량 테스트하세요.");
  }

  actionItems.push(...proposals);
  score = clampScore(score);

  return {
    score,
    diagnosis: "현재 데이터 기준으로 확장 가능한 신규제품 기회는 존재합니다.",
    strengths,
    risks,
    actionItems: uniqueNonEmpty(actionItems)
  };
}

function calculateOverallScore(scores: {
  marketPosition: number;
  priceCompetitiveness: number;
  detailPage: number;
  reviewAnalysis: number;
  newProductProposal: number;
}): number {
  const weighted =
    scores.marketPosition * 0.25 +
    scores.priceCompetitiveness * 0.2 +
    scores.detailPage * 0.2 +
    scores.reviewAnalysis * 0.2 +
    scores.newProductProposal * 0.15;

  return Math.round(weighted);
}

function toScoreStatus(score: number): ScoreStatus {
  if (score >= 80) {
    return {
      label: "경쟁력 있음",
      color: "#2563eb",
      interpretation: "파란색 등급: 현재 시장 경쟁력이 높은 상태"
    };
  }
  if (score >= 60) {
    return {
      label: "판매는 되지만 개선 필요",
      color: "#d97706",
      interpretation: "판매는 가능하나 전환률/재구매를 위한 개선이 필요"
    };
  }
  if (score >= 40) {
    return {
      label: "개선 필요",
      color: "#f97316",
      interpretation: "핵심 요소(가격/상세/리뷰) 개선 없이는 성장 제한"
    };
  }

  return {
    label: "판매 의미 없음",
    color: "#dc2626",
    interpretation: "상품/포지션/증거요소를 재설계해야 하는 상태"
  };
}

function buildOverallSummary(params: {
  signals: ExtractedSignals;
  status: ScoreStatus;
  overallScore: number;
  marketPosition: AgentReportSection;
  priceCompetitiveness: AgentReportSection;
  detailPage: AgentReportSection;
  reviewAnalysis: AgentReportSection;
}): string {
  const { signals, status, overallScore, marketPosition, priceCompetitiveness, detailPage, reviewAnalysis } = params;

  const topWeakness = [
    { label: "시장 포지션", score: marketPosition.score },
    { label: "가격 경쟁력", score: priceCompetitiveness.score },
    { label: "상세페이지", score: detailPage.score },
    { label: "후기", score: reviewAnalysis.score }
  ].sort((a, b) => a.score - b.score)[0];

  const priceMessage = signals.priceKrw ? `판매가 ${formatKrw(signals.priceKrw)}` : "가격 미확보";
  const reviewMessage =
    signals.reviewCount && signals.ratingValue
      ? `평점 ${signals.ratingValue.toFixed(1)} / 리뷰 ${signals.reviewCount.toLocaleString()}건`
      : "평점/리뷰 데이터 일부 미확보";

  return `${signals.name} 분석 결과 총점은 ${overallScore}점(${status.label})입니다. ${priceMessage}, ${reviewMessage}. 현재 가장 보완 우선순위는 '${topWeakness.label}' 영역입니다.`;
}

function extractJsonLdNodes(html: string): unknown[] {
  const nodes: unknown[] = [];
  const matches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of matches) {
    const script = match[1]?.trim();
    if (!script) {
      continue;
    }

    try {
      const parsed = JSON.parse(script);
      nodes.push(parsed);
      continue;
    } catch {
      // ignore and attempt fallback parsing below
    }

    const normalized = script
      .replace(/\n/g, " ")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    try {
      const parsed = JSON.parse(normalized);
      nodes.push(parsed);
    } catch {
      // skip invalid JSON-LD blobs
    }
  }

  return flattenJsonLd(nodes);
}

function flattenJsonLd(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => flattenJsonLd(item));
  }

  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    const graph = record["@graph"];
    if (Array.isArray(graph)) {
      return [record, ...flattenJsonLd(graph)];
    }
    return [record];
  }

  return [];
}

function findProductNode(nodes: unknown[]): Record<string, any> | undefined {
  return nodes.find((node) => {
    if (!node || typeof node !== "object") {
      return false;
    }

    const type = (node as Record<string, unknown>)["@type"];
    if (Array.isArray(type)) {
      return type.some((item) => String(item).toLowerCase() === "product");
    }

    return String(type ?? "").toLowerCase() === "product";
  }) as Record<string, any> | undefined;
}

function extractTitle(html: string): string {
  const og = extractMetaContent(html, "property", "og:title");
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleTag = titleTagMatch?.[1] ?? "";
  return decodeHtmlEntities(og || titleTag);
}

function extractDescription(html: string): string {
  const description = extractMetaContent(html, "name", "description");
  const ogDescription = extractMetaContent(html, "property", "og:description");
  return decodeHtmlEntities(description || ogDescription || "");
}

function extractMetaContent(html: string, attribute: "name" | "property", value: string): string {
  const regex = new RegExp(
    `<meta[^>]*${attribute}=["']${escapeRegExp(value)}["'][^>]*content=["']([\\s\\S]*?)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ?? "";
}

function htmlToText(html: string): string {
  return normalizeWhitespace(
    decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function resolveBrandName(brand: unknown): string {
  if (typeof brand === "string") {
    return brand;
  }

  if (brand && typeof brand === "object") {
    const value = (brand as Record<string, unknown>).name;
    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function resolveOfferValue(offers: unknown, key: string): unknown {
  if (!offers) {
    return undefined;
  }

  if (Array.isArray(offers) && offers.length > 0) {
    return resolveOfferValue(offers[0], key);
  }

  if (typeof offers === "object") {
    return (offers as Record<string, unknown>)[key];
  }

  return undefined;
}

function resolveAggregateRatingValue(aggregateRating: unknown, key: string): unknown {
  if (!aggregateRating || typeof aggregateRating !== "object") {
    return undefined;
  }

  return (aggregateRating as Record<string, unknown>)[key];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function extractPriceFromText(text: string): number | undefined {
  const priceHintRegex = /(판매가|할인가|가격|price)[^\d]{0,20}(\d{1,3}(?:,\d{3})+|\d{4,})\s*(원|krw)?/i;
  const priceHintMatch = text.match(priceHintRegex);
  if (priceHintMatch?.[2]) {
    return Number(priceHintMatch[2].replace(/,/g, ""));
  }

  const currencyRegex = /(₩\s*\d{1,3}(?:,\d{3})+|\d{1,3}(?:,\d{3})+\s*원)/i;
  const currencyMatch = text.match(currencyRegex);
  if (!currencyMatch) {
    return undefined;
  }

  const numeric = currencyMatch[0].replace(/[^\d]/g, "");
  const parsed = Number(numeric);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function extractReviewCountFromText(text: string): number | undefined {
  const reviewRegex = /(리뷰|후기)[^\d]{0,10}(\d{1,3}(?:,\d{3})+|\d{2,})/i;
  const match = text.match(reviewRegex);
  if (!match?.[2]) {
    return undefined;
  }

  return Number(match[2].replace(/,/g, ""));
}

function estimateImageCountFromText(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.min(10, Math.max(1, Math.floor(text.length / 600)));
}

function inferCategory(text: string): string {
  const normalized = text.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }

  return "일반 카테고리";
}

function getCategoryBenchmark(category: string): [number, number] {
  const found = CATEGORY_RULES.find((rule) => rule.category === category);
  return found?.benchmarkRange ?? [15000, 49000];
}

function inferNameFromUrl(url: URL): string {
  const segment = url.pathname
    .split("/")
    .filter(Boolean)
    .at(-1);

  if (!segment) {
    return "제품명 추정 실패";
  }

  return normalizeWhitespace(
    decodeURIComponent(segment)
      .replace(/[-_]/g, " ")
      .replace(/\.[a-zA-Z0-9]+$/, "")
  );
}

function firstSentences(text: string, maxLength: number): string {
  if (!text) {
    return "";
  }
  return normalizeWhitespace(text.slice(0, maxLength));
}

function countMatches(text: string, pattern: string): number {
  const regex = new RegExp(escapeRegExp(pattern), "gi");
  return Array.from(text.matchAll(regex)).length;
}

function formatKrw(value: number): string {
  return `${Math.round(value).toLocaleString()}원`;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeWhitespace(value: string | undefined | null): string {
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function uniqueNonEmpty(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => normalizeWhitespace(item)).filter(Boolean)));
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
