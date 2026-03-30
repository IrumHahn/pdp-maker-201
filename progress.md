Original prompt: 한이룸의 QR코드 체크인 페이지를 만들어줘.

- 2026-03-21: `apps/web`에 한이룸 체크인 전용 라우트를 추가하는 방향으로 결정. 기존 루트 포털 화면은 유지.
- 구현 예정 범위: 구글 시트 참석자 조회/출석 업데이트 API, TV용 대형 QR 화면, 모바일 이름 입력 페이지, 캔버스 기반 캐릭터 씬, 실시간 입장 피드.
- 메모: 구글 시트 인증 정보가 아직 없으므로 서비스 계정 기반 env 예시와 데모 fallback을 함께 제공하는 편이 안전함.
- 2026-03-21: `/hanirum` TV 화면, `/hanirum/join` 모바일 입력 화면, `/api/hanirum/*` API 라우트 구현 완료.
- 2026-03-21: 캔버스 씬에 2층 로비 뷰, 이름 라벨, 저녁 참석 배지, 악수/인사 제스처, `render_game_to_text` 훅 추가.
- 2026-03-21: `pnpm --filter @runacademy/web typecheck`, `pnpm --filter @runacademy/web build` 통과. Playwright로 TV 화면과 모바일 입력 페이지 스크린샷 확인.
- 다음 운영 단계: `.env`에 `GOOGLE_SHEETS_*` 값 입력 후 서비스 계정 메일을 스프레드시트 편집자로 공유해야 실제 체크인이 반영됨.
