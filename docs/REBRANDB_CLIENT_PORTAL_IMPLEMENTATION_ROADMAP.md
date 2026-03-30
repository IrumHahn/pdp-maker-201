# RE:BRANDB Client Portal 구현 로드맵

업데이트 일자: 2026-03-11
기준 레포: `/apps/web` + `/apps/api` + `/packages/shared`

## 1. 전제

현재 레포는 기존 챗봇 스캐폴드 기반이다.
따라서 구현은 "기존 코드를 무리하게 덮어쓰기"보다 "새 제품 구조를 점진적으로 이식"하는 방식이 안전하다.

이번 로드맵은 아래 3가지를 동시에 만족하도록 설계한다.

- 빈파트너스 프로젝트를 첫 실사용 사례로 바로 세팅
- Netlify + Hostinger VPS + Supabase + Resend 운영 구조 반영
- 현재 monorepo 구조를 최대한 재사용

## 2. 추천 아키텍처 분담

### 2.1 `apps/web`

역할:

- 관리자 포털 UI
- 클라이언트 포털 UI
- 로그인/초대/비밀번호 재설정 화면
- 실시간 상태 반영 UI

핵심 기술:

- Next.js App Router
- Supabase browser client
- 서버 액션 또는 API route는 최소화

### 2.2 `apps/api`

역할:

- 프로젝트/승인/메시지/알림 비즈니스 로직
- RBAC 검증
- Resend 이메일 발송
- 스케줄러성 작업 처리

핵심 기술:

- NestJS
- Prisma
- Supabase JWT 검증

### 2.3 `packages/shared`

역할:

- 상태 enum
- 타입
- 공통 validation schema
- 공통 UI label map

## 3. 구현 원칙

- 인증은 Supabase Auth를 기준으로 잡고, 앱 DB에는 `UserProfile`만 유지한다.
- 파일은 Supabase Storage에 저장하고 메타데이터만 Prisma로 관리한다.
- 실시간 채팅과 상태 변경은 Supabase Realtime 구독을 우선 사용한다.
- 승인 자동 만료 처리, 리마인더 메일, 하자보수 종료 알림은 API 배치 작업으로 처리한다.
- MVP에서는 복잡한 권한 정책보다 `role + project membership + visibility` 조합으로 단순하게 간다.

## 4. 단계별 구현 순서

### Phase 0. 저장소 정리

목표:

- 기존 챗봇 스캐폴드와 새 포털 작업 경계를 분리

작업:

- `apps/web/app/page.tsx`를 포털 랜딩 또는 로그인 진입점으로 교체
- `apps/api/src/modules` 아래 기존 챗봇 모듈은 유지하되 새 포털 모듈 추가 공간 확보
- 환경 변수 파일 명세 작성
- 브랜딩 문자열 `RunAcademy`, `HANIRUM LAB` 제거 범위 확인

산출물:

- 기본 라우트 구조 초안
- 환경 변수 명세 문서

완료 기준:

- 웹과 API가 새 포털 기능을 넣기 좋은 구조로 정리됨

### Phase 1. 데이터 모델/인증 기반

목표:

- 프로젝트 포털 도메인 스키마와 인증 흐름 확정

작업:

- [client-portal-mvp.prisma](/Users/irun_hahn/Documents/New%20project/apps/api/prisma/client-portal-mvp.prisma) 기준으로 실제 `schema.prisma` 병합 전략 확정
- Supabase 프로젝트 생성 또는 VPS 셀프호스트 구성
- `UserProfile`, `Organization`, `Project`, `ProjectMember`, `Contract`부터 우선 반영
- Supabase Auth 회원가입/초대 플로우 설계
- API에서 Supabase JWT 검증 미들웨어 추가

백엔드 우선 테이블:

- `UserProfile`
- `Organization`
- `OrganizationMember`
- `Project`
- `Contract`
- `ProjectMember`

프론트 우선 화면:

- 로그인
- 관리자 홈 빈 상태
- 프로젝트 생성 폼 최소 버전

완료 기준:

- 사용자 로그인 후 역할에 따라 기본 진입 화면 이동 가능
- 빈파트너스 프로젝트 1건을 DB에 생성 가능

### Phase 2. 관리자 핵심 운영 기능

목표:

- 내부에서 프로젝트를 관리할 최소 운영 화면 확보

작업:

- 관리자 프로젝트 목록
- 관리자 프로젝트 개요
- 마일스톤/태스크 CRUD
- 프로젝트 공식 업데이트 작성
- 자료 요청 CRUD

백엔드 모듈:

- `projects`
- `milestones`
- `tasks`
- `updates`
- `content-requests`

프론트 라우트:

