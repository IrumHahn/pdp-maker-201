import { ArrowUpRight } from "lucide-react";

import { journalEntries } from "./mock-data";
import { SectionHeader } from "./section-header";

export function JournalPreviewSection() {
  return (
    <section className="container py-20 md:py-28" id="journal">
      <SectionHeader
        eyebrow="Journal"
        title="책을 소개하는 대신, 읽는 감각을 먼저 기록합니다"
        description="프리미엄 인상은 상품 카드가 아니라 브랜드가 어떤 생각을 가진 곳인지 드러날 때 강해집니다. 그래서 저널 블록은 랜딩의 중요한 축이 됩니다."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {journalEntries.map((entry, index) => (
          <article
            className="group flex h-full flex-col justify-between rounded-[32px] border border-border bg-[rgba(255,255,255,0.72)] p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.9)]"
            key={entry.title}
            style={{ animationDelay: `${index * 140}ms` }}
          >
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.28em] text-primary/80">{entry.category}</p>
                <span className="text-xs uppercase tracking-[0.22em] text-muted">{entry.date}</span>
              </div>
              <h3 className="mt-6 font-serif text-[1.9rem] leading-tight text-foreground">{entry.title}</h3>
              <p className="mt-5 text-sm leading-7 text-muted">{entry.excerpt}</p>
            </div>
            <div className="mt-10 inline-flex items-center gap-2 text-sm text-foreground">
              더 읽기
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
