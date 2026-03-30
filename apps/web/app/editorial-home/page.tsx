import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";

import { ModernHeader } from "../../components/editorial-v2/modern-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export const metadata: Metadata = {
  title: "HANIRUM Editorial Home",
  description: "Pretendard 기반의 현대적인 프리미엄 홈 랜딩 샘플"
};

const curatedBooks = [
  {
    category: "ESSAY",
    title: "조용한 책장",
    description: "문장 중심의 큐레이션으로 하루의 속도를 늦추는 선택을 제안합니다.",
    accent: "bg-[linear-gradient(160deg,_#d0d4c9_0%,_#1e463a_100%)]"
  },
  {
    category: "HUMANITIES",
    title: "낯선 생각의 선반",
    description: "읽고 난 뒤 오래 남는 질문을 중심으로 서가를 구성한 무드입니다.",
    accent: "bg-[linear-gradient(160deg,_#ebe5da_0%,_#78816f_100%)]"
  },
  {
    category: "LIFESTYLE",
    title: "일상을 바꾸는 독서",
    description: "감각을 정리해주는 책, 생활을 천천히 바꿔가는 책을 한 흐름으로 엮었습니다.",
    accent: "bg-[linear-gradient(160deg,_#c49f7c_0%,_#253129_100%)]"
  }
];

const journalEntries = [
  {
    category: "CURATION NOTE",
    title: "좋은 홈은 많이 보여주는 대신 선명하게 읽히게 만듭니다",
    excerpt: "Pretendard 중심의 구조는 정보 전달력을 유지하면서도 충분히 세련된 인상을 만들 수 있습니다."
  },
  {
    category: "BRAND SYSTEM",
    title: "폰트 하나를 줄이는 것이 오히려 브랜드를 더 또렷하게 합니다",
    excerpt: "명조와 산세리프를 섞지 않고, 간격과 굵기만으로 위계를 만들면 더 현대적으로 정리됩니다."
  },
  {
    category: "LAYOUT",
    title: "카드를 예쁘게 만드는 것보다 전체 리듬을 먼저 맞추는 게 중요합니다",
    excerpt: "섹션 간 호흡과 정렬선을 먼저 잡으면, 화면 전체의 품질이 눈에 띄게 올라갑니다."
  }
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#6b7368]">{children}</p>;
}