- `/admin/overview`
- `/admin/projects`
- `/admin/projects/[projectId]/overview`
- `/admin/projects/[projectId]/timeline`
- `/admin/projects/[projectId]/tasks`
- `/admin/projects/[projectId]/updates`

완료 기준:

- 내부 매니저가 빈파트너스 프로젝트 상태를 업데이트할 수 있음
- 자료 요청 마감일을 입력하고 상태를 바꿀 수 있음

### Phase 3. 클라이언트 포털 기본 화면

목표:

- 빈파트너스가 실제로 로그인해서 진행 상황을 확인할 수 있게 함

작업:

- 클라이언트 대시보드
- 프로젝트 개요
- 프로젝트 일정
- 프로젝트 업데이트 목록
- 자료 요청 응답 화면

핵심 UI 카드:

- 현재 단계
- 전체 진척률
- 다음 액션
- 자료 제출 마감
- 다음 미팅
- 최근 업데이트

프론트 라우트:

- `/dashboard`
- `/projects/[projectId]/overview`
- `/projects/[projectId]/timeline`
- `/projects/[projectId]/updates`
- `/projects/[projectId]/tasks`

완료 기준:

- 빈파트너스 계정으로 로그인하면 자기 프로젝트만 보임
- `2026-03-18` 자료 제출 마감이 보임

### Phase 4. 파일/승인

목표:

- 계약서 기반 분쟁 포인트를 시스템에 반영

작업:

- 파일 업로드
- 파일 카테고리 분류
- 승인 요청 생성
- 승인 상태 관리
- 승인 자동 만료 처리
- 승인 리마인드 메일

백엔드 모듈:

- `files`
- `approvals`
- `notifications`

프론트 라우트:

- `/projects/[projectId]/files`
- `/projects/[projectId]/approvals`
- `/admin/projects/[projectId]/files`
- `/admin/projects/[projectId]/approvals`

완료 기준:

- 디자인 승인과 최종 검수 승인을 각각 생성 가능
- 납품 후 3영업일 미응답 시 `approved_by_timeout` 처리 가능

### Phase 5. 메시지/실시간/이메일

목표:

- 카톡 대체 커뮤니케이션 채널 확보

작업:

- 프로젝트 외부 스레드
- 내부 메모 스레드
- 메시지 읽음 상태
- 실시간 새 메시지 반영
- Resend 메일 발송

백엔드 모듈:

- `messages`
- `notifications`

프론트 라우트:

- `/projects/[projectId]/messages`
- `/admin/projects/[projectId]/messages`

완료 기준:

- 새 메시지가 들어오면 상대 사용자 화면에 즉시 표시
- 외부 메시지 작성 시 이메일 알림 발송

### Phase 6. 미팅/변경 요청/인수인계

목표:

- 실제 웹에이전시 운영 흐름 완성

작업:

- 공식 협의 3회 기본 생성
- 회의록 작성
- 변경 요청 접수/판단/견적 영향 기록
- 서드파티 연동 서비스 관리
- 하자보수 종료일 계산

백엔드 모듈:

- `meetings`
- `change-requests`
- `integrations`

프론트 라우트:

- `/projects/[projectId]/meetings`
- `/projects/[projectId]/change-requests`
- `/projects/[projectId]/handover`
- `/admin/projects/[projectId]/meetings`
- `/admin/projects/[projectId]/change-requests`
- `/admin/projects/[projectId]/integrations`

완료 기준:

- 빈파트너스 프로젝트에서 Framer, AI 챗봇, 뉴스레터, 캘린더 전환 시점을 기록 가능
- 변경 요청이 `계약 포함`, `유지보수`, `신규 범위`로 분류됨

### Phase 7. 운영 안정화/배포

목표:

- 라이브 서비스 상태로 배포

작업:

- Netlify 배포 설정
- API VPS 배포 설정
- Supabase 백업 정책
- Resend 도메인 검증
- Sentry 또는 기본 로깅 추가
- 관리자 계정 초기화

완료 기준:

- 웹과 API가 프로덕션 URL에서 연결됨
- 초대 메일, 비밀번호 재설정 메일, 알림 메일이 발송됨

## 5. 폴더 구조 제안

### 5.1 프론트엔드

