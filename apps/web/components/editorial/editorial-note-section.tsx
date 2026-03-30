import { editorialPrinciples } from "./mock-data";
import { SectionHeader } from "./section-header";

export function EditorialNoteSection() {
  return (
    <section className="border-y border-border bg-[rgba(230,220,199,0.28)]" id="editorial-note">
      <div className="container py-20 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <SectionHeader
              eyebrow="Editor's Note"
              title="좋은 책을 보여준다는 건, 먼저 읽고 싶은 태도를 보여주는 일입니다"
              description="브랜드의 신뢰감은 기능 설명보다도 첫 화면의 호흡에서 시작됩니다. 이 구간은 그 철학을 가장 압축적으로 전달하는 인용 블록입니다."
            />
            <blockquote className="mt-10 max-w-3xl border-l border-primary/30 pl-6 font-serif text-3xl leading-[1.45] text-foreground md:text-[2.5rem]">
              “많은 정보를 쌓아 올리는 대신,
              <br />
              몇 개의 문장과 충분한 여백으로
              <br />
              오래 머무는 인상을 만듭니다.”
            </blockquote>
          </div>

          <div className="rounded-[32px] border border-border bg-[rgba(255,255,255,0.74)] p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Design Principles</p>
            <div className="mt-6 grid gap-4">
              {editorialPrinciples.map((principle) => (
                <div className="rounded-[24px] border border-border bg-white/70 p-4 text-sm leading-7 text-muted" key={principle}>
                  {principle}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
