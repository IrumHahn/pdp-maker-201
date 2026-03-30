export const KATO_LIST_FIXTURE = `
<section id="open-list">
  <article class="tournament-card">
    <a class="title" href="https://kato.kr/openGame/0049">2026 KATO 수원 스프링 전국 동호인 테니스 대회</a>
    <div class="meta">
      <span class="group">2026 KATO랭킹 3그룹</span>
      <span class="date">2026.04.20 ~ 2026.04.21</span>
      <span class="status">대회접수중</span>
    </div>
  </article>
  <article class="tournament-card">
    <a class="title" href="https://kato.kr/openGame/0050">2026 KATO 부산 오션 비랭킹 페스티벌</a>
    <div class="meta">
      <span class="group">비랭킹 페스티벌</span>
      <span class="date">2026.05.11 ~ 2026.05.11</span>
      <span class="status">대회준비중</span>
    </div>
  </article>
</section>
`;

export const KATO_DETAIL_FIXTURES: Record<string, string> = {
  "2026 KATO 수원 스프링 전국 동호인 테니스 대회": `
    <table>
      <tr><th>장 소</th><td>수원만석공원 테니스장, 경기 수원</td></tr>
      <tr><th>주 최</th><td>수원시테니스협회</td></tr>
      <tr><th>참가비</th><td>개인복식 팀당 54,000원</td></tr>
      <tr><th>신청마감</th><td>2026.04.15 18:00</td></tr>
      <tr><th>감독관 및 문의처</th><td>운영사무국 010-1234-5678</td></tr>
      <tr><th>출전규정</th><td>개나리부, 국화부, 오픈부 / KATO 랭킹 적용</td></tr>
    </table>
  `,
  "2026 KATO 부산 오션 비랭킹 페스티벌": `
    <table>
      <tr><th>장 소</th><td>부산 사직테니스장</td></tr>
      <tr><th>주 최</th><td>부산오션클럽</td></tr>
      <tr><th>참가비</th><td>팀당 48,000원</td></tr>
      <tr><th>신청마감</th><td>2026.05.06 13:00</td></tr>
      <tr><th>감독관 및 문의처</th><td>대회본부 051-555-8899</td></tr>
      <tr><th>출전규정</th><td>전국신인부, 지역신인부 / 비랭킹</td></tr>
    </table>
  `
};

export const KTA_RANKING_FIXTURE = `
<table class="kta-list">
  <tr class="event-row">
    <td class="title"><a href="https://join.kortennis.or.kr/sportsForAll/sportsForAll.do?event=2026-mungyeong">2026 문경 오픈 생활체육 랭킹대회</a></td>
    <td class="date">2026.04.27 ~ 2026.04.28</td>
    <td class="place">문경국제소프트테니스장</td>
    <td class="status">접수중</td>
    <td class="detail">오픈부, 국화부, 개나리부 / 테니스타운 신청</td>
    <td class="fee">복식 팀당 110,000원</td>
    <td class="host">대한테니스협회, 문경시테니스협회</td>
  </tr>
  <tr class="event-row">
    <td class="title"><a href="https://join.kortennis.or.kr/sportsForAll/sportsForAll.do?event=2026-cheonan">2026 천안 챌린저 생활체육 랭킹대회</a></td>
    <td class="date">2026.05.18 ~ 2026.05.19</td>
    <td class="place">천안종합운동장 테니스코트</td>
    <td class="status">접수예정</td>
    <td class="detail">챌린저부, 개나리부 / 4.0 이상 출전 가능</td>
    <td class="fee">복식 팀당 96,000원</td>
    <td class="host">대한테니스협회, 천안시테니스협회</td>
  </tr>
</table>
`;

export const KTA_RELAY_FIXTURE = `
<section class="relay-events">
  <article class="relay-card">
    <a class="title" href="https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do?cmptEvntCd=202600001">2026 서울 테니스 랠리 비랭킹 페스티벌</a>
    <span class="date">2026.04.13 ~ 2026.04.13</span>
    <span class="place">올림픽공원 테니스경기장</span>
    <span class="status">접수중</span>
    <span class="fee">팀당 80,000원</span>
    <span class="host">대한테니스협회 생활체육본부</span>
    <div class="rules">2.0, 3.0, 4.0 등급별 복식 / 입문자와 50세 이상 참가 가능 / 비랭킹</div>
  </article>
</section>
`;

export const SPORTS_DIARY_FIXTURE = `
<section class="sd-events">
  <article class="sd-card">
    <a class="title" href="https://tennis.sportsdiary.co.kr/tennis/m_player/result/rookieTennis_info.asp?round=4">2026 SD 루키 챔피언십 4차</a>
    <span class="date">2026.04.06 ~ 2026.04.06</span>
    <span class="place">인천송도 달빛공원 국제 테니스장</span>
    <span class="status">신청중</span>
    <span class="fee">팀당 72,000원</span>
    <span class="host">스포츠다이어리</span>
    <div class="rules">여자★, 여자★★, 남자★, 남자★★, 혼합복식 / NTRP 3.0 이하 / 구력 5년 이하 / 비랭킹</div>
  </article>
  <article class="sd-card">
    <a class="title" href="https://tennis.sportsdiary.co.kr/tennis/m_player/result/rookieTennis_info.asp?round=5">2026 SD 위민 테니스 위크엔드</a>
    <span class="date">2026.04.19 ~ 2026.04.19</span>
    <span class="place">하남 미사 테니스파크</span>
    <span class="status">마감임박</span>
    <span class="fee">팀당 68,000원</span>
    <span class="host">스포츠다이어리</span>
    <div class="rules">여자복식 / 개나리부 중심 / 입상 경력 제한 / 비랭킹</div>
  </article>
</section>
`;

export const REGIONAL_MANUAL_FIXTURE = `
<section class="regional-board">
  <article class="regional-post">
    <a class="title" href="https://jbsta.com/page/dae_main.php?bo_table=schedule&wr_id=845">2026 문경 오픈 생활체육 랭킹대회</a>
    <span class="date">2026.04.27 ~ 2026.04.28</span>
    <span class="place">문경국제소프트테니스장</span>
    <span class="status">공지중</span>
    <span class="host">문경시테니스협회</span>
    <div class="rules">오픈부, 국화부, 개나리부 / 테니스타운 신청 / 참가비 공지 예정</div>
  </article>
  <article class="regional-post">
    <a class="title" href="https://www.kstf.kr/bbs/board.php?bo_table=20_1&wr_id=665">2026 한국시니어테니스연맹 전국시니어대회</a>
    <span class="date">2026.05.03 ~ 2026.05.03</span>
    <span class="place">전북 순창 실내테니스장</span>
    <span class="status">접수중</span>
    <span class="host">한국시니어테니스연맹</span>
    <div class="rules">만 60세 이상 / 시니어부 / 비랭킹 / 단식과 복식 동시 운영</div>
  </article>
</section>
`;
