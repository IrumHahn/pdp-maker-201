import { callGeminiJSON, S } from '../services/geminiService';
import { RawCandidate, TrendData } from '../types';

const SYSTEM_PROMPT = `당신은 글로벌 이커머스 트렌드 분석 전문가입니다. Google Trends, TikTok 광고 트렌드, Amazon Movers & Shakers, AliExpress 베스트셀러 패턴을 기반으로 제품의 트렌드 사이클을 정확하게 분류합니다.
항상 JSON 형식으로만 응답하세요.`;

const responseSchema = S.array(
  S.object({
    productName: S.string(),
    trendSignal: S.string(),   // RISING | PEAK | STABLE | DECLINING
    trendEvidence: S.string(),
  })
);

export async function analyzeTrends(
  apiKey: string,
  candidates: RawCandidate[]
): Promise<TrendData[]> {
  const productList = candidates
    .map((c, i) => `${i + 1}. ${c.productName} (${c.productNameKo}) - 카테고리: ${c.category}`)
    .join('\n');

  const userPrompt = `
다음 소싱 후보 상품들의 현재 글로벌 트렌드 시그널을 분석해주세요.

[후보 상품 목록]
${productList}

[트렌드 시그널 기준]
- RISING: 최근 3-6개월간 검색량·판매량이 빠르게 증가 중 (진입 적기)
- PEAK: 현재 최고 인기 시점. 곧 경쟁 심화 예상 (빠른 진입 필요)
- STABLE: 꾸준히 팔리는 스테디셀러 (안정적이나 차별화 필요)
- DECLINING: 하락 트렌드 (진입 비권장)

[각 상품별 출력]
- productName: 영문 제품명 (입력과 동일하게)
- trendSignal: RISING / PEAK / STABLE / DECLINING 중 하나
- trendEvidence: 이 분류를 선택한 구체적 근거 (1-2문장)
`;

  return callGeminiJSON<TrendData[]>(apiKey, SYSTEM_PROMPT, userPrompt, responseSchema);
}
