import { callGeminiJSON, S } from '../services/geminiService';
import { RawCandidate, EvaluationData } from '../types';

const SYSTEM_PROMPT = `당신은 한국 이커머스 시장 분석 및 제품 경쟁력 평가 전문가입니다. 쿠팡, 네이버 스마트스토어, 11번가의 시장 구조를 깊이 이해하고 있습니다.
제품의 한국 마켓 적합도, 경쟁 강도, 수익성, 소싱 용이성을 종합적으로 평가하여 0-100점으로 점수화합니다.
항상 JSON 형식으로만 응답하세요.`;

const responseSchema = S.array(
  S.object({
    productName: S.string(),
    scores: S.object({
      koreaFit: S.number(),
      competition: S.number(),
      profitability: S.number(),
      sourcingEase: S.number(),
      total: S.number(),
    }),
    competitionLevel: S.string(),  // LOW | MEDIUM | HIGH
    competitionReport: S.object({
      summary: S.string(),
      opportunity: S.string(),
      naverShopping: S.array(
        S.object({
          name: S.string(),
          priceRange: S.string(),
          reviewCount: S.string(),
          weakness: S.string(),
        })
      ),
      coupang: S.array(
        S.object({
          name: S.string(),
          priceRange: S.string(),
          reviewCount: S.string(),
          weakness: S.string(),
        })
      ),
    }),
  })
);

export async function evaluateProducts(
  apiKey: string,
  candidates: RawCandidate[]
): Promise<EvaluationData[]> {
  const productList = candidates
    .map(
      (c, i) => `${i + 1}. ${c.productName} (${c.productNameKo})
   카테고리: ${c.category}
   한국 예상 판매가: ${c.targetPrice}
   소싱 원가: ${c.sourcingPrice}
   예상 마진율: ${c.marginRate}%`
    )
    .join('\n\n');

  const userPrompt = `
다음 소싱 후보 상품들을 한국 이커머스 관점에서 종합 평가해주세요.

[후보 상품 목록]
${productList}

[평가 점수 기준 (각 0-100점)]
1. koreaFit (한국 마켓 적합도)
   - 한국 소비자 트렌드 부합도
   - 규제/통관 용이성
   - 계절성 및 수요 지속성

2. competition (경쟁력 점수, 높을수록 경쟁 적음)
   - 쿠팡/네이버 현재 판매자 수
   - 카테고리 포화도 역산
   - 100점 = 경쟁자 거의 없음, 0점 = 극도로 치열

3. profitability (수익성)
   - 마진율 기반 (제공된 marginRate 참고)
   - 반품/CS 리스크 고려
   - 재구매율 잠재력

4. sourcingEase (소싱 용이성)
   - Alibaba 공급업체 다양성
   - MOQ 현실성 (소규모 셀러 기준)
   - 배송/물류 복잡도

5. total = koreaFit×0.30 + competition×0.25 + profitability×0.25 + sourcingEase×0.20 (소수점 반올림)

[경쟁 현황 분석]
각 상품별로 한국 시장의 주요 경쟁 제품/판매자를 2-3개 파악하여:
- naverShopping: 네이버쇼핑 주요 경쟁 제품 2개
- coupang: 쿠팡 주요 경쟁 제품 2개
- summary: 전체 경쟁 현황 요약 (2-3문장)
- opportunity: 틈새 진입 기회 포인트 (구체적으로)

[competitionLevel]
- LOW: competition점수 70 이상
- MEDIUM: competition점수 40-69
- HIGH: competition점수 39 이하
`;

  return callGeminiJSON<EvaluationData[]>(apiKey, SYSTEM_PROMPT, userPrompt, responseSchema);
}
