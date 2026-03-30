export type FeaturedBook = {
  title: string;
  subtitle: string;
  note: string;
  category: string;
  accent: string;
  label: string;
};

export type JournalEntry = {
  title: string;
  excerpt: string;
  category: string;
  date: string;
};

export const featuredBooks: FeaturedBook[] = [
  {
    title: "조용한 문장을 남기는 책",
    subtitle: "오래 머무르는 독서를 위한 첫 번째 선반",
    note: "빠르게 지나가지 않고, 하루의 속도를 조금 늦추게 하는 문장들을 모았습니다.",
    category: "Curated Essay",
    accent: "linear-gradient(160deg, #d4c2ab 0%, #2c4e46 100%)",
    label: "Editor's Pick"
  },
  {
    title: "낯선 생각을 초대하는 페이지",
    subtitle: "사유를 확장하는 인문 큐레이션",
    note: "한 번의 소비보다 여러 번의 재독을 부르는 책들만 조심스럽게 올려두었습니다.",
    category: "Humanities",
    accent: "linear-gradient(160deg, #ede4d4 0%, #6e7a6b 100%)",
    label: "Quiet Bestseller"
  },
  {
    title: "일상의 밀도를 높이는 독서",
    subtitle: "작은 감각의 변화를 만드는 선택",
    note: "페이지를 덮은 뒤에도 오랫동안 남는 결을 가진 책들을 중심으로 구성했습니다.",
    category: "Lifestyle",
    accent: "linear-gradient(160deg, #b58e6a 0%, #1f2d26 100%)",
    label: "Monthly Shelf"
  }
];

export const journalEntries: JournalEntry[] = [
  {
    category: "Journal",
    date: "03. 2026",
    title: "좋은 서점은 책보다 먼저 읽는 태도를 제안합니다",
    excerpt: "무엇을 사는가보다 어떤 속도로 읽는가를 생각하게 만드는 공간에 대해 기록했습니다."
  },
  {
    category: "Essay",
    date: "02. 2026",
    title: "문장 하나가 오래 남는 날의 풍경",
    excerpt: "읽고 난 뒤 바로 잊히지 않는 책은, 결국 삶의 장면과 함께 기억됩니다."
  },
  {
    category: "Curation",
    date: "01. 2026",
    title: "선별한다는 것은 더 많이 보여주는 일이 아니라 덜어내는 일",
    excerpt: "충분히 덜어낸 레이아웃과 큐레이션이 왜 더 신뢰를 만드는지 정리했습니다."
  }
];

export const editorialPrinciples = [
  "적은 색으로도 충분히 깊은 인상을 남길 것",
  "카드보다 문장과 여백이 먼저 보이게 할 것",
  "시선이 빠르게 흩어지지 않도록 리듬을 단순하게 유지할 것"
];
