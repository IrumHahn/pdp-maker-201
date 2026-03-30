# 실행학교 챗봇 UI/UX 시안 (Step 2)

## 1. 디자인 방향
- 톤: 신뢰감 + 실무형 + 학습 플랫폼 친화
- 키워드: clean, modern, lightweight, confident
- 참고 패턴: Zendesk/Chatbase 스타일의 하단 우측 위젯

## 2. 디자인 토큰
- Primary: `#1F6F5C`
- Primary Soft: `#E7F4F0`
- Accent: `#F2B35D`
- Ink: `#182026`
- Muted: `#5B6672`
- Surface: `#FFFFFF`
- Background: `#F6F8F9`
- Border: `#DCE3E8`
- Font: `Pretendard`, `sans-serif`

## 3. 고객용 위젯 시안
- 위치: 우측 하단 고정
- FAB(챗 아이콘): 원형 60px, 그림자 강조
- 채팅창: 380x620 (모바일: 가로 100%, 세로 100dvh)
- 구조:
  - Header: 봇 이름, 상태, 닫기 버튼
  - Message Area: 사용자/봇 버블, 추천 질문 칩
  - Composer: 입력창, 전송 버튼
  - Fallback: "답변이 어려워요" 문의 폼 CTA
- 인터랙션:
  - FAB 클릭 시 슬라이드-업
  - 답변 로딩 도트 애니메이션
  - 추천 질문 클릭 시 자동 입력

## 4. 어드민 시안
- 좌측 사이드바 + 우측 콘텐츠 2열
- 핵심 메뉴:
  - 대시보드
  - 상담 히스토리
  - 지식 학습(URL/문서/텍스트)
  - 문의 티켓
  - 모델/프롬프트 설정
- 주요 패널:
  - 모델 셀렉터(OpenAI/Gemini/Claude)
  - 시스템 프롬프트 편집기
  - 학습 소스 업로드 카드
  - 티켓 처리 보드(Open, In Progress, Answered)

## 5. 임베디드 고려사항
- Podia 페이지 삽입용 스크립트 1줄 + init config
- 스타일 충돌 방지:
  - 위젯 DOM 루트에 독립 네임스페이스
  - 가능하면 Shadow DOM 사용
- 성능:
  - 최초 로딩 경량화(아이콘만 선로딩)
  - 채팅창 오픈 시 상세 리소스 로딩

## 6. 반응형 기준
- Desktop: 위젯 380px
- Tablet: 위젯 360px
- Mobile: 풀스크린 모달형

## 7. 접근성 체크
- 키보드 탭 이동 가능
- 색상 대비 WCAG AA 이상
- 버튼/입력 aria-label 제공
- 텍스트 확대(브라우저 125%)에서도 레이아웃 유지
