import { callGeminiJSON, S } from '../services/geminiService';
import { NegotiationRequest, NegotiationEmail } from '../types';

const SYSTEM_PROMPT = `당신은 한국 이커머스 셀러를 대신하는 베테랑 무역 협상 전문가입니다. 중국 공급업체와의 협상 경험이 10년 이상이며, 최적의 가격과 조건을 이끌어내는 전문가입니다.
영어 이메일은 프로페셔널하고 정중하게 작성하되, 여러 공급업체를 비교 중임을 자연스럽게 암시합니다.
항상 JSON 형식으로만 응답하세요.`;

const responseSchema = S.object({
  subject: S.string(),
  body: S.string(),
  keyPoints: S.array(S.string()),
});

export async function draftNegotiationEmail(
  apiKey: string,
  request: NegotiationRequest
): Promise<NegotiationEmail> {
  const { product, supplier, targetPrice, quantity, requirements, senderName, senderCompany } = request;

  const userPrompt = `
다음 조건으로 중국 공급업체에게 보낼 첫 번째 영문 문의/협상 이메일을 작성해주세요.

[제품 정보]
- 제품명: ${product.productNameKo} (${product.productName})
- 카테고리: ${product.category}
- 현재 시장 예상가: ${product.sourcingPrice}

[공급업체 정보]
- 업체명: ${supplier.supplier}
- 플랫폼: ${supplier.platform}
- 게시 단가: ${supplier.estimatedPrice}

[협상 목표]
- 목표 단가: ${targetPrice}
- 주문 예정 수량: ${quantity}
- 추가 요구사항: ${requirements || '없음'}

[발신자]
- 이름: ${senderName}
- 회사: ${senderCompany}

[이메일 작성 지침]
1. 전문적이고 신뢰감 있는 톤 유지
2. 회사 소개 및 관심 제품 명확히 언급
3. 구체적인 수량 언급으로 진지한 바이어임을 인식시키기
4. 3가지 핵심 질문 포함:
   a) 해당 수량 기준 최저 단가
   b) 무료 샘플 또는 샘플 구매 가능 여부
   c) OEM/ODM (커스텀 패키징) 가능 여부
5. 현재 여러 공급업체를 검토 중임을 자연스럽게 암시 (압박 없이)
6. 응답 기한 7일 명시
7. 이메일 길이: 250-350 단어 적정

[출력 형식]
- subject: 이메일 제목 (영어)
- body: 이메일 본문 (영어, 단락 구분은 \\n\\n 사용)
- keyPoints: 이 이메일의 핵심 협상 포인트 3-4개 (한국어 배열)
`;

  return callGeminiJSON<NegotiationEmail>(apiKey, SYSTEM_PROMPT, userPrompt, responseSchema);
}
