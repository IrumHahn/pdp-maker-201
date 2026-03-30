import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "../ui/button";

const heroStats = [
  { label: "Monthly Curation", value: "12권의 선택" },
  { label: "Reading Rhythm", value: "느리게, 깊게" },
  { label: "Editorial Tone", value: "문장 중심 큐레이션" }
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/80">
      <div className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top_left,_rgba(212,194,171,0.55),_transparent_34%),radial-gradient(circle_at_82%_14%,_rgba(35,89,77,0.14),_transparent_28%),linear-gradient(180deg,_#faf5ee_0%,_#f7f1e8_48%,_#f4ede3_100%)]" />
      <div className="container py-16 md:py-24">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.78fr)] lg:items-end">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">Premium Editorial Landing</p>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.94] text-foreground md:text-7xl">
              오래 남는 책은
              <br />
              조용한 화면에서
              <br />
              더 깊게 보입니다.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-muted">
              빠르게 팔기 위한 서점이 아니라, 천천히 머물며 읽고 싶은 마음을 만들어내는 프리미엄 에디토리얼 홈
              랜딩 샘플입니다. 책과 문장을 중심에 두고, 여백과 리듬으로 신뢰를 설계했습니다.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="#collection">
                  큐레이션 선반 보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#journal">읽기의 기록 읽기</Link>
              </Button>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat, index) => (
                <div
                  className="rounded-[28px] border border-border bg-[rgba(255,255,255,0.58)] px-5 py-5 shadow-card backdrop-blur-sm"
                  key={stat.label}
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">{stat.label}</p>
                  <p className="mt-3 text-lg font-medium text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up-delayed">
            <div className="relative overflow-hidden rounded-[36px] border border-border bg-[rgba(252,249,242,0.86)] p-7 shadow-soft backdrop-blur md:p-8">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,_rgba(35,89,77,0.16),_transparent_68%)]" />
              <div className="grid gap-6">
                <div className="rounded-[30px] border border-[#f0e7d8] bg-[#f4ede3] p-5">
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-5">
                    <div className="rounded-[24px] bg-[linear-gradient(160deg,_#d8c5ab_0%,_#27453d_100%)] p-5 text-[#fffaf2]">
                      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/70">Curated Book</p>
                      <div className="mt-14 font-serif text-2xl leading-tight">The Quiet Shelf</div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-muted">Editor's Issue</p>
                      <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground">서두르지 않는 선택이 만드는 인상</h2>
                      <p className="mt-4 text-sm leading-7 text-muted">
                        첫 화면은 기능보다 태도를 말해야 합니다. 이 목업은 책 표지, 문장, 넓은 여백을 통해 프리미엄
                        브랜드의 호흡을 먼저 전달합니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <article className="rounded-[28px] border border-border bg-white/70 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">Reading Note</p>
                    <p className="mt-4 font-serif text-2xl leading-tight text-foreground">
                      "많이 보여주는 대신,
                      <br />
                      오래 보이게."
                    </p>
                  </article>
                  <article className="rounded-[28px] border border-border bg-[#163c34] p-5 text-[#f7f4ec]">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/62">Visual Rule</p>
                    <p className="mt-4 text-sm leading-7 text-white/78">
                      진한 포인트 컬러는 한 번만, 카드보다 텍스트 위계를 먼저. 움직임은 작고 부드럽게 유지합니다.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
