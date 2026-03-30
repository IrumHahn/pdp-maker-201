import type {
  TennisFormatTag,
  TennisLevelTag,
  TennisRankingType,
  TennisRegistrationRoute,
  TennisTournamentStatus
} from "@runacademy/shared";

const REGION_PATTERNS: Array<{ region: string; tokens: string[] }> = [
  { region: "서울", tokens: ["서울", "올림픽공원"] },
  { region: "경기", tokens: ["경기", "수원", "하남", "만석공원"] },
  { region: "인천", tokens: ["인천", "송도"] },
  { region: "충남", tokens: ["천안", "충남"] },
  { region: "경북", tokens: ["문경", "경북"] },
  { region: "전북", tokens: ["전북", "순창"] },
  { region: "부산", tokens: ["부산", "사직"] }
];

export function nowIso() {
  return new Date().toISOString();
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|tr|li|table|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function buildExcerpt(value: string, maxLength = 280) {
  const text = stripHtml(value).replace(/\s+/g, " ");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

export function extractInnerText(block: string, className: string) {
  const expression = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i");
  const match = block.match(expression);
  return match ? stripHtml(match[1]) : "";
}

export function extractHref(block: string, className: string) {
  const expression = new RegExp(`<a[^>]*class=["'][^"']*${className}[^"']*["'][^>]*href=["']([^"']+)["']`, "i");
  const match = block.match(expression);
  return match?.[1];
}

export function extractTaggedBlocks(value: string, className: string) {
  const expression = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/article>`, "gi");
  return Array.from(value.matchAll(expression)).map((match) => match[0]);
}

export function extractTableValue(value: string, label: string) {
  const expression = new RegExp(`<tr>\\s*<th>${escapeRegex(label)}<\\/th>\\s*<td>([\\s\\S]*?)<\\/td>\\s*<\\/tr>`, "i");
  const match = value.match(expression);
  return match ? stripHtml(match[1]) : "";
}

export function parseFeeAmount(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/,/g, "").replace(/\s+/g, "");
  const digitMatch = normalized.match(/(\d{2,7})원/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const koreanAmountMatch = normalized.match(/(?:(\d+)만)?(?:(\d+)천)?원/);
  if (koreanAmountMatch) {
    const man = Number(koreanAmountMatch[1] ?? 0) * 10000;
    const thousand = Number(koreanAmountMatch[2] ?? 0) * 1000;
    const valueFromUnits = man + thousand;
    if (valueFromUnits > 0) {
      return valueFromUnits;
    }
  }

  return undefined;
}

export function parseDateRange(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const rangeMatch = normalized.match(
    /(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})\s*일?\s*(?:~|-|–|—)\s*(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})/
  );

  if (rangeMatch) {
    return {
      startDate: toIsoDate(rangeMatch[1], rangeMatch[2], rangeMatch[3]),
      endDate: toIsoDate(rangeMatch[4], rangeMatch[5], rangeMatch[6])
    };
  }

  const singleMatch = normalized.match(/(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})/);
  if (singleMatch) {
    const iso = toIsoDate(singleMatch[1], singleMatch[2], singleMatch[3]);
    return { startDate: iso, endDate: iso };
  }

  return {
    startDate: nowIso().slice(0, 10),
    endDate: nowIso().slice(0, 10)
  };
}

export function parseDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})(?:\s*일?)?(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) {
    return undefined;
  }

  const date = toIsoDate(match[1], match[2], match[3]);
  const hour = String(Number(match[4] ?? 0)).padStart(2, "0");
  const minute = String(Number(match[5] ?? 0)).padStart(2, "0");
  return `${date}T${hour}:${minute}:00+09:00`;
}

export function inferRankingType(value: string): TennisRankingType {
  const text = value.toLowerCase();

  if (text.includes("비랭킹")) {
    return "non_ranked";
  }

  if (text.includes("랭킹")) {
    return "ranked";
  }

  return "mixed";
}

export function inferLevelTags(value: string, rankingType: TennisRankingType): TennisLevelTag[] {
  const text = value.toLowerCase();
  const levels = new Set<TennisLevelTag>();

  if (rankingType === "ranked") {
    levels.add("ranked");
  }

  if (rankingType === "non_ranked") {
    levels.add("non_ranked");
  }

  if (/루키|입문|신인|ntrp 3\.0 이하/.test(text)) {
    levels.add("beginner");
  }

  if (/개나리|국화|여자복식|여성/.test(text)) {
    levels.add("women");
  }

  if (/시니어|베테랑|장년|만 60세|만60세/.test(text)) {
    levels.add("senior");
  }

  if (/챌린저|3\.0|4\.0|중급/.test(text)) {
    levels.add("intermediate");
  }

  if (/오픈부|지도자|마스터|5\.0|6\.0/.test(text)) {
    levels.add("advanced");
    levels.add("open");
  }

  if (levels.size === 0) {
    levels.add("novice");
  }

  return Array.from(levels);
}

export function inferFormatTags(value: string): TennisFormatTag[] {
  const text = value.toLowerCase();
  const formats = new Set<TennisFormatTag>();

  if (/혼합|혼복|mixed/.test(text)) {
    formats.add("mixed_doubles");
  }

  if (/여자복식|개나리|국화/.test(text)) {
    formats.add("women_doubles");
  }

  if (/남자복식/.test(text)) {
    formats.add("men_doubles");
  }

  if (/단식/.test(text)) {
    formats.add("singles");
  }

  if (/복식|부서|페어/.test(text) || formats.size === 0) {
    formats.add("doubles");
  }

  return Array.from(formats);
}

export function summarizeFormats(tags: TennisFormatTag[]) {
  if (tags.includes("mixed_doubles")) {
    return "복식 중심, 혼합복식 포함";
  }

  if (tags.includes("singles") && tags.includes("doubles")) {
    return "단식과 복식 동시 운영";
  }

  if (tags.includes("women_doubles")) {
    return "여성 복식 중심";
  }

  if (tags.includes("doubles")) {
    return "복식 중심";
  }

  return "경기 형식 확인 필요";
}

export function inferGenderSummary(value: string) {
  if (/여자|개나리|국화/.test(value)) {
    return "여성 부서 포함";
  }

  if (/혼합|혼복/.test(value)) {
    return "혼합복식 가능";
  }

  return undefined;
}

export function inferAgeSummary(value: string) {
  const explicit = value.match(/만\s?(\d{2})세\s?이상/);
  if (explicit) {
    return `만 ${explicit[1]}세 이상 참가 가능`;
  }

  if (/시니어|베테랑|장년/.test(value)) {
    return "연령 제한 부서 포함";
  }

  return undefined;
}

export function inferRegion(value: string) {
  for (const candidate of REGION_PATTERNS) {
    if (candidate.tokens.some((token) => value.includes(token))) {
      return candidate.region;
    }
  }

  return "전국";
}

export function inferCity(value: string) {
  const match = value.match(/(서울|수원|하남|문경|천안|부산|순창|인천)/);
  return match?.[1];
}

export function mapTournamentStatus(value: string, startDate: string, endDate: string): TennisTournamentStatus {
  const text = value.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  if (text.includes("접수중") || text.includes("신청중")) {
    return "registration_open";
  }

  if (text.includes("마감") || text.includes("종료")) {
    return endDate < today ? "ended" : "registration_closed";
  }

  if (startDate > today) {
    return "upcoming";
  }

  if (endDate < today) {
    return "ended";
  }

  return "live";
}

export function formatStatusLabel(status: TennisTournamentStatus) {
  switch (status) {
    case "registration_open":
      return "접수중";
    case "upcoming":
      return "접수예정";
    case "registration_closed":
      return "접수마감";
    case "live":
      return "진행중";
    case "ended":
      return "종료";
  }
}

export function summarizeEligibility(levelTags: TennisLevelTag[], rawEligibility: string, rankingType: TennisRankingType) {
  const parts: string[] = [];

  if (levelTags.includes("beginner")) {
    parts.push("입문자도 검토 가능한 부서 포함");
  } else if (levelTags.includes("intermediate")) {
    parts.push("동호인 중급 이상 중심");
  } else if (levelTags.includes("advanced") || levelTags.includes("open")) {
    parts.push("오픈부 또는 상급자 중심");
  }

  if (levelTags.includes("women")) {
    parts.push("여성 부서 운영");
  }

  if (levelTags.includes("senior")) {
    parts.push("시니어 연령 조건 포함");
  }

  if (rankingType === "ranked") {
    parts.push("랭킹 포인트 반영");
  } else if (rankingType === "non_ranked") {
    parts.push("비랭킹 이벤트");
  }

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return rawEligibility || "참가 자격은 원문 요강 확인";
}

export function buildRegistrationHint(route: TennisRegistrationRoute, sourceName: string) {
  if (route === "app") {
    return `${sourceName} 외부 앱 또는 전용 흐름으로 이동`;
  }

  if (route === "manual_contact") {
    return `${sourceName} 공지의 문의처로 직접 확인 필요`;
  }

  return `${sourceName} 원출처 페이지에서 신청`;
}

export function buildFingerprint(name: string, startDate: string, venue?: string, organizer?: string) {
  const normalized = [name, startDate, venue ?? "", organizer ?? ""]
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, " "))
    .join("|");

  return slugify(normalized);
}

export function buildFreshnessLabel(value: string) {
  const diffHours = Math.max(1, Math.round((Date.now() - Date.parse(value)) / 36e5));

  if (diffHours < 24) {
    return `${diffHours}시간 전 갱신`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}일 전 갱신`;
}

function toIsoDate(year: string, month: string, day: string) {
  return `${year}-${String(Number(month)).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
