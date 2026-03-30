import type { TennisDiscoveryBoard } from "@runacademy/shared";

const now = "2026-03-26T09:00:00+09:00";

export const TENNIS_FALLBACK_BOARD: TennisDiscoveryBoard = {
  generatedAt: now,
  metrics: [
    {
      id: "open",
      label: "지금 접수중",
      value: "4개",
      hint: "마감 전에 비교할 수 있는 대회"
    },
    {
      id: "beginner",
      label: "입문자 친화",
      value: "3개",
      hint: "루키, 신인, 비우승자 중심"
    },
    {
      id: "fees",
      label: "참가비 확인 완료",
      value: "5개",
      hint: "참가비 구조화 완료"
    },
    {
      id: "sources",
      label: "활성 소스",
      value: "2/5",
      hint: "라이브 응답 또는 검수 가능한 소스"
    }
  ],
  featured: [],
  tournaments: [
    {
      id: "tour-kato-suwon",
      slug: "2026-kato-수원-스프링-전국-동호인-테니스-대회",
      fingerprint: "2026-kato-수원-스프링",
      name: "2026 KATO 수원 스프링 전국 동호인 테니스 대회",
      organizer: "수원시테니스협회",
      venue: "수원만석공원 테니스장",
      contactText: "운영사무국 010-1234-5678",
      region: "경기",
      city: "수원",
      startDate: "2026-04-20",
      endDate: "2026-04-21",
      registrationClosesAt: "2026-04-15T18:00:00+09:00",
      feeText: "개인복식 팀당 54,000원",
      feeAmount: 54000,
      status: "registration_open",
      statusLabel: "접수중",
      rankingType: "ranked",
      levelTags: ["women", "ranked"],
      levelSummary: "여성 부서 운영 · 랭킹 포인트 반영",
      formatTags: ["doubles", "women_doubles"],
      formatSummary: "여성 복식 중심",
      genderSummary: "여성 부서 포함",
      rawEligibility: "개나리부, 국화부, 오픈부 / KATO 랭킹 적용",
      normalizedEligibility: "여성 부서 운영 · 랭킹 포인트 반영",
      sourceConfidence: 0.92,
      sourceUpdatedAt: now,
      sourceRefs: [
        {
          sourceId: "kato",
          sourceName: "KATO",
          pageUrl: "https://kato.kr/openList",
          detailUrl: "https://kato.kr/openGame/0049",
          registrationUrl: "https://kato.kr/openGame/0049",
          registrationRoute: "website"
        }
      ],
      registrationRoute: "website",
      registrationUrl: "https://kato.kr/openGame/0049",
      registrationHint: "KATO 원출처 페이지에서 신청",
      freshnessLabel: "2시간 전 갱신",
      notes: "신청 마감 4월 15일 18:00"
    },
    {
      id: "tour-sd-rookie",
      slug: "2026-sd-루키-챔피언십-4차",
      fingerprint: "2026-sd-루키-챔피언십-4차",
      name: "2026 SD 루키 챔피언십 4차",
      organizer: "스포츠다이어리",
      venue: "인천송도 달빛공원 국제 테니스장",
      region: "인천",
      city: "인천",
      startDate: "2026-04-06",
      endDate: "2026-04-06",
      feeText: "팀당 72,000원",
      feeAmount: 72000,
      status: "registration_open",
      statusLabel: "접수중",
      rankingType: "non_ranked",
      levelTags: ["beginner", "non_ranked"],
      levelSummary: "입문자도 검토 가능한 부서 포함 · 비랭킹 이벤트",
      formatTags: ["doubles", "mixed_doubles"],
      formatSummary: "복식 중심, 혼합복식 포함",
      genderSummary: "혼합복식 가능",
      rawEligibility: "여자★, 여자★★, 남자★, 남자★★, 혼합복식 / NTRP 3.0 이하 / 구력 5년 이하 / 비랭킹",
      normalizedEligibility: "입문자도 검토 가능한 부서 포함 · 비랭킹 이벤트",
      sourceConfidence: 0.86,
      sourceUpdatedAt: now,
      sourceRefs: [
        {
          sourceId: "sports_diary",
          sourceName: "스포츠다이어리",
          pageUrl: "https://tennis.sportsdiary.co.kr/tennis/m_player/main/index.asp",
          detailUrl: "https://tennis.sportsdiary.co.kr/tennis/m_player/result/rookieTennis_info.asp?round=4",
          registrationUrl: "https://tennis.sportsdiary.co.kr/tennis/m_player/result/rookieTennis_info.asp?round=4",
          registrationRoute: "app"
        }
      ],
      registrationRoute: "app",
      registrationUrl: "https://tennis.sportsdiary.co.kr/tennis/m_player/result/rookieTennis_info.asp?round=4",
      registrationHint: "스포츠다이어리 외부 앱 또는 전용 흐름으로 이동",
      freshnessLabel: "2시간 전 갱신"
    },
    {
      id: "tour-kta-mungyeong",
      slug: "2026-문경-오픈-생활체육-랭킹대회",
      fingerprint: "2026-문경-오픈-생활체육-랭킹대회",
      name: "2026 문경 오픈 생활체육 랭킹대회",
      organizer: "대한테니스협회, 문경시테니스협회",
      venue: "문경국제소프트테니스장",
      region: "경북",
      city: "문경",
      startDate: "2026-04-27",
      endDate: "2026-04-28",
      feeText: "복식 팀당 110,000원",
      feeAmount: 110000,
      status: "registration_open",
      statusLabel: "접수중",
      rankingType: "ranked",
      levelTags: ["advanced", "open", "ranked", "women"],
      levelSummary: "오픈부 또는 상급자 중심 · 여성 부서 운영 · 랭킹 포인트 반영",
      formatTags: ["doubles", "women_doubles"],
      formatSummary: "여성 복식 중심",
      genderSummary: "여성 부서 포함",
      rawEligibility: "오픈부, 국화부, 개나리부 / 테니스타운 신청",
      normalizedEligibility: "오픈부 또는 상급자 중심 · 여성 부서 운영 · 랭킹 포인트 반영",
      sourceConfidence: 0.88,
      sourceUpdatedAt: now,
      sourceRefs: [
        {
          sourceId: "kta_ranking",
          sourceName: "KTA 생활체육 랭킹",
          pageUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAll.do?_code=10078",
          detailUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAll.do?event=2026-mungyeong",
          registrationUrl: "https://join.kortennis.or.kr/community/boardDetail.do?_code=10100&articleSeq=2205&boardNm=notice&boardSeq=2",
          registrationRoute: "app"
        },
        {
          sourceId: "regional_manual",
          sourceName: "지역/시니어 보강",
          pageUrl: "https://jbsta.com/page/dae_main.php?bo_table=schedule&wr_id=845",
          detailUrl: "https://jbsta.com/page/dae_main.php?bo_table=schedule&wr_id=845",
          registrationRoute: "manual_contact"
        }
      ],
      registrationRoute: "app",
      registrationUrl: "https://join.kortennis.or.kr/community/boardDetail.do?_code=10100&articleSeq=2205&boardNm=notice&boardSeq=2",
      registrationHint: "KTA 생활체육 랭킹 외부 앱 또는 전용 흐름으로 이동",
      freshnessLabel: "2시간 전 갱신",
      notes: "2026-03-03부터 테니스타운 앱 신청"
    },
    {
      id: "tour-kta-relay",
      slug: "2026-서울-테니스-랠리-비랭킹-페스티벌",
      fingerprint: "2026-서울-테니스-랠리-비랭킹-페스티벌",
      name: "2026 서울 테니스 랠리 비랭킹 페스티벌",
      organizer: "대한테니스협회 생활체육본부",
      venue: "올림픽공원 테니스경기장",
      region: "서울",
      city: "서울",
      startDate: "2026-04-13",
      endDate: "2026-04-13",
      feeText: "팀당 80,000원",
      feeAmount: 80000,
      status: "registration_open",
      statusLabel: "접수중",
      rankingType: "non_ranked",
      levelTags: ["beginner", "intermediate", "senior", "non_ranked"],
      levelSummary: "입문자도 검토 가능한 부서 포함 · 시니어 연령 조건 포함 · 비랭킹 이벤트",
      formatTags: ["doubles"],
      formatSummary: "복식 중심",
      ageSummary: "만 50세 이상 참가 가능",
      rawEligibility: "2.0, 3.0, 4.0 등급별 복식 / 입문자와 50세 이상 참가 가능 / 비랭킹",
      normalizedEligibility: "입문자도 검토 가능한 부서 포함 · 시니어 연령 조건 포함 · 비랭킹 이벤트",
      sourceConfidence: 0.84,
      sourceUpdatedAt: now,
      sourceRefs: [
        {
          sourceId: "kta_relay",
          sourceName: "KTA 생활체육 신청",
          pageUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do?_code=10079",
          detailUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do?cmptEvntCd=202600001",
          registrationUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do?cmptEvntCd=202600001",
          registrationRoute: "website"
        }
      ],
      registrationRoute: "website",
      registrationUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do?cmptEvntCd=202600001",
      registrationHint: "KTA 생활체육 신청 원출처 페이지에서 신청",
      freshnessLabel: "2시간 전 갱신"
    },
    {
      id: "tour-kato-busan",
      slug: "2026-kato-부산-오션-비랭킹-페스티벌",
      fingerprint: "2026-kato-부산-오션-비랭킹-페스티벌",
      name: "2026 KATO 부산 오션 비랭킹 페스티벌",
      organizer: "부산오션클럽",
      venue: "부산 사직테니스장",
      region: "부산",
      city: "부산",
      startDate: "2026-05-11",
      endDate: "2026-05-11",
      feeText: "팀당 48,000원",
      feeAmount: 48000,
      status: "upcoming",
      statusLabel: "접수예정",
      rankingType: "non_ranked",
      levelTags: ["beginner", "non_ranked"],
      levelSummary: "입문자도 검토 가능한 부서 포함 · 비랭킹 이벤트",
      formatTags: ["doubles"],
      formatSummary: "복식 중심",
      rawEligibility: "전국신인부, 지역신인부 / 비랭킹",
      normalizedEligibility: "입문자도 검토 가능한 부서 포함 · 비랭킹 이벤트",
      sourceConfidence: 0.9,
      sourceUpdatedAt: now,
      sourceRefs: [
        {
          sourceId: "kato",
          sourceName: "KATO",
          pageUrl: "https://kato.kr/openList",
          detailUrl: "https://kato.kr/openGame/0050",
          registrationUrl: "https://kato.kr/openGame/0050",
          registrationRoute: "website"
        }
      ],
      registrationRoute: "website",
      registrationUrl: "https://kato.kr/openGame/0050",
      registrationHint: "KATO 원출처 페이지에서 신청",
      freshnessLabel: "2시간 전 갱신"
    },
    {
      id: "tour-senior",
      slug: "2026-한국시니어테니스연맹-전국시니어대회",
      fingerprint: "2026-한국시니어테니스연맹-전국시니어대회",
      name: "2026 한국시니어테니스연맹 전국시니어대회",
      organizer: "한국시니어테니스연맹",
      venue: "전북 순창 실내테니스장",
      region: "전북",
      city: "순창",
      startDate: "2026-05-03",
      endDate: "2026-05-03",
      status: "registration_open",
      statusLabel: "접수중",
      rankingType: "non_ranked",
      levelTags: ["senior", "non_ranked"],
      levelSummary: "시니어 연령 조건 포함 · 비랭킹 이벤트",
      formatTags: ["singles", "doubles"],
      formatSummary: "단식과 복식 동시 운영",
      ageSummary: "만 60세 이상 참가 가능",
      rawEligibility: "만 60세 이상 / 시니어부 / 비랭킹 / 단식과 복식 동시 운영",
      normalizedEligibility: "시니어 연령 조건 포함 · 비랭킹 이벤트",
      sourceConfidence: 0.73,
      sourceUpdatedAt: now,
      sourceRefs: [
        {
          sourceId: "regional_manual",
          sourceName: "지역/시니어 보강",
          pageUrl: "https://jbsta.com/page/dae_main.php?bo_table=schedule&wr_id=845",
          detailUrl: "https://www.kstf.kr/bbs/board.php?bo_table=20_1&wr_id=665",
          registrationRoute: "manual_contact"
        }
      ],
      registrationRoute: "manual_contact",
      registrationHint: "지역/시니어 보강 공지의 문의처로 직접 확인 필요",
      freshnessLabel: "2시간 전 갱신"
    }
  ],
  sources: [
    {
      id: "kato",
      name: "KATO",
      homepageUrl: "https://kato.kr/openList",
      summary: "전국 동호인 대회 일정과 상세 요강이 공개되는 핵심 소스",
      priority: 1,
      sourceType: "association",
      registrationRoute: "website",
      state: "healthy",
      lastSyncAt: now,
      lastSuccessfulSyncAt: now,
      lastMode: "live_fetch",
      recordCount: 2,
      note: "대회 일정과 상세 요강을 바로 연결합니다."
    },
    {
      id: "kta_ranking",
      name: "KTA 생활체육 랭킹",
      homepageUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAll.do?_code=10078",
      summary: "대한테니스협회 공식 생활체육 랭킹대회 목록",
      priority: 2,
      sourceType: "federation",
      registrationRoute: "app",
      state: "warning",
      lastSyncAt: now,
      lastSuccessfulSyncAt: now,
      lastMode: "fallback_fixture",
      recordCount: 2,
      note: "공식 목록은 유지하되 신청 경로는 테니스타운 앱 메타데이터로 표기합니다."
    },
    {
      id: "kta_relay",
      name: "KTA 생활체육 신청",
      homepageUrl: "https://join.kortennis.or.kr/sportsForAll/sportsForAllRellyInfo.do?_code=10079",
      summary: "비랭킹/랠리 대회 신청과 규정 상세를 확인하는 공식 페이지",
      priority: 3,
      sourceType: "federation",
      registrationRoute: "website",
      state: "warning",
      lastSyncAt: now,
      lastSuccessfulSyncAt: now,
      lastMode: "fallback_fixture",
      recordCount: 1,
      note: "비랭킹 이벤트 설명은 안정적이지만 구조화는 검수 대상입니다."
    },
    {
      id: "sports_diary",
      name: "스포츠다이어리",
      homepageUrl: "https://tennis.sportsdiary.co.kr/tennis/m_player/main/index.asp",
      summary: "KATA/루키 계열 대회 안내와 참가 기준을 제공하는 플랫폼",
      priority: 4,
      sourceType: "platform",
      registrationRoute: "app",
      state: "warning",
      lastSyncAt: now,
      lastSuccessfulSyncAt: now,
      lastMode: "fallback_fixture",
      recordCount: 2,
      note: "루키/입문자 친화 대회 커버리지 확보용"
    },
    {
      id: "regional_manual",
      name: "지역/시니어 보강",
      homepageUrl: "https://jbsta.com/page/dae_main.php?bo_table=schedule&wr_id=845",
      summary: "지역 협회와 시니어 단체 공지를 수동 보강하는 큐레이션 소스",
      priority: 5,
      sourceType: "regional",
      registrationRoute: "manual_contact",
      state: "warning",
      lastSyncAt: now,
      lastSuccessfulSyncAt: now,
      lastMode: "manual_seed",
      recordCount: 2,
      note: "참가비 누락, 중복 공지 여부를 운영자가 검수합니다."
    }
  ],
  reviewQueue: [
    {
      id: "review-mungyeong-merge",
      tournamentId: "tour-kta-mungyeong",
      tournamentName: "2026 문경 오픈 생활체육 랭킹대회",
      kind: "duplicate_merge",
      reason: "KTA와 지역 공지가 병합되어 제목/주최 표기를 최종 확인할 필요가 있습니다.",
      sourceIds: ["kta_ranking", "regional_manual"],
      createdAt: now
    },
    {
      id: "review-senior-fee",
      tournamentId: "tour-senior",
      tournamentName: "2026 한국시니어테니스연맹 전국시니어대회",
      kind: "missing_fee",
      reason: "참가비 공지가 비어 있어 운영자 확인이 필요합니다.",
      sourceIds: ["regional_manual"],
      createdAt: now
    }
  ],
  recentRuns: [
    {
      id: "sync-20260326",
      requestedSourceId: "all",
      startedAt: now,
      completedAt: now,
      success: true,
      syncedCount: 7,
      snapshotCount: 5,
      mode: "fallback_fixture",
      message: "전체 소스 동기화 완료"
    }
  ]
};

TENNIS_FALLBACK_BOARD.featured = TENNIS_FALLBACK_BOARD.tournaments.slice(0, 4);
