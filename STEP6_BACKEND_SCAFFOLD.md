# Step 6 구현 결과 (백엔드 MVP API 골격)

## 1. 추가된 라우트
- Public
  - `POST /v1/chat/messages`
  - `POST /v1/chat/inquiries`
- Admin Auth
  - `POST /v1/admin/auth/login`
  - `GET /v1/admin/auth/me`
- Admin Knowledge
  - `GET /v1/admin/knowledge`
  - `POST /v1/admin/knowledge/url`
  - `POST /v1/admin/knowledge/file`
  - `POST /v1/admin/knowledge/text`
  - `POST /v1/admin/knowledge/:id/reindex`
- Admin Settings
  - `GET /v1/admin/settings`
  - `PUT /v1/admin/settings/prompt`
  - `PUT /v1/admin/settings/model`
- Admin Chats
  - `GET /v1/admin/chats`
  - `GET /v1/admin/chats/:id`
- Admin Tickets
  - `GET /v1/admin/tickets`
  - `PATCH /v1/admin/tickets/:id`
  - `POST /v1/admin/tickets/:id/reply`

## 2. 구현 파일
- `apps/api/src/modules/chat/chat.controller.ts`
- `apps/api/src/modules/admin/auth/auth.controller.ts`
- `apps/api/src/modules/admin/settings/settings.controller.ts`
- `apps/api/src/modules/admin/knowledge/knowledge.controller.ts`
- `apps/api/src/modules/admin/chats/chats.controller.ts`
- `apps/api/src/modules/admin/tickets/tickets.controller.ts`
- `apps/api/src/modules/app.module.ts`

## 3. 데이터 계층 초안
- Prisma schema 추가: `apps/api/prisma/schema.prisma`
- 포함 모델:
  - `Admin`
  - `ChatSession`
  - `ChatMessage`
  - `KnowledgeSource`
  - `KnowledgeChunk`
  - `PromptSetting`
  - `InquiryTicket`
  - `TicketReply`
  - `AuditLog`

## 4. 현재 상태
- 라우트는 스캐폴드 응답을 반환
- 실제 DB 연결, 인증 가드, 업로드 처리, RAG 검색 로직은 다음 단계에서 구현
