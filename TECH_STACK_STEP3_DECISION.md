# 실행학교 챗봇 기술 스택 확정안 (Step 3)

## 1. 최종 선택 스택
- Frontend(위젯/어드민): `Next.js 14 (React + TypeScript)`
- 스타일: `Tailwind CSS` (+ CSS Variables)
- Backend API: `NestJS (Node.js + TypeScript)`
- RDB: `PostgreSQL 16`
- ORM: `Prisma`
- Vector DB: `Qdrant`
- Queue/Background Job: `BullMQ + Redis`
- Object Storage: `S3 Compatible` (AWS S3, Cloudflare R2 대체 가능)
- 인증: `NextAuth(Auth.js)` + Google OAuth + Admin Credentials
- 이메일 발송: `AWS SES` (대체: Resend)
- 관측/로그: `Sentry` + 구조화 로그(JSON)
- 배포:
  - Web(Admin + Widget host): `Vercel`
  - API/Worker/Qdrant/Redis/Postgres: `AWS (ECS or EC2)`

## 2. 선택 근거
- Next.js: 위젯 랜딩/어드민/설정 페이지를 한 프론트로 운영 가능
- NestJS: 모듈 분리(Auth, Chat, Ingest, Ticket)와 확장성 우수
- Postgres + Prisma: 운영 표준, 마이그레이션 안정성
- Qdrant: RAG에 필요한 벡터 검색 기능 충분, 비용/운영 난이도 균형
- BullMQ: 문서 인덱싱/크롤링/이메일 발송 같은 비동기 작업 처리에 적합

## 3. 시스템 컴포넌트
- `web-app`:
  - 관리자 UI
  - 위젯 설정 페이지
  - 임베드 스크립트 배포 엔드포인트
- `api-server`:
  - `/chat` 질의 처리
  - `/ingest` 지식 업로드/인덱싱
  - `/tickets` 문의 처리
  - `/admin` 설정 관리
- `worker`:
  - URL 크롤링
  - 파일 파싱
  - 임베딩 생성
  - 벡터 업서트
- `datastores`:
  - Postgres
  - Redis
  - Qdrant
  - S3

## 4. LLM 연동 표준
- Provider Adapter 패턴 적용
- 공통 인터페이스:
  - `generateAnswer(query, context, systemPrompt, model)`
  - `embedText(text)`
- 지원 Provider:
  - OpenAI (기본)
  - Gemini
  - Claude
- 키 관리:
  - Provider별 API Key는 서버 암호화 저장
  - 키 접근은 어드민 권한으로만 허용

## 5. 임베드 전략
- 제공 파일:
  - `https://chat.runacademy.online/widget.js`
- 초기화:
  - `window.RunAcademyChat.init({ siteId, theme, position })`
- 구현 원칙:
  - Shadow DOM 사용으로 Podia CSS 충돌 최소화
  - 위젯 오픈 전에는 최소 코드만 로딩

## 6. 데이터 모델(확정)
- `admins`
- `chat_sessions`
- `chat_messages`
- `knowledge_sources`
- `knowledge_chunks`
- `prompt_settings`
- `inquiry_tickets`
- `ticket_replies`
- `audit_logs`

## 7. 비기능 요구사항
- 성능:
  - 첫 로드(FAB): 50KB gzip 이하 목표
  - 첫 응답 시간: 2~5초(캐시/컨텍스트 양에 따라)
- 보안:
  - 업로드 파일 MIME/용량 제한
  - 관리자 MFA(2단계) 옵션 준비
  - 민감정보 마스킹 로그
- 운영:
  - 장애 알림(Sentry + Slack webhook)
  - 인덱싱 실패 재시도(최대 3회)

## 8. 단계별 구현 고정안
- Phase 1 (MVP):
  - OpenAI 단일 모델
  - URL 1개 + 문서 업로드 + 텍스트 입력
  - 기본 RAG + 문의 티켓 + 관리자 히스토리
- Phase 2:
  - Gemini/Claude 추가
  - 고급 통계(해결률, 재문의율)
  - 프롬프트 버전 관리
- Phase 3:
  - 자동 라우팅(질문 유형별 모델 선택)
  - 개인화 추천 답변

## 9. 환경변수 목록 (초안)
- `DATABASE_URL`
- `REDIS_URL`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`
- `ENCRYPTION_KEY`
