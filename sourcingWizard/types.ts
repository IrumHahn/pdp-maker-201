// ============================================================
// 소싱 마법사 1.0 - 타입 정의
// ============================================================

// === 앱 모드 & 스텝 ===
export type AppMode = 'discovery' | 'targeted';
export type AppStep = 'INPUT' | 'RUNNING' | 'RESULTS' | 'DETAIL' | 'NEGOTIATION';
export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export interface AgentState {
  search: AgentStatus;
  trend: AgentStatus;
  evaluation: AgentStatus;
  sourcing: AgentStatus;
}

// === 평가 점수 ===
export interface EvaluationScores {
  koreaFit: number;       // 한국 마켓 적합도 (0-100)
  competition: number;    // 경쟁력 (낮은 경쟁 = 높은 점수, 0-100)
  profitability: number;  // 수익성 (0-100)
  sourcingEase: number;   // 소싱 용이성 (0-100)
  total: number;          // 가중 합산 점수 (0-100)
}

// === 한국 경쟁 현황 ===
export interface CompetitorEntry {
  name: string;           // 경쟁 제품/브랜드명
  priceRange: string;     // 가격대 (예: "15,000~35,000원")
  reviewCount: string;    // 리뷰 수 추정 (예: "약 2,000개")
  weakness: string;       // 경쟁자 약점 / 차별화 기회
}

export interface CompetitionReport {
  naverShopping: CompetitorEntry[];
  coupang: CompetitorEntry[];
  summary: string;        // 전체 경쟁 현황 요약
  opportunity: string;    // 진입 기회 포인트
}

// === 소싱처 ===
export interface SourcingLink {
  supplier: string;       // 공급업체명 (예: "Guangzhou Eco-Trade Co.")
  platform: string;       // Alibaba / AliExpress / DHgate / 1688
  url: string;            // 검색/제품 URL
  estimatedPrice: string; // 예상 단가 (예: "$3.50 ~ $5.00 / pc")
  moq: string;            // 최소 주문 수량 (예: "100개")
  shippingNote: string;   // 배송 참고 (예: "DHL 7-10일, 약 $2/kg")
  contactEmail?: string;  // 공급업체 연락처 이메일
}

// === 소싱 후보 상품 (핵심 데이터 모델) ===
export interface SourcingCandidate {
  id: string;
  productName: string;          // 영문 제품명
  productNameKo: string;        // 한국어 제품명
  category: string;             // 카테고리 (예: "홈/생활용품")
  targetPrice: string;          // 한국 예상 판매가 (예: "25,000~35,000원")
  sourcingPrice: string;        // 예상 소싱 원가 (예: "$4~6 / pc")
  marginRate: number;           // 예상 마진율 % (예: 65)

  scores: EvaluationScores;

  trendSignal: 'RISING' | 'PEAK' | 'STABLE' | 'DECLINING';
  trendEvidence: string;        // 트렌드 근거

  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  koreaMarketFit: string;       // 한국 마켓 적합 이유
  koreanSellingAngle: string;   // 한국 판매 전략 방향
  hotEvidence: string;          // 인기 근거 (글로벌 데이터 기반)
  risks: string[];              // 리스크 목록

  sourcingLinks: SourcingLink[];
  competitionReport: CompetitionReport;
}

// === 파이프라인 실행 결과 ===
export interface SourcingRunResult {
  mode: AppMode;
  interest?: string;
  candidates: SourcingCandidate[];
  generatedAt: string;
}

// === 협상 이메일 ===
export interface NegotiationRequest {
  product: SourcingCandidate;
  supplier: SourcingLink;
  targetPrice: string;      // 협상 목표 단가
  quantity: string;         // 주문 예정 수량
  requirements: string;     // 추가 요구사항 (OEM, 패키징 등)
  senderName: string;       // 발신자명 (한국 바이어)
  senderCompany: string;    // 발신자 회사명
}

export interface NegotiationEmail {
  subject: string;
  body: string;
  keyPoints: string[];      // 협상 핵심 포인트 요약 (한국어)
}

// === 에이전트 내부 타입 (Raw 데이터) ===
export interface RawCandidate {
  productName: string;
  productNameKo: string;
  category: string;
  targetPrice: string;
  sourcingPrice: string;
  marginRate: number;
  koreaMarketFit: string;
  koreanSellingAngle: string;
  hotEvidence: string;
  risks: string[];
}

export interface TrendData {
  productName: string;
  trendSignal: 'RISING' | 'PEAK' | 'STABLE' | 'DECLINING';
  trendEvidence: string;
}

export interface EvaluationData {
  productName: string;
  scores: EvaluationScores;
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  competitionReport: CompetitionReport;
}

export interface SourcingData {
  productName: string;
  sourcingLinks: SourcingLink[];
}
