# 실행학교 챗봇 MVP 범위 고정안 (Step 4)

## 1. MVP 목표
- Podia 페이지에 임베드 가능한 상담 챗봇을 실제 운영 가능한 상태로 출시
- RAG 기반 기본 상담 + 답변 불가 시 문의 티켓 전환
- 운영자가 학습 데이터/프롬프트/히스토리를 관리 가능

## 2. MVP 포함 범위 (In Scope)
- 고객 위젯
  - 하단 우측 FAB + 채팅창
  - 대화 입력/응답 표시
  - 답변 불가 시 문의 폼 노출
- 임베드
  - `widget.js` 배포
  - `RunAcademyChat.init()` 초기화 옵션
- AI/RAG
  - OpenAI 단일 모델(`gpt-4o-mini`)
  - URL 1개 이상 인덱싱
  - 문서 업로드 인덱싱(pdf, docx, xlsx, txt)
  - 텍스트 직접 입력 인덱싱
  - Qdrant Top-K 검색 + 프롬프트 결합 응답
- 관리자
  - 로그인(이메일/비밀번호 + Google)
  - 모델 설정(OpenAI만 활성)
  - 시스템 프롬프트 편집
  - 학습 소스 등록/재인덱싱
  - 상담 히스토리 조회
  - 문의 티켓 조회/상태 변경/이메일 답변 발송
- 운영
  - 감사 로그(설정 변경/인덱싱/티켓 처리)
  - 에러 로깅(Sentry)

## 3. MVP 제외 범위 (Out of Scope)
- Gemini/Claude 실제 호출
- 자동 모델 라우팅
- 고급 분석 대시보드(해결률, 재문의율 추세)
- 멀티테넌시(복수 사이트 운영)
- 고객 계정 로그인/마이페이지
- 실시간 상담원 라이브챗
- 음성/이미지 멀티모달

## 4. 기능 완료 기준 (Definition of Done)
- 위젯
  - Podia 페이지에 삽입 시 정상 로드
  - 모바일에서 풀스크린 채팅창 동작
- 챗
  - 학습 데이터가 있을 때 근거 기반 답변 생성
  - 근거 부족 시 문의 폼 제안 문구 노출
- 인덱싱
  - URL/문서/텍스트 각각 최소 1건 성공
  - 실패 시 재시도 및 상태 표시
- 티켓
  - 문의 접수 -> 어드민 조회 -> 이메일 발송 -> `answered` 전환
- 보안
  - API 키 클라이언트 노출 없음
  - 업로드 파일 타입/용량 검증

## 5. API 범위 고정 (MVP)
- Public
  - `POST /v1/chat/messages`
  - `POST /v1/chat/inquiries`
- Admin Auth
  - `POST /v1/admin/auth/login`
  - `GET /v1/admin/auth/me`
- Admin Knowledge
  - `POST /v1/admin/knowledge/url`
  - `POST /v1/admin/knowledge/file`
  - `POST /v1/admin/knowledge/text`
  - `POST /v1/admin/knowledge/:id/reindex`
  - `GET /v1/admin/knowledge`
- Admin Prompt/Model
  - `GET /v1/admin/settings`
  - `PUT /v1/admin/settings/prompt`
  - `PUT /v1/admin/settings/model`
- Admin History/Ticket
  - `GET /v1/admin/chats`
  - `GET /v1/admin/chats/:id`
  - `GET /v1/admin/tickets`
  - `PATCH /v1/admin/tickets/:id`
  - `POST /v1/admin/tickets/:id/reply`

## 6. 데이터 스키마 우선순위
- P0: `admins`, `chat_sessions`, `chat_messages`, `knowledge_sources`, `knowledge_chunks`, `prompt_settings`, `inquiry_tickets`
- P1: `ticket_replies`, `audit_logs`

## 7. 일정 고정안 (4주)
- Week 1
  - 프로젝트 초기 세팅(Next/Nest/DB/Qdrant/Redis)
  - 인증/어드민 골격
- Week 2
  - 인덱싱 파이프라인(URL/문서/텍스트)
  - RAG 챗 API
- Week 3
  - 위젯 UI + 임베드 스크립트
  - 티켓 플로우 + 이메일 발송
- Week 4
  - QA/보안 점검/배포
  - Podia 실제 삽입 검증

## 8. 출시 체크리스트
- 필수 환경변수 세팅 완료
- 운영 도메인 연결(`chat.runacademy.online`)
- 관리자 계정 2개 이상 생성
- 지식 데이터 최소 20개 chunk 이상 인덱싱
- 테스트 시나리오 15개 통과

## 9. Step 5 예고 (다음 단계)
- MVP 범위 기준으로 실제 코드베이스 생성(모노레포)
- `apps/web`, `apps/api`, `apps/worker`, `packages/shared` 구조
