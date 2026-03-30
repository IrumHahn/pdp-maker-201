import { callGeminiJSON, S } from '../services/geminiService';
import { RawCandidate, SourcingData } from '../types';

const SYSTEM_PROMPT = `당신은 중국 및 글로벌 소싱 전문가입니다. Alibaba, AliExpress, DHgate, Made-in-China 플랫폼의 공급업체 탐색에 정통합니다.
각 제품에 대한 실제 소싱처 정보(공급업체명, URL, 단가, MOQ)를 최대한 구체적으로 제공합니다.
항상 JSON 형식으로만 응답하세요.`;

const responseSchema = S.array(
  S.object({
    productName: S.string(),
    sourcingLinks: S.array(
      S.object({
        supplier: S.string(),
        platform: S.string(),
        url: S.string(),
        estimatedPrice: S.string(),
        moq: S.string(),
        shippingNote: S.string(),
        contactEmail: S.string(),
      })
    ),
  })
);

// Alibaba 검색 URL 패턴
function buildAlibabaSearchUrl(keyword: string): string {
  return `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}&IndexArea=product_en`;
}
function buildAliExpressSearchUrl(keyword: string): string {
  return `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}`;
}
function buildDHgateSearchUrl(keyword: string): string {
  return `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(keyword)}`;
}

export async function findSourcingLinks(
  apiKey: string,
  candidates: RawCandidate[]
): Promise<SourcingData[]> {
  const productList = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.productName} (${c.productNameKo})
   카테고리: ${c.category}
   소싱 목표 원가: ${c.sourcingPrice}
   Alibaba 검색 URL 예시: ${buildAlibabaSearchUrl(c.productName)}
   AliExpress 검색 URL 예시: ${buildAliExpressSearchUrl(c.productName)}
   DHgate 검색 URL 예시: ${buildDHgateSearchUrl(c.productName)}`
    )
    .join('\n\n');

  const userPrompt = `
다음 소싱 후보 상품들의 해외 소싱처를 찾아주세요.

[후보 상품 목록]
${productList}

[각 상품별 요구사항]
각 상품마다 3개의 소싱처를 제공하세요:
1. Alibaba 소싱처 (B2B, 대량 구매용)
2. AliExpress 소싱처 (소량 테스트 구매용)
3. DHgate 또는 Made-in-China (대안 소싱처)

[각 소싱처 정보]
- supplier: 가상의 실제적인 공급업체명 (예: "Guangzhou EcoLife Trading Co., Ltd.")
- platform: 플랫폼명 (Alibaba / AliExpress / DHgate / Made-in-China)
- url: 위에서 제공한 검색 URL 패턴을 활용하여 각 플랫폼의 실제 검색 URL 생성
  - Alibaba: https://www.alibaba.com/trade/search?SearchText={영문키워드}&IndexArea=product_en
  - AliExpress: https://www.aliexpress.com/wholesale?SearchText={영문키워드}
  - DHgate: https://www.dhgate.com/wholesale/search.do?searchkey={영문키워드}
- estimatedPrice: 예상 단가 범위 (예: "$3.50 ~ $6.00 / pc")
- moq: 최소 주문 수량 (예: "100pcs" 또는 "1pc")
- shippingNote: 배송 방법 및 예상 기간 (예: "DHL/FedEx 5-10일, 약 $2-3/kg")
- contactEmail: 가상 이메일 주소 (예: "sales@guangzhou-ecolife.com")

⚠️ URL은 반드시 실제로 작동하는 검색 URL 형식을 사용하세요 (위 패턴 활용).
`;

  return callGeminiJSON<SourcingData[]>(apiKey, SYSTEM_PROMPT, userPrompt, responseSchema);
}
