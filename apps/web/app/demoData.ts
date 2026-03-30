export type PortalView = "client" | "admin";
export type WorkspaceTab = "overview" | "timeline" | "approvals" | "conversation" | "handover";
export type Tone = "stable" | "attention" | "progress";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ContentRequestStatus = "requested" | "submitted" | "approved";

export type MetricCard = {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
};

export type Milestone = {
  id: string;
  title: string;
  window: string;
  state: "done" | "active" | "upcoming";
  progress: number;
  note: string;
};

export type ContentRequest = {
  id: string;
  title: string;
  dueLabel: string;
  owner: string;
  status: ContentRequestStatus;
  detail: string;
};

export type ProjectUpdate = {
  id: string;
  title: string;
  dateLabel: string;
  summary: string;
  actionLabel?: string;
  tone: Tone;
};

export type ApprovalItem = {
  id: string;
  title: string;
  version: string;
  dueLabel: string;
  detail: string;
  status: ApprovalStatus;
};

export type ConversationMessage = {
  id: string;
  author: string;
  actor: "agency" | "client" | "system";
  body: string;
  timeLabel: string;
};

export type IntegrationItem = {
  id: string;
  name: string;
  billingOwner: string;
  statusLabel: string;
  transferLabel: string;
  detail: string;
};

export type ChangeItem = {
  id: string;
  title: string;
  scope: string;
  detail: string;
  statusLabel: string;
};

