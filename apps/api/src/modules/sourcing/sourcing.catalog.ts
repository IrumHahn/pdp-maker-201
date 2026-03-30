import type { HotTrack, PreferenceLevel, ProductEvidence, RiskLevel } from "./sourcing.types";

export interface CatalogEntry {
  canonicalName: string;
  localizedName: string;
  category: string;
  tags: string[];
  broadDemand: boolean;
  track: HotTrack;
  targetCustomer: string;
  whoShouldSell: string;
  whyHot: string;
  koreanAngle: string;
  notes: string;
  riskLevel: RiskLevel;
  riskLabels: string[];
  demandScore: number;
  trendScore: number;
  koreaFitScore: number;
  sourcingEaseScore: number;
  riskAdjustedScore: number;
  preferredSourcingCountries: string[];
  shippingSensitivity: PreferenceLevel;
  regulationSensitivity: PreferenceLevel;
  evidenceSeeds: Array<
    Omit<ProductEvidence, "id" | "capturedAt"> & {
      metricValue: string;
    }
  >;
}

export const GLOBAL_PRODUCT_CATALOG: CatalogEntry[] = [
  {
    canonicalName: "Portable Ice Face Roller",
    localizedName: "휴대용 아이스 페이스 롤러",
    category: "뷰티/셀프케어",
    tags: ["beauty", "self care", "ugc", "morning routine", "skincare"],
    broadDemand: true,
    track: "BURST",
    targetCustomer: "붓기 관리와 짧은 셀프케어 루틴에 반응하는 20~30대 여성",
    whoShouldSell: "숏폼 중심 뷰티 셀러, 묶음/파우치 번들 전략을 잘하는 입문 셀러",
    whyHot: "아침 루틴형 UGC가 빠르게 붙고, 저가 충동구매 구간이라 테스트 반응이 좋음",
    koreanAngle: "냉장 보관 파우치 번들, 출근 전 30초 루틴 콘텐츠로 현지화",
    notes: "냉감 유지와 마감 품질이 만족도에 직접 연결됨",
    riskLevel: "medium",
    riskLabels: ["품질 클레임"],
    demandScore: 27,
    trendScore: 17,
    koreaFitScore: 21,
    sourcingEaseScore: 14,
    riskAdjustedScore: 6,
    preferredSourcingCountries: ["CN", "KR"],
    shippingSensitivity: "low",
    regulationSensitivity: "low",
    evidenceSeeds: [
      {
        sourceName: "Amazon Movers & Shakers",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/gp/movers-and-shakers",
        summary: "최근 24시간 급상승 제품군에 반복 등장",
        metricLabel: "급상승 체감",
        metricValue: "24h spike",
        confidence: 0.81
      },
      {
        sourceName: "TikTok Top Products",
        sourceType: "social",
        sourceUrl: "https://ads.tiktok.com/business/creativecenter/inspiration/top-products",
        summary: "붓기 관리 전후형 영상이 빠르게 복제되고 있음",
        metricLabel: "광고/UGC",
        metricValue: "high UGC volume",
        confidence: 0.84
      }
    ]
  },
  {
    canonicalName: "Under-Desk Walking Pad",
    localizedName: "언더데스크 워킹패드",
    category: "홈피트니스",
    tags: ["fitness", "office", "home office", "walking", "wellness"],
    broadDemand: true,
    track: "STEADY",
    targetCustomer: "재택근무와 건강 루틴을 동시에 챙기려는 직장인",
    whoShouldSell: "고가 가전 운영 경험이 있고 설치/AS 프로세스를 통제할 수 있는 셀러",
    whyHot: "반짝 유행보다 장기 수요가 강하고 검색 추세도 안정적으로 유지됨",
    koreanAngle: "층간소음 매트 번들, 사무실/법인 납품 콘텐츠로 확장",
    notes: "부피와 CS 비용이 커서 운영 체력이 필요함",
    riskLevel: "medium",
    riskLabels: ["배송/부피 비용"],
    demandScore: 24,
    trendScore: 15,
    koreaFitScore: 16,
    sourcingEaseScore: 8,
    riskAdjustedScore: 6,
    preferredSourcingCountries: ["CN", "KR"],
    shippingSensitivity: "high",
    regulationSensitivity: "low",
    evidenceSeeds: [
      {
        sourceName: "Amazon Best Sellers",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/Best-Sellers/zgbs",
        summary: "홈피트니스 상위권을 오랫동안 유지",
        metricLabel: "볼륨",
        metricValue: "12-week steady",
        confidence: 0.85
      },
      {
        sourceName: "Google Trends",
        sourceType: "search",
        sourceUrl: "https://trends.google.com/trends/",
        summary: "재택근무/다이어트 연관 검색이 장기적으로 유지",
        metricLabel: "검색 추세",
        metricValue: "steady demand",
        confidence: 0.8
      }
    ]
  },
  {
    canonicalName: "Pet Hair Remover Reusable Roller",
    localizedName: "반려동물 털 제거 롤러",
    category: "펫/생활",
    tags: ["pet", "cleaning", "lint", "home", "repeat purchase"],
    broadDemand: true,
    track: "STEADY",
    targetCustomer: "반려동물을 키우고 빠른 청소 효율을 원하는 가구",
    whoShouldSell: "생활용품/펫 카테고리에서 소모품 번들링을 잘하는 셀러",
    whyHot: "문제 해결이 선명하고 후기 축적이 빨라 재구매 구조가 생김",
    koreanAngle: "리필 세트와 세탁 전 10초 루틴 숏폼으로 포지셔닝",
    notes: "원단 손상 없이 잘 제거되는지 품질 검수가 중요함",
    riskLevel: "low",
    riskLabels: [],
    demandScore: 26,
    trendScore: 15,
    koreaFitScore: 23,
    sourcingEaseScore: 14,
    riskAdjustedScore: 10,
    preferredSourcingCountries: ["CN", "KR", "VN"],
    shippingSensitivity: "low",
    regulationSensitivity: "low",
    evidenceSeeds: [
      {
        sourceName: "Temu Top Sellers",
        sourceType: "marketplace",
        sourceUrl: "https://www.temu.com",
        summary: "저가 반복 구매형 생활 아이템으로 노출 비중이 큼",
        metricLabel: "판매 볼륨",
        metricValue: "repeat reviews",
        confidence: 0.76
      },
      {
        sourceName: "Google Trends",
        sourceType: "search",
        sourceUrl: "https://trends.google.com/trends/",
        summary: "펫 털 제거 관련 검색이 계절성보다 상시 수요에 가까움",
        metricLabel: "검색 추세",
        metricValue: "always-on",
        confidence: 0.75
      }
    ]
  },
  {
    canonicalName: "Magnetic Spice Jar Rack",
    localizedName: "자석 스파이스 정리 랙",
    category: "주방정리",
    tags: ["kitchen", "organization", "storage", "small space", "home decor"],
    broadDemand: false,
    track: "EMERGING",
    targetCustomer: "좁은 주방을 효율적으로 정리하고 싶은 1~2인 가구",
    whoShouldSell: "정리/수납과 인테리어 감도를 함께 팔 수 있는 셀러",
    whyHot: "정리 콘텐츠 저장률이 높고 위시리스트 증가가 빨라지는 구조",
    koreanAngle: "좁은 주방 Before/After 중심의 수납 문제 해결 콘텐츠",
    notes: "자력과 마감, 부착 안정성 검수가 중요함",
    riskLevel: "low",
    riskLabels: [],
    demandScore: 18,
    trendScore: 18,
    koreaFitScore: 19,
    sourcingEaseScore: 13,
    riskAdjustedScore: 10,
    preferredSourcingCountries: ["CN"],
    shippingSensitivity: "low",
    regulationSensitivity: "low",
    evidenceSeeds: [
      {
        sourceName: "Pinterest Trends",
        sourceType: "search",
        sourceUrl: "https://trends.pinterest.com/",
        summary: "주방 정리 비주얼 콘텐츠 저장률이 빠르게 증가",
        metricLabel: "관심도",
        metricValue: "saved frequently",
        confidence: 0.72
      },
      {
        sourceName: "Amazon Most Wished For",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/Most-Wished-For/zgbs",
        summary: "즉시 구매보다 탐색/보관 니즈가 강한 제품군",
        metricLabel: "위시리스트",
        metricValue: "wish-list up",
        confidence: 0.69
      }
    ]
  },
  {
    canonicalName: "Heatless Curling Headband Set",
    localizedName: "열 없는 컬링 헤어밴드",
    category: "헤어/뷰티",
    tags: ["beauty", "hair", "night routine", "ugc", "fashion"],
    broadDemand: true,
    track: "BURST",
    targetCustomer: "머리 손상은 줄이고 간단한 헤어 연출을 원하는 여성",
    whoShouldSell: "뷰티 숏폼 크리에이티브 테스트가 빠른 셀러",
    whyHot: "전후가 명확하고 자는 동안 완성된다는 메시지가 강한 공유성을 가짐",
    koreanAngle: "3개 컬러팩과 여행용 파우치 번들로 기프트화",
    notes: "유사 특허/디자인 침해 여부 확인이 필요함",
    riskLevel: "high",
    riskLabels: ["지재권/IP"],
    demandScore: 25,
    trendScore: 18,
    koreaFitScore: 20,
    sourcingEaseScore: 13,
    riskAdjustedScore: 2,
    preferredSourcingCountries: ["CN"],
    shippingSensitivity: "low",
    regulationSensitivity: "medium",
    evidenceSeeds: [
      {
        sourceName: "TikTok Top Ads",
        sourceType: "social",
        sourceUrl: "https://ads.tiktok.com/business/creativecenter/inspiration/topads",
        summary: "전후형 숏폼이 빠르게 복제되는 형태",
        metricLabel: "광고 강도",
        metricValue: "viral creatives",
        confidence: 0.88
      },
      {
        sourceName: "Amazon Hot New Releases",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/gp/new-releases",
        summary: "신상품군에서 빠르게 상위권으로 진입",
        metricLabel: "신상품 반응",
        metricValue: "top new release",
        confidence: 0.77
      }
    ]
  },
  {
    canonicalName: "Mini Label Maker Bluetooth",
    localizedName: "미니 블루투스 라벨기",
    category: "정리/문구",
    tags: ["organization", "label", "office", "family", "home"],
    broadDemand: true,
    track: "STEADY",
    targetCustomer: "정리와 육아, 홈오피스 루틴을 동시에 챙기는 고객",
    whoShouldSell: "앱 로컬라이징과 템플릿 번들 제공이 가능한 셀러",
    whyHot: "생활 전반에 쓰임새가 넓고 콘텐츠 확장성이 좋아 롱런에 유리함",
    koreanAngle: "한글 폰트 템플릿 무료 제공, 냉장고/장난감 정리 콘텐츠와 결합",
    notes: "앱 번역과 폰트/스티커 번들 제공 여부가 경쟁 포인트",
    riskLevel: "medium",
    riskLabels: ["품질 클레임"],
    demandScore: 23,
    trendScore: 15,
    koreaFitScore: 24,
    sourcingEaseScore: 12,
    riskAdjustedScore: 6,
    preferredSourcingCountries: ["CN", "KR"],
    shippingSensitivity: "low",
    regulationSensitivity: "low",
    evidenceSeeds: [
      {
        sourceName: "Amazon Best Sellers",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/Best-Sellers/zgbs",
        summary: "정리/문구 카테고리에서 지속적으로 상위권 유지",
        metricLabel: "판매 안정성",
        metricValue: "long-run seller",
        confidence: 0.84
      },
      {
        sourceName: "TikTok Top Products",
        sourceType: "social",
        sourceUrl: "https://ads.tiktok.com/business/creativecenter/inspiration/top-products",
        summary: "정리 전후형 콘텐츠와 궁합이 좋음",
        metricLabel: "UGC 반응",
        metricValue: "repeatable content",
        confidence: 0.74
      }
    ]
  },
  {
    canonicalName: "Posture Corrector Smart Sensor",
    localizedName: "자세 교정 스마트 센서",
    category: "헬스케어",
    tags: ["health", "sensor", "office", "pain relief", "wearable"],
    broadDemand: false,
    track: "EMERGING",
    targetCustomer: "장시간 앉아 일하며 허리/어깨 불편을 느끼는 직장인",
    whoShouldSell: "규제 문구와 의료기기 오인 리스크를 통제할 수 있는 셀러",
    whyHot: "문제 인식은 뚜렷하고 검색 추세는 좋지만 표현 리스크가 큼",
    koreanAngle: "의료 표현을 피한 자세 습관 코칭 포지션으로 재정의",
    notes: "의료기기 오인 가능성과 허위효능 표현 리스크가 큼",
    riskLevel: "high",
    riskLabels: ["식품·화장품·의료기기"],
    demandScore: 14,
    trendScore: 18,
    koreaFitScore: 10,
    sourcingEaseScore: 9,
    riskAdjustedScore: 1,
    preferredSourcingCountries: ["CN"],
    shippingSensitivity: "low",
    regulationSensitivity: "high",
    evidenceSeeds: [
      {
        sourceName: "Exploding Topics",
        sourceType: "search",
        sourceUrl: "https://explodingtopics.com/",
        summary: "자세 교정/웨어러블 관련 키워드가 증가세",
        metricLabel: "성장 신호",
        metricValue: "5-month uptrend",
        confidence: 0.71
      },
      {
        sourceName: "Meta Ad Library",
        sourceType: "social",
        sourceUrl: "https://www.facebook.com/ads/library/",
        summary: "오피스 통증 해결 메시지로 광고 집행이 늘고 있음",
        metricLabel: "광고 테스트",
        metricValue: "increased testing",
        confidence: 0.68
      }
    ]
  },
  {
    canonicalName: "Reusable Water Balloon Kit",
    localizedName: "재사용 물풍선 키트",
    category: "키즈/야외놀이",
    tags: ["kids", "summer", "outdoor", "family", "seasonal"],
    broadDemand: true,
    track: "BURST",
    targetCustomer: "야외놀이와 캠핑 콘텐츠를 찾는 가족 단위 고객",
    whoShouldSell: "시즌 기획전 운영이 빠르고 촬영/UGC 리소스가 있는 셀러",
    whyHot: "계절성과 숏폼 확산이 겹치면 주간 단위로 빠르게 터질 수 있음",
    koreanAngle: "캠핑/워터파크 시즌 기획전과 가족놀이 묶음 제안",
    notes: "시즌 종료 후 반응이 빠르게 꺾일 수 있음",
    riskLevel: "medium",
    riskLabels: ["품질 클레임"],
    demandScore: 24,
    trendScore: 14,
    koreaFitScore: 19,
    sourcingEaseScore: 14,
    riskAdjustedScore: 6,
    preferredSourcingCountries: ["CN", "VN"],
    shippingSensitivity: "low",
    regulationSensitivity: "low",
    evidenceSeeds: [
      {
        sourceName: "Amazon Movers & Shakers",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/gp/movers-and-shakers",
        summary: "여름철 급등 아이템으로 주간 반응이 큼",
        metricLabel: "계절 급등",
        metricValue: "weekly burst",
        confidence: 0.79
      },
      {
        sourceName: "TikTok Top Products",
        sourceType: "social",
        sourceUrl: "https://ads.tiktok.com/business/creativecenter/inspiration/top-products",
        summary: "준비 시간이 짧은 놀이형 메시지가 공유되기 쉬움",
        metricLabel: "콘텐츠 확산",
        metricValue: "high shareability",
        confidence: 0.78
      }
    ]
  },
  {
    canonicalName: "Magnetic Cable Organizer Dock",
    localizedName: "자석 케이블 오거나이저 도크",
    category: "데스크/정리",
    tags: ["desk", "organization", "cable", "office", "productivity"],
    broadDemand: true,
    track: "STEADY",
    targetCustomer: "책상 환경을 깔끔하게 유지하고 싶은 직장인/학생",
    whoShouldSell: "정리/데스크셋업 감도를 살릴 수 있는 셀러",
    whyHot: "데스크셋업 콘텐츠와 궁합이 좋고, 전세계적으로 작은 충동구매 수요가 존재함",
    koreanAngle: "데스크셋업 Before/After와 충전 동선 정리 콘텐츠로 판매",
    notes: "자력과 접착 품질 차이가 리뷰 편차를 크게 만듦",
    riskLevel: "low",
    riskLabels: [],
    demandScore: 22,
    trendScore: 13,
    koreaFitScore: 22,
    sourcingEaseScore: 15,
    riskAdjustedScore: 10,
    preferredSourcingCountries: ["CN", "KR"],
    shippingSensitivity: "low",
    regulationSensitivity: "low",
    evidenceSeeds: [
      {
        sourceName: "Reddit",
        sourceType: "community",
        sourceUrl: "https://www.reddit.com/",
        summary: "책상정리, 셋업 공유 커뮤니티에서 반복적으로 언급되는 문제 해결 제품",
        metricLabel: "문제 해결성",
        metricValue: "desk pain-point",
        confidence: 0.67
      },
      {
        sourceName: "Amazon Best Sellers",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/Best-Sellers/zgbs",
        summary: "가벼운 데스크 액세서리 카테고리에서 꾸준한 판매 신호",
        metricLabel: "판매 안정성",
        metricValue: "steady accessory",
        confidence: 0.74
      }
    ]
  },
  {
    canonicalName: "Silicone Air Fryer Liner Set",
    localizedName: "실리콘 에어프라이어 라이너 세트",
    category: "주방/조리도구",
    tags: ["kitchen", "air fryer", "cleaning", "home", "consumable"],
    broadDemand: true,
    track: "STEADY",
    targetCustomer: "청소 스트레스를 줄이고 싶은 실용형 주방 고객",
    whoShouldSell: "주방 소모품 번들, 반복 구매 구조를 설계할 수 있는 셀러",
    whyHot: "이미 깔린 수요층이 크고, 문제 해결 메시지가 명확해 국내 전환도 쉬움",
    koreanAngle: "에어프라이어 청소 시간 절약 포인트로 숏폼 제작",
    notes: "식품 접촉 소재 관련 표기와 냄새 이슈를 체크해야 함",
    riskLevel: "medium",
    riskLabels: ["품질 클레임"],
    demandScore: 25,
    trendScore: 12,
    koreaFitScore: 24,
    sourcingEaseScore: 15,
    riskAdjustedScore: 6,
    preferredSourcingCountries: ["CN", "KR"],
    shippingSensitivity: "low",
    regulationSensitivity: "medium",
    evidenceSeeds: [
      {
        sourceName: "Amazon Best Sellers",
        sourceType: "marketplace",
        sourceUrl: "https://www.amazon.com/Best-Sellers/zgbs",
        summary: "주방 보조용품 카테고리에서 견조한 상위권",
        metricLabel: "판매 순위",
        metricValue: "kitchen steady",
        confidence: 0.82
      },
      {
        sourceName: "Pinterest Trends",
        sourceType: "search",
        sourceUrl: "https://trends.pinterest.com/",
        summary: "에어프라이어 클리닝/정리형 콘텐츠 반응이 좋음",
        metricLabel: "관심도",
        metricValue: "cleaning utility",
        confidence: 0.7
      }
    ]
  }
];
