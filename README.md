# RunAcademy Chatbot Monorepo

Step 5 scaffold for Execution School chatbot platform.

## Workspace
- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/shared`

## Start
```bash
pnpm install
pnpm dev
```

## Per App Dev
```bash
pnpm --filter @runacademy/web dev
pnpm --filter @runacademy/api dev
pnpm --filter @runacademy/worker dev
```

## Services (planned)
- Web: `http://localhost:3000`
- API: `http://localhost:4000/v1/health`

## Docs
- `EXECUTION_SCHOOL_CHATBOT_SPEC.md`
- `MVP_STEP4_SCOPE.md`
- `STEP5_IMPLEMENTATION.md`
- `STEP6_BACKEND_SCAFFOLD.md`
- `docs/EMBED_GUIDE.md`