export default function EditorialHomePage() {
  return (
    <div className="min-h-screen bg-[#f8f5ef] font-sans text-[#111111]">
      <ModernHeader />
      <main>
        <section
          className="relative overflow-hidden border-b border-black/5 bg-[radial-gradient(circle_at_top_right,_rgba(26,75,61,0.12),_transparent_22%),linear-gradient(180deg,_#f8f5ef_0%,_#f3ede2_100%)]"
          id="hero"
        >
          <div className="container py-16 md:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:items-end">
              <div className="animate-fade-up">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/65 px-4 py-2 text-sm text-[#5f665d] backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-[#1a4b3d]" />
                  Pretendard 중심의 새 시안
                </div>
                <h1 className="mt-8 max-w-4xl text-balance text-[3.25rem] font-semibold leading-[0.92] tracking-[-0.07em] text-[#111111] md:text-[5.7rem]">
                  명조 없이도
                  <br />
                  충분히 고급스럽고
                  <br />
                  또렷하게 보일 수 있게.
                </h1>
                <p className="mt-8 max-w-2xl text-[1.05rem] leading-8 text-[#61675f]">
                  이번 시안은 폰트 톤을 단순하게 줄이고, 여백과 정렬, 얇은 대비, 직선적인 카드 비율로 품질을
                  만드는 방향입니다. 인상은 더 현대적이고, 정보는 더 선명하게 읽히도록 설계했습니다.
                </p>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Button asChild className="h-12 bg-[#1a4b3d] px-6 text-base hover:bg-[#143a30]">
                    <Link href="#curation">
                      새 큐레이션 보기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild className="h-12 px-6 text-base" variant="outline">
                    <Link href="#journal">레이아웃 노트 읽기</Link>
                  </Button>
                </div>
                <div className="mt-12 grid gap-4 sm:grid-cols-3">
                  {[
                    ["Typeface", "Pretendard Only"],
                    ["Mood", "Modern Quiet"],
                    ["Composition", "Grid + Rhythm"]
                  ].map(([label, value]) => (
                    <div
                      className="rounded-[26px] border border-black/6 bg-white/72 px-5 py-5 shadow-card backdrop-blur"
                      key={label}
                    >
                      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[#72786f]">{label}</p>
                      <p className="mt-3 text-base font-semibold tracking-[-0.02em] text-[#151515]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="animate-fade-up-delayed">
                <div className="relative overflow-hidden rounded-[34px] border border-black/6 bg-[#fbf8f3] p-5 shadow-soft">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-[1.05fr_0.95fr] gap-4">
                      <div className="rounded-[28px] bg-[#1a4b3d] p-6 text-white">
                        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/68">Primary Card</p>
                        <div className="mt-16 max-w-[10rem] text-[2rem] font-semibold leading-[1.05] tracking-[-0.05em]">
                          Slow Reading Club
                        </div>
                      </div>
                      <div className="rounded-[28px] border border-black/6 bg-[#f1ece3] p-5">
                        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#7b8179]">Visual Direction</p>
                        <p className="mt-5 text-[1.5rem] font-semibold leading-[1.16] tracking-[-0.05em] text-[#121212]">
                          타입은 단순하게,
                          <br />
                          레이아웃은 선명하게.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[28px] border border-black/6 bg-white p-5">
                        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#7b8179]">Style Rule</p>
                        <p className="mt-4 text-sm leading-7 text-[#5d645c]">
                          장식용 폰트를 빼고도 고급스럽게 보이도록 카드 비율, 자간, 여백과 명도 대비를 더 정교하게
                          조정했습니다.
                        </p>
                      </div>
                      <div className="rounded-[28px] bg-[#ece4d6] p-5">
                        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#7b8179]">Brand Line</p>
                        <p className="mt-4 text-[1.05rem] font-medium leading-7 tracking-[-0.02em] text-[#151515]">
                          “읽고 싶은 분위기”를 먼저
                          <br />
                          보여주는 홈.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-dashed border-black/10 bg-white/75 px-5 py-4 text-sm leading-7 text-[#596059]">
                      첫 화면은 기능보다 인상에 집중하고, 아래 섹션에서 브랜드 원칙과 큐레이션의 밀도를 균형 있게
                      풀어가는 구조입니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-20 md:py-28" id="curation">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <SectionLabel>THIS WEEK&apos;S CURATION</SectionLabel>
              <h2 className="mt-5 max-w-3xl text-[2.15rem] font-semibold leading-[1.04] tracking-[-0.06em] text-[#131313] md:text-[3.4rem]">
                산세리프 중심이어도 충분히 부드럽고
                <br />
                프리미엄하게 읽히는 서가 구성
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#666c64]">
              더 얇은 테두리, 덜 둥근 모서리, 단정한 정렬과 짧은 카피를 중심으로 구성하면 세련된 긴장감이
              생깁니다.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {curatedBooks.map((book) => (
              <article
                className="group rounded-[30px] border border-black/6 bg-white/80 p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                key={book.title}
              >
                <div className={`rounded-[24px] p-5 text-white ${book.accent}`}>
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-white/70">{book.category}</p>
                  <div className="mt-16 text-[2rem] font-semibold leading-[1.04] tracking-[-0.06em]">{book.title}</div>
                </div>
                <div className="mt-6">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6a7168]">CURATION NOTE</p>
                  <p className="mt-4 text-sm leading-7 text-[#5c635a]">{book.description}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#171717]">
                    자세히 보기
                    <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-black/5 bg-[#f1eadf]" id="story">
          <div className="container py-20 md:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_360px]">
              <div>
                <SectionLabel>BRAND NOTE</SectionLabel>
                <h2 className="mt-5 max-w-3xl text-[2rem] font-semibold leading-[1.06] tracking-[-0.06em] text-[#111111] md:text-[3.15rem]">
                  폰트를 덜어내면 오히려 브랜드 톤이 더 선명해질 수 있습니다
                </h2>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#5f665d]">
                  Pretendard 하나만으로 위계를 만드는 대신, 헤드라인 굵기와 카드 비율, 텍스트 폭, 여백 리듬을 더
                  날카롭게 조정했습니다. 이번 안은 “폰트 장식”보다 “구성의 완성도”에 무게를 둔 버전입니다.
                </p>

                <div className="mt-10 rounded-[32px] border border-black/6 bg-white/78 p-7 shadow-card">
                  <p className="max-w-3xl text-[1.65rem] font-semibold leading-[1.35] tracking-[-0.05em] text-[#151515] md:text-[2.3rem]">
                    “예쁜 폰트”가 아니라
                    <br />
                    “정돈된 리듬”이 고급스러움을 만듭니다.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  "제목은 굵고 짧게, 본문은 길지만 흐리지 않게 유지",
                  "카드마다 서로 다른 장식을 넣기보다 한 가지 리듬만 반복",
                  "짙은 포인트 컬러는 페이지 안에서 한 번만 강하게 사용"
                ].map((item) => (
                  <div className="rounded-[26px] border border-black/6 bg-white/82 p-5" key={item}>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-[#1a4b3d]/10 p-2 text-[#1a4b3d]">
                        <Check className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-7 text-[#5d645c]">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container py-20 md:py-28" id="journal">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel>JOURNAL</SectionLabel>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.06em] text-[#111111] md:text-[3rem]">
                디자인 방향을 설명하는
                <br />
                세 개의 짧은 메모
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#666c64]">
              브랜드형 홈에서는 상품 설명 못지않게, 화면이 왜 이런 태도를 가지는지 설명하는 콘텐츠가 중요합니다.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {journalEntries.map((entry) => (
              <article className="flex h-full flex-col rounded-[30px] border border-black/6 bg-white/82 p-6" key={entry.title}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6b7368]">{entry.category}</p>
                <h3 className="mt-6 text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.05em] text-[#151515]">
                  {entry.title}
                </h3>
                <p className="mt-5 text-sm leading-7 text-[#5f665d]">{entry.excerpt}</p>
                <div className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-[#171717]">
                  더 읽기
                  <ChevronRight className="h-4 w-4" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="container pb-20 md:pb-28" id="newsletter">
          <div className="overflow-hidden rounded-[34px] bg-[#173d33] px-6 py-8 text-white shadow-soft md:px-10 md:py-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
              <div>
                <SectionLabel>NEWSLETTER</SectionLabel>
                <h2 className="mt-4 max-w-2xl text-[2rem] font-semibold leading-[1.05] tracking-[-0.06em] text-white md:text-[3rem]">
                  이번 톤이 괜찮다면
                  <br />
                  같은 방향으로 계속 확장할 수 있습니다.
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/72">
                  이 시안은 “명조 없이, Pretendard만으로, 더 현대적인 프리미엄”을 목표로 다시 설계한 버전입니다.
                </p>
              </div>

              <form className="rounded-[28px] bg-white/8 p-4 backdrop-blur-sm">
                <label className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/62" htmlFor="newsletter-email">
                  EMAIL
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Input
                    className="border-white/15 bg-white/96 text-[#161616] placeholder:text-[#616761]"
                    id="newsletter-email"
                    placeholder="you@example.com"
                    type="email"
                  />
                  <Button className="h-12 shrink-0 bg-[#f2e3cd] px-5 text-[#173128] hover:bg-[#ead6b8]" type="button">
                    이 방향 저장
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-black/5">
        <div className="container flex flex-col gap-5 py-10 text-sm text-[#6a7168] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-base font-semibold tracking-[-0.04em] text-[#111111]">HANIRUM</p>
            <p className="mt-3 max-w-md leading-7">
              Pretendard만으로도 충분히 프리미엄하게 보일 수 있는, 더 현대적인 홈 랜딩 시안입니다.
            </p>
          </div>
          <div className="flex gap-6">
            <Link className="transition-colors hover:text-[#111111]" href="#curation">
              큐레이션
            </Link>
            <Link className="transition-colors hover:text-[#111111]" href="#journal">
              저널
            </Link>
            <Link className="transition-colors hover:text-[#111111]" href="#newsletter">
              뉴스레터
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
