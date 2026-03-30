# Step 5 구현 결과 (모노레포 초기 구축)

## 1. 생성 구조
- `apps/web`: Next.js 기반 관리자/위젯 호스트
- `apps/api`: NestJS 기반 API 서버
- `apps/worker`: 인덱싱/비동기 작업 워커
- `packages/shared`: 공통 상수/타입

## 2. 핵심 파일
- 루트
  - `package.json`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `.env.example`
- Web
  - `apps/web/app/page.tsx`
  - `apps/web/public/widget.js`
- API
  - `apps/api/src/main.ts`
  - `apps/api/src/modules/app.controller.ts`
- Worker
  - `apps/worker/src/index.ts`
- Shared
  - `packages/shared/src/index.ts`

## 3. 확인 포인트
- `apps/web/public/widget.js`에서 `window.RunAcademyChat.init()` 제공
- API `GET /v1/health`로 기본 헬스 체크 가능
- `@runacademy/shared`를 web/api/worker 공통 참조

## 4. 다음 구현 우선순위
- API 실기능 라우트 추가
  - `/v1/chat/messages`
  - `/v1/chat/inquiries`
  - `/v1/admin/*`
- Prisma 스키마 및 DB 마이그레이션
- Qdrant/Redis 연결 및 ingest worker job 구현
- 위젯 실제 채팅 UI 및 API 연동