export type RiskItem = {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

export const workspaceTabs: { id: WorkspaceTab; label: string; summary: string }[] = [
  { id: "overview", label: "Overview", summary: "프로젝트 상황 요약과 다음 액션" },
  { id: "timeline", label: "Timeline", summary: "계약 일정과 마일스톤 흐름" },
  { id: "approvals", label: "Approvals", summary: "시안 승인과 검수 상태" },
  { id: "conversation", label: "Conversation", summary: "클라이언트와의 대화 기록" },
  { id: "handover", label: "Handover", summary: "운영 전환과 유지보수 계획" }
];

export const projectIdentity = {
  service: "RE:BRANDB Client Portal",
  agency: "RE:BRANDB",
  client: "빈파트너스",
  projectName: "빈파트너스 공식 웹사이트 제작",
  summary:
    "웹사이트 제작 진행 상황, 자료 요청, 승인, 회의, 운영 전환을 한 화면에서 관리하는 클라이언트 포털 MVP",
  status: "기능 협의 및 제작 진행",
  projectCode: "BIN-2026-WEB-01",
  contractWindow: "2026.03.09 - 2026.04.20",
  healthLabel: "오늘 기준 일정 정상, 자료 수급 리스크만 관리 필요"
};

export const contractSnapshot = [
  { label: "계약 금액", value: "₩3,900,000 + VAT" },
  { label: "자료 제출 마감", value: "2026.03.18" },
  { label: "검수 SLA", value: "납품 후 3영업일" },
  { label: "하자보수", value: "검수 후 1개월" }
];

export const clientMetrics: MetricCard[] = [
  {
    label: "현재 단계",
    value: "기능 협의",
    hint: "캘린더, 다운로드, AI 챗봇 구조를 확정하는 단계",
    tone: "progress"
  },
  {
    label: "전체 진척률",
    value: "48%",
    hint: "디자인 컨셉 확정 후 제작 단계로 진입",
    tone: "stable"
  },
  {
    label: "클라이언트 액션",
    value: "2건",
    hint: "서비스 상세 문안과 FAQ 초안 제출 필요",
    tone: "attention"
  },
  {
    label: "다음 공식 협의",
    value: "03.31",
    hint: "기능 협의 미팅 예정",
    tone: "stable"
  }
];

export const adminMetrics: MetricCard[] = [
  {
    label: "프로젝트 상태",
    value: "On Track",
    hint: "계약 종료일 기준 일정 여유 6일",
    tone: "stable"
  },
  {
    label: "승인 대기",
    value: "1건",
    hint: "메인 구조 v1.2 승인 요청 초안 준비 완료",
    tone: "attention"
  },
  {
    label: "자료 미수급",
    value: "2건",
    hint: "서비스 상세 문안과 FAQ 초안 미제출",
    tone: "attention"
  },
  {
    label: "서드파티 전환",
    value: "3건",
    hint: "Framer, AI 챗봇, 뉴스레터 전환 계획 수립 필요",
    tone: "progress"
  }
];

export const milestones: Milestone[] = [
  {
    id: "ms-1",
    title: "계약 및 세팅",
    window: "03.09 - 03.12",
    state: "done",
    progress: 100,
    note: "계약 등록, 계정 구조 정의, 프로젝트 포털 초기 세팅 완료"
  },
  {
    id: "ms-2",
    title: "자료 수집",
    window: "03.09 - 03.18",
    state: "active",
    progress: 68,
    note: "회사 소개/대표 이력 수급 완료, 서비스 상세와 FAQ만 대기"
  },
  {
    id: "ms-3",
    title: "디자인 컨셉",
    window: "03.19 - 03.24",
    state: "active",
    progress: 45,
    note: "메인 톤앤매너, 카드형 프로젝트 섹션, CTA 구조 확정 중"
  },
  {
    id: "ms-4",
    title: "기능 협의 및 제작",
    window: "03.25 - 04.08",
    state: "upcoming",
    progress: 20,
    note: "문의 폼, 캘린더, 다운로드, AI 챗봇, 뉴스레터 연동 예정"
  },
  {
    id: "ms-5",
    title: "QA / 오픈",
    window: "04.09 - 04.20",
    state: "upcoming",
    progress: 0,
    note: "최종 검수 후 도메인 연결 및 운영 교육 진행"
  }
];

export const initialContentRequests: ContentRequest[] = [
  {
    id: "content-1",
    title: "서비스 상세 문안",
    dueLabel: "03.18",
    owner: "빈파트너스",
    status: "requested",
    detail: "부동산 자산 컨설팅, 매각 컨설팅, 매수 의뢰 상세 설명"
  },
  {
    id: "content-2",
    title: "FAQ 초안",
    dueLabel: "03.18",
    owner: "빈파트너스",
    status: "requested",
    detail: "자주 묻는 질문 5~8개와 1차 답변 문안"
  },
  {
    id: "content-3",
    title: "대표 소개 및 경력",
    dueLabel: "03.14",
    owner: "빈파트너스",
    status: "approved",
    detail: "브랜드 스토리 섹션용 대표 경력, 핵심 이력, 사진"
  },
  {
    id: "content-4",
    title: "프로젝트 사례 자료",
    dueLabel: "03.17",
    owner: "빈파트너스",
    status: "submitted",
    detail: "진행 중/완료 프로젝트 카드에 사용할 이미지와 설명"
  }
];

export const projectUpdates: ProjectUpdate[] = [
  {
    id: "update-1",
    title: "메인 화면 정보 구조를 확정했습니다.",
    dateLabel: "03.11 16:40",
    summary:
      "브랜드 소개, 핵심 서비스, 대표 경력, 프로젝트 카드, 문의/예약 CTA 중심으로 메인 레이아웃을 정리했습니다.",
    actionLabel: "서비스 상세 문안만 전달되면 시안 고도화가 가능합니다.",
    tone: "progress"
  },
  {
    id: "update-2",
    title: "다운로드 리드 캡처 흐름을 제안했습니다.",
    dateLabel: "03.11 11:20",
    summary:
      "자료 다운로드 전에 이메일을 수집하고, 뉴스레터 플랫폼으로 연동하는 기본 플로우를 정의했습니다.",
    tone: "stable"
  },
  {
    id: "update-3",
    title: "AI 챗봇 초기 운영 범위를 설정했습니다.",
    dateLabel: "03.10 18:10",
    summary: "3개월 운영비 부담 범위와 이후 비용 전환 시점을 포털에서 추적하도록 설계했습니다.",
    tone: "stable"
  }
];

export const initialApprovals: ApprovalItem[] = [
  {
    id: "approval-1",
    title: "메인 구조 및 정보 계층 v1.2",
    version: "v1.2",
    dueLabel: "03.22",
    detail: "히어로 카피, 서비스 카드 구조, 프로젝트 리스트 위치, CTA 배치",
    status: "pending"
  },
  {
    id: "approval-2",
    title: "대표 소개 섹션 톤앤매너",
    version: "v1.0",
    dueLabel: "03.20",
    detail: "대표 경력 강조 방식과 신뢰도 중심 레이아웃",
    status: "approved"
  }
];

export const initialMessages: ConversationMessage[] = [
  {
    id: "msg-1",
    author: "RE:BRANDB PM",
    actor: "agency",
    body: "프로젝트 카드 섹션은 진행 중/완료 프로젝트를 나눠서 보여드리는 방향으로 정리했습니다.",
    timeLabel: "03.11 16:52"
  },
  {
    id: "msg-2",
    author: "빈파트너스",
    actor: "client",
    body: "좋습니다. 사례 카드 안에 지역과 자산 유형도 함께 표기되면 좋겠습니다.",
    timeLabel: "03.11 17:10"
  },
  {
    id: "msg-3",
    author: "RE:BRANDB PM",
    actor: "agency",
    body: "반영하겠습니다. FAQ 초안 전달 주시면 문의 전환 흐름까지 같이 다듬겠습니다.",
    timeLabel: "03.11 17:21"
  }
];

export const integrations: IntegrationItem[] = [
  {
    id: "integration-1",
    name: "Framer Hosting",
    billingOwner: "RE:BRANDB 선납",
    statusLabel: "오픈 후 3개월 유지",
    transferLabel: "2026.07 전환 예정",
    detail: "오픈 안정화 후 빈파트너스로 결제 주체 전환"
  },
  {
    id: "integration-2",
    name: "AI Chatbot",
    billingOwner: "RE:BRANDB 운영",
    statusLabel: "초기 세팅 진행",
    transferLabel: "2026.07 협의",
    detail: "3개월 운영비 부담 후 성능/비용 기준으로 협의"
  },
  {
    id: "integration-3",
    name: "Newsletter Platform",
    billingOwner: "빈파트너스 부담",
    statusLabel: "초기 세팅 예정",
    transferLabel: "초기 오픈 시 즉시 적용",
    detail: "리드 캡처와 다운로드 흐름에 연동"
  },
  {
    id: "integration-4",
    name: "Booking Calendar",
    billingOwner: "빈파트너스 부담",
    statusLabel: "연동 구조 설계 완료",
    transferLabel: "오픈 직후 교육",
    detail: "문의하기와 예약하기를 명확히 분리"
  }
];

export const changeItems: ChangeItem[] = [
  {
    id: "change-1",
    title: "프로젝트 카드에 지역/자산 유형 노출",
    scope: "계약 범위 포함",
    detail: "현재 프로젝트 리스트 구조 내 UI 조정으로 처리 가능",
    statusLabel: "반영 예정"
  },
  {
    id: "change-2",
    title: "블로그 섹션 내 검색 기능 추가",
    scope: "추가 기능 가능성",
    detail: "CMS 구조에 따라 별도 범위로 분리될 수 있어 검토 필요",
    statusLabel: "검토 중"
  }
];

export const adminRisks: RiskItem[] = [
  {
    id: "risk-1",
    title: "서비스 상세 문안 지연",
    detail: "03.18까지 수급되지 않으면 시안 고도화 일정이 밀릴 수 있음",
    severity: "high"
  },
  {
    id: "risk-2",
    title: "뉴스레터 운영 책임 범위 명확화 필요",
    detail: "초기 세팅 이후 월 운영 주체와 KPI 합의 필요",
    severity: "medium"
  },
  {
    id: "risk-3",
    title: "AI 챗봇 비용 전환 안내 시점 설계",
    detail: "3개월 후 비용 전환 고지 일정이 필요",
    severity: "low"
  }
];
