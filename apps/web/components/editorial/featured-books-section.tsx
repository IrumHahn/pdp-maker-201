import { featuredBooks } from "./mock-data";
import { SectionHeader } from "./section-header";

export function FeaturedBooksSection() {
  return (
    <section className="container py-20 md:py-28" id="collection">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          eyebrow="Featured Collection"
          title="지금 가장 오래 머무르게 되는 세 권의 선반"
          description="가격표보다 큐레이터의 메모가 먼저 보이는 레이아웃으로, 선택이 아닌 분위기부터 신뢰하게 만듭니다."
        />
        <p className="max-w-sm text-sm leading-7 text-muted">
          각 카드의 인상은 제각각 다르지만, 종이 질감 같은 톤과 절제된 장식으로 한 브랜드 안에 머무르게 설계했습니다.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {featuredBooks.map((book, index) => (
          <article
            className="group rounded-[32px] border border-border bg-[rgba(255,255,255,0.76)] p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.88)]"
            key={book.title}
            style={{ animationDelay: `${index * 130}ms` }}
          >
            <div className="rounded-[28px] border border-white/40 p-5 text-[#fff8ef]" style={{ background: book.accent }}>
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-white/70">{book.category}</p>
              <div className="mt-16 max-w-[10rem] font-serif text-[2rem] leading-[1.05]">{book.title}</div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.24em] text-primary/80">{book.label}</p>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h3 className="mt-5 font-serif text-2xl leading-tight text-foreground">{book.subtitle}</h3>
              <p className="mt-4 text-sm leading-7 text-muted">{book.note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
