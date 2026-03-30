# 실행학교 온라인 상담 AI 챗봇 시스템 기획/설계 (v0.3)

## 1. 목표 요약
- 실행학교(https://www.runacademy.online/)에 임베디드 가능한 상담용 AI 챗봇 위젯 구축
- Zendesk/Chatbase 스타일의 모던 UI, 우측 하단 플로팅 아이콘 → 채팅창
- AI 기본 상담 + 다중 LLM(OpenAI, Gemini, Claude) 선택
- 상담 지식 학습(웹 URL, 문서 업로드, 텍스트 입력) + 벡터 DB 기반 검색
- 답변 성향 프롬프트(관리자 모드에서 설정)
- 답변 불가 시 폼으로 문의 접수 → 어드민에서 처리, 이메일 발송
- 상담 히스토리 조회(관리자)

## 2. 핵심 기능 요구사항
### 2.1 위젯 (고객용)
- 우측 하단 플로팅 버튼 + 모달/드로어형 채팅창
- 대화 UI: 타이핑 인디케이터, 답변 스트리밍, 재질문 유도
- 답변 불가/불확실 시 문의 폼 노출
- 파일 업로드, 링크 공유(옵션)
- 다국어 확장 가능 구조(우선 한국어)

### 2.2 어드민 (운영자용)
- **모델 설정**: OpenAI / Gemini / Claude 선택 및 API Key 관리
- **프롬프트 설정**: 답변 톤/성향, 금칙어, 학습 범위 안내
- **학습 관리**:
  - URL 크롤링 등록
  - 문서 업로드(doc, xls, pdf, txt 등)
  - 텍스트 직접 입력
- **지식 업데이트**: 인덱싱 상태, 실패 로그, 재시도
- **상담 히스토리**: 대화 목록/상세, 태그, 담당자 메모
- **문의 폼 관리**: 접수 목록, 상태 변경, 이메일 발송 기록

### 2.3 임베디드 코드 제공
- Podea 페이지에 넣을 JS 스니펫 제공
- 고객이 사이트에 삽입하면 즉시 위젯 표시

## 3. 사용자 플로우
### 3.1 고객 플로우
1. 플로팅 아이콘 클릭
2. 챗 UI 등장
3. 사용자 질문 입력
4. AI 답변(벡터 검색 + LLM)
5. 답변 불가 → 문의 폼 제출

### 3.2 관리자 플로우
1. 어드민 로그인
2. 프롬프트 및 모델 설정
3. 학습 데이터 등록(문서, URL, 텍스트)
4. 인덱싱 완료 후 챗봇이 반영
5. 문의 폼 확인 후 이메일 응답

## 4. 시스템 아키텍처
```
[Browser Widget]
   │
   ├─ Embed JS → Widget UI
   │
   ▼
[API Gateway / Backend]
   │   ├─ Auth (Admin)
   │   ├─ Chat Orchestrator
   │   ├─ Knowledge Ingest Pipeline
   │   ├─ Ticket/Inquiry Service
   │   └─ Analytics/Logs
   ▼
[Vector DB]  [Relational DB]
   │            │
   │            └─ Users, Sessions, Tickets, Prompts
   │
   ▼
[LLM Providers]
(OpenAI / Gemini / Claude)
```

## 5. 데이터 구조 (초안)
### 5.1 주요 엔티티
- `ChatSession`
  - id, user_id, created_at
- `ChatMessage`
  - id, session_id, role(user/assistant/system), content, created_at
- `KnowledgeSource`
  - id, type(url|doc|text), title, status, metadata
- `KnowledgeChunk`
  - id, source_id, content, embedding_vector_id
- `PromptSetting`
  - id, name, prompt_text, active
- `InquiryTicket`
  - id, name, email, message, status(open/answered), created_at

## 6. 학습(인덱싱) 파이프라인
1. 문서/URL/텍스트 입력
2. 텍스트 추출 및 정제
3. Chunking (예: 500~1000 토큰 단위)
4. Embedding 생성
5. Vector DB 저장

## 7. 챗 응답 프로세스
1. 사용자 입력 → 검색 쿼리 생성
2. Vector DB 검색 (Top-K)
3. 프롬프트 + 검색 컨텍스트 → LLM 호출
4. 답변 출력
5. 결과 불충분 시 문의 폼 안내

## 8. 디자인 방향 (모던 트렌드)
- Rounded corner, subtle shadow, glassmorphism 가능
- 다크/라이트 테마 옵션
- 버튼: Primary 색상은 실행학교 브랜드 톤 맞춤
- 위젯 크기: 360~420px 너비, 모바일 대응

## 9. 임베디드 JS 스니펫 (예시)
```html
<script>
(function() {
  var s = document.createElement('script');
  s.src = "https://chat.runacademy.online/widget.js";
  s.async = true;
  s.onload = function() {
    window.RunAcademyChat.init({
      siteId: "RUNACADEMY",
      theme: "light",
      position: "bottom-right"
    });
  };
  document.body.appendChild(s);
})();
</script>
```

## 10. 기술 스택 확정
- Frontend(위젯/어드민): `Next.js 14 (React + TypeScript)` + `Tailwind CSS`
- Backend API: `NestJS (Node.js + TypeScript)`
- RDB: `PostgreSQL 16` + `Prisma`
- Vector DB: `Qdrant`
- Queue: `BullMQ + Redis`
- File Storage: `S3 compatible`
- Auth: `NextAuth(Auth.js)` + Google OAuth + Admin Credentials
- Hosting:
  - Web: `Vercel`
  - API/Worker/DB: `AWS`

## 11. MVP 범위 확정
- 상세 문서 기준: `/Users/irun_hahn/Documents/New project/MVP_STEP4_SCOPE.md`
- 핵심 고정 범위:
  - 위젯 UI + 임베디드 코드
  - OpenAI 단일 모델 기반 RAG
  - URL/문서/텍스트 학습
  - 문의 티켓 + 관리자 히스토리 + 이메일 답변

## 13. 요구사항 확정안 (1차)
### 13.1 확정값
- 기본 언어: 한국어(`ko-KR`)
- 기본 LLM: OpenAI(`gpt-4o-mini`)를 기본 모델로 사용
- 멀티 모델 옵션: OpenAI / Gemini / Claude를 어드민에서 전환 가능
- 인증 방식(1차): 이메일/비밀번호(Admin) + 비밀번호 재설정 이메일
- 인증 방식(2차): Google OAuth/SSO 추가(선택)
- 데이터 저장:
  - 대화 원문/문의 이력: Postgres
  - 임베딩/검색: Vector DB
  - 업로드 파일: Object Storage(S3 compatible)
- 대화 기록 보존 기본값: 24개월
- 문의 처리 기본 프로세스: 어드민 확인 -> 답변 작성 -> 이메일 발송 -> 상태 `answered`

### 13.2 브랜드/디자인 확정 규칙
- 기본 테마: 라이트 테마 우선, 다크는 옵션 제공
- 위젯 레이아웃: 하단 우측 고정, 너비 380px(모바일 100%)
- 디자인 톤: 깔끔한 카드형, 라운드(14~16px), 약한 그림자, 고대비 텍스트
- 브랜드 컬러 적용 방법:
  - `Primary`: 실행학교 대표 색상
  - `Neutral`: 회색 스케일(가독성 중심)
  - `Accent`: CTA/알림 색상

### 13.3 운영 정책 확정
- 답변 생성 정책: RAG(검색 컨텍스트 우선) + 모델 생성
- 무응답 정책: 신뢰도/근거 부족 시 바로 문의 폼 전환
- 로그 정책: 관리자 액션 로그(설정 변경, 데이터 인덱싱, 티켓 처리) 저장
- 보안 정책:
  - API Key는 서버 암호화 저장
  - 위젯에는 키 노출 금지
  - 업로드 파일 MIME/크기 제한 및 바이러스 스캔 훅 제공

## 14. 승인 완료 항목 (히스토리)
- 브랜드 `Primary` 색상: 승인 완료
- 브랜드 기본 폰트: 승인 완료
- 어드민 로그인 방식: 승인 완료
- 대화 기록 보존 기간: 승인 완료

## 15. 최종 확정값 (사용자 승인)
- 브랜드 `Primary` 색상: `#1F6F5C` (실행학교 로고 톤 기준)
- 기본 폰트: `Pretendard`
- 어드민 로그인 방식: `B`안 (이메일/비밀번호 + Google 로그인)
- 대화 기록 보존 기간: `B`안 (24개월)

## 16. Step 2 산출물 (UI/UX)
- UI/UX 시안 문서: `/Users/irun_hahn/Documents/New project/UIUX_STEP2_SPEC.md`
- 실행형 시안 HTML: `/Users/irun_hahn/Documents/New project/mockups/runacademy-chatbot-uiux-preview.html`

## 17. Step 3 산출물 (기술 스택 확정)
- 기술 스택 확정 문서: `/Users/irun_hahn/Documents/New project/TECH_STACK_STEP3_DECISION.md`

## 18. Step 4 산출물 (MVP 범위 고정)
- MVP 범위 고정 문서: `/Users/irun_hahn/Documents/New project/MVP_STEP4_SCOPE.md`

## 19. Step 5 산출물 (코드베이스 초기 구축)
- Step 5 구현 문서: `/Users/irun_hahn/Documents/New project/STEP5_IMPLEMENTATION.md`
- 루트 모노레포 설정:
  - `/Users/irun_hahn/Documents/New project/package.json`
  - `/Users/irun_hahn/Documents/New project/pnpm-workspace.yaml`
  - `/Users/irun_hahn/Documents/New project/tsconfig.base.json`
- 앱 구조:
  - `/Users/irun_hahn/Documents/New project/apps/web`
  - `/Users/irun_hahn/Documents/New project/apps/api`
  - `/Users/irun_hahn/Documents/New project/apps/worker`
  - `/Users/irun_hahn/Documents/New project/packages/shared`

## 20. Step 6 산출물 (백엔드 API 골격)
- Step 6 구현 문서: `/Users/irun_hahn/Documents/New project/STEP6_BACKEND_SCAFFOLD.md`
- API 라우트 골격:
  - `/Users/irun_hahn/Documents/New project/apps/api/src/modules/chat/chat.controller.ts`
  - `/Users/irun_hahn/Documents/New project/apps/api/src/modules/admin`
- Prisma 스키마 초안:
  - `/Users/irun_hahn/Documents/New project/apps/api/prisma/schema.prisma`

## 21. Step 7 산출물 (웹/위젯 UI 고도화)
- Step 7 구현 문서: `/Users/irun_hahn/Documents/New project/STEP7_WEB_WIDGET_UI.md`
- 웹 어드민 대시보드 스캐폴드:
  - `/Users/irun_hahn/Documents/New project/apps/web/app/page.tsx`
- Shadow DOM 위젯 스캐폴드:
  - `/Users/irun_hahn/Documents/New project/apps/web/public/widget.js`
- 임베드 가이드:
  - `/Users/irun_hahn/Documents/New project/docs/EMBED_GUIDE.md`
