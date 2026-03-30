import { callGeminiJSON, S } from '../services/geminiService';
import { RawCandidate, AppMode } from '../types';

const SYSTEM_PROMPT = `당신은 글로벌 이커머스 소싱 전문가입니다. AliExpress, Amazon, Temu, TikTok Shop의 최신 트렌드와 SNS 광고 패턴을 깊이 이해하고 있습니다.
한국 이커머스(쿠팡, 네이버스마트스토어) 시장에서 성공 가능성이 높은 해외 소싱 상품을 발굴하는 것이 전문입니다.
항상 JSON 형식으로만 응답하세요.`;

const responseSchema = S.array(
  S.object({
    productName: S.string(),
    productNameKo: S.string(),
    category: S.string(),
    targetPrice: S.string(),
    sourcingPrice: S.string(),
    marginRate: S.number(),
    koreaMarketFit: S.string(),
    koreanSellingAngle: S.string(),
    hotEvidence: S.string(),
    risks: S.array(S.string()),
  })
);

const DISCOVERY_PROMPT = `
전세계 이커머스에서 현재 뜨고 있거나, 잘 팔리지만 한국에는 아직 덜 알려진 소싱 가능 상품 6개를 발굴해주세요.

[발굴 기준]
1. 중국/동남아에서 저렴하게 소싱 가능한 제품
2. 한국 이커머스에서 아직 레드오션이 아닌 틈새 상품
3. 소비자가 온라인에서 직접 구매할 만한 제품 (B2C)
4. 마진율 40% 이상 기대 가능한 가격대
5. 규제·통관 이슈가 적은 생활용품, 뷰티, 홈, 스포츠, 취미 카테고리 우선

[각 상품별 출력 형식]
- productName: 영문 제품명
- productNameKo: 한국어 제품명
- category: 카테고리 (예: 홈/인테리어, 뷰티, 스포츠, 펫용품 등)
- targetPrice: 한국 예상 판매가 범위 (예: "18,000~28,000원")
- sourcingPrice: 예상 소싱 원가 (예: "$3~5 / pc")
- marginRate: 예상 마진율 (정수, 예: 65)
- koreaMarketFit: 한국 마켓에 적합한 이유 (2-3문장)
- koreanSellingAngle: 한국에서 팔 때 강조할 핵심 메시지 (1문장)
- hotEvidence: 글로벌에서 인기 있다는 근거 (구체적 플랫폼/트렌드 언급)
- risks: 리스크 목록 (배열, 2-3개)
`;

function buildTargetedPrompt(interest: string): string {
  return `
[관심 분야]: "${interest}"

위 분야에서 한국 이커머스에 소싱할 만한 해외 제품 6개를 발굴해주세요.

[발굴 기준]
1. "${interest}" 분야와 직접 연관된 제품
2. 중국/동남아에서 저렴하게 소싱 가능
3. 한국 시장에서 아직 경쟁이 치열하지 않은 틈새 상품 포함
4. 마진율 40% 이상 기대 가능
5. 일반 소비자 대상 B2C 상품

[각 상품별 출력 형식]
- productName: 영문 제품명
- productNameKo: 한국어 제품명
- category: "${interest}" 내 세부 카테고리
- targetPrice: 한국 예상 판매가 범위 (예: "18,000~28,000원")
- sourcingPrice: 예상 소싱 원가 (예: "$3~5 / pc")
- marginRate: 예상 마진율 (정수, 예: 65)
- koreaMarketFit: 한국 "${interest}" 소비자에게 적합한 이유 (2-3문장)
- koreanSellingAngle: 한국에서 팔 때 강조할 핵심 메시지 (1문장)
- hotEvidence: 글로벌 또는 해당 분야에서 인기 있다는 근거
- risks: 리스크 목록 (배열, 2-3개)
`;
}

export async function discoverProducts(
  apiKey: string,
  mode: AppMode,
  interest?: string
): Promise<RawCandidate[]> {
  const userPrompt = mode === 'discovery' ? DISCOVERY_PROMPT : buildTargetedPrompt(interest || '');
  return callGeminiJSON<RawCandidate[]>(apiKey, SYSTEM_PROMPT, userPrompt, responseSchema);
}