```text
apps/web/app
|-- (public)
|   |-- login/page.tsx
|   |-- forgot-password/page.tsx
|   `-- reset-password/page.tsx
|-- (portal)
|   |-- dashboard/page.tsx
|   `-- projects/[projectId]/
|       |-- overview/page.tsx
|       |-- timeline/page.tsx
|       |-- tasks/page.tsx
|       |-- updates/page.tsx
|       |-- files/page.tsx
|       |-- approvals/page.tsx
|       |-- messages/page.tsx
|       |-- meetings/page.tsx
|       |-- change-requests/page.tsx
|       `-- handover/page.tsx
`-- (admin)
    `-- admin/
        |-- overview/page.tsx
        |-- projects/page.tsx
        |-- projects/new/page.tsx
        |-- projects/[projectId]/
        |-- clients/page.tsx
        |-- users/page.tsx
        |-- templates/page.tsx
        |-- activity/page.tsx
        `-- settings/page.tsx
```

추가 권장 디렉터리:

- `apps/web/components/portal`
- `apps/web/components/admin`
- `apps/web/lib/supabase`
- `apps/web/lib/api`
- `apps/web/lib/auth`

### 5.2 백엔드

```text
apps/api/src/modules
|-- auth
|-- organizations
|-- projects
|-- contracts
|-- milestones
|-- tasks
|-- updates
|-- files
|-- approvals
|-- content-requests
|-- meetings
|-- messages
|-- change-requests
|-- integrations
|-- notifications
`-- admin
```

추가 권장 디렉터리:

- `apps/api/src/common/guards`
- `apps/api/src/common/interceptors`
- `apps/api/src/common/decorators`
- `apps/api/src/integrations/resend`
- `apps/api/src/integrations/supabase`

## 6. 환경 변수 초안

### 6.1 공통

- `DATABASE_URL`
- `DIRECT_URL`

### 6.2 웹

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`

### 6.3 API

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_BASE_URL`

## 7. 빈파트너스 초기 시드 데이터 순서

### 7.1 조직/사용자

- RE:BRANDB agency organization 생성
- 빈파트너스 client organization 생성
- 내부 오너 계정 생성
- 내부 매니저 계정 생성
- 빈파트너스 클라이언트 관리자 계정 생성

### 7.2 프로젝트

- 코드: `BIN-2026-WEB-01`
- 슬러그: `binpartners-corporate-site`
- 계약 시작일: `2026-03-09`
- 계약 종료일: `2026-04-20`
- 자료 제출 마감일: `2026-03-18`

### 7.3 기본 마일스톤

- 계약/세팅
- 자료 수집
- 디자인 컨셉
- 기능 협의
- 제작 진행
- QA/수정
- 납품/검수
- 오픈/인수인계
- 하자보수

### 7.4 기본 연동 서비스

- Framer Hosting
- Domain
- Booking Calendar
- AI Chatbot
- Newsletter

## 8. 개발 우선순위 요약

가장 먼저 만들 것:

- 인증
- 관리자 프로젝트 생성
- 빈파트너스 시드
- 클라이언트 대시보드
- 자료 요청
- 승인

두 번째로 만들 것:

- 메시지
- 파일
- 미팅
- 변경 요청

세 번째로 만들 것:

- 인수인계
- 운영 전환
- 활동 로그
- 템플릿화

## 9. 검증 체크리스트

### 기능 검증

- 클라이언트 로그인 가능
- 자기 프로젝트만 보임
- 자료 요청 제출 가능
- 승인 요청 응답 가능
- 새 메시지 수신 가능
- 관리자 전체 프로젝트 조회 가능

### 운영 검증

- 승인 마감일 계산이 맞는가
- 이메일 템플릿이 브랜드 톤에 맞는가
- 내부 메모가 외부에 노출되지 않는가
- 변경 요청이 계약 범위와 분리되는가
- Framer/AI/뉴스레터 전환 시점이 기록되는가

### 배포 검증

- Netlify 환경 변수 정상 적용
- API와 웹 CORS 정상
- Supabase Auth 세션 정상 유지
- Resend 발송 성공

## 10. 권장 작업 방식

가장 효율적인 순서는 아래와 같다.

1. 스키마 확정
2. Supabase/Auth 연결
3. 관리자 프로젝트 생성
4. 빈파트너스 시드 입력
5. 클라이언트 대시보드
6. 자료 요청과 승인
7. 메시지와 이메일
8. 미팅/변경 요청/인수인계
9. 배포

## 11. 결론

이 로드맵대로 가면 "문서만 있는 기획"이 아니라, 빈파트너스 프로젝트를 실제로 운영할 수 있는 MVP를 만들 수 있다.

특히 초반 성공 포인트는 아래 3가지다.

- 빈파트너스 계정으로 실제 로그인되는가
- 자료 제출과 승인 요청이 카톡 밖에서 닫히는가
- 내부가 프로젝트 지연과 범위 변경을 시스템에서 통제할 수 있는가

이 3개가 되면 RE:BRANDB의 표준 클라이언트 포털로 확장할 기반이 생긴다.
