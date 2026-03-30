# 한이룸의 이커머스 제품분석 마법사

## API
- Endpoint: `POST /v1/ecommerce/analyze`
- Request JSON:
  - `url` (required)
  - `pageSnapshotText` (optional)
  - `reviewSnapshotText` (optional)

## 응답 핵심 구조
- `score.overall`: 전체 점수
- `score.label`: 
  - 80점 이상: `경쟁력 있음` (파란색)
  - 60점 이상: `판매는 되지만 개선 필요`
  - 40점 이상: `개선 필요`
  - 40점 미만: `판매 의미 없음`
- `report`:
  - `overallSummary`
  - `marketPositionAndCompetitiveness`
  - `priceCompetitiveness`
  - `detailPageAnalysis`
  - `reviewAnalysis`
  - `newProductProposal`

## 차단 대응 전략
쿠팡/스마트스토어는 서버 직접 수집이 차단될 수 있습니다. 우회 크롤링 대신 아래 순서로 처리합니다.

1. URL 직접 수집 시도
2. 실패하면 `COLLECTION_BLOCKED` 반환
3. 사용자가 브라우저에서 확보한 텍스트(`pageSnapshotText`, `reviewSnapshotText`)를 붙여넣어 재분석

이 방식은 정책 위반 가능성이 있는 우회 로직 없이도 실무에서 재현 가능한 분석 파이프라인을 유지하기 위한 설계입니다.

## 실행
```bash
pnpm --filter @runacademy/api dev
pnpm --filter @runacademy/web dev
```

웹에서 기본 API 주소는 `http://127.0.0.1:4000/v1`입니다.
필요하면 `NEXT_PUBLIC_API_BASE_URL` 환경변수로 변경할 수 있습니다.
