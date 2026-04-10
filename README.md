# Hanirum PDP Maker 20

한이룸의 상세페이지 마법사와 이미지 편집 실험을 모아둔 전용 프로젝트입니다.
소싱 워크스페이스와 트렌드 수집 콘솔은 이 저장소가 아니라 `../sourcing-maker-10`에서 운영합니다.

## What Lives Here
- `apps/web`: 상세페이지 마법사 UI와 관련 실험 화면
- `apps/api`: 상세페이지 생성에 필요한 API
- `packages/shared`: PDP 관련 공용 타입

## Start
```bash
pnpm install
pnpm --filter @runacademy/web dev
pnpm --filter @runacademy/api dev
```

## Main Routes
- Home: `http://localhost:3000/`
- PDP maker: `http://localhost:3000/pdp-maker`
- API health: `http://127.0.0.1:4000/v1/health`

## Notes
- 루트 `/`는 상세페이지 마법사 전용 홈 화면입니다.
- 소싱 관련 작업은 `sourcing-maker-10`에서 진행하세요.
- 예전 실험 라우트가 일부 남아 있어도 현재 주 진입점은 `/pdp-maker`입니다.

## Repo Strategy
- 이 폴더 하나만 소스 오브 트루스로 사용합니다.
- `origin`은 GitHub `pdp-maker-202`를 가리키며, Vercel 배포 기준 저장소입니다.
- `local201`은 GitHub `pdp-maker-201`를 가리키며, 로컬 사용자용 동기화 저장소입니다.
- 기능 수정은 항상 이 저장소에서 한 번만 하고, 같은 커밋을 `202`와 `201`에 함께 반영합니다.

## Push Workflow
```bash
git add .
git commit -m "Your change"
pnpm run push:all
```

- `pnpm run push:all`은 `origin(202)`과 `local201(201)`에 같은 브랜치를 차례대로 push합니다.
- 웹 배포는 `202` 기준으로만 진행합니다.
