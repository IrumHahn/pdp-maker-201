import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col gap-6 py-10 text-sm text-muted md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-serif text-2xl tracking-[0.14em] text-foreground">HANIRUM</p>
          <p className="mt-3 max-w-md leading-7">
            조용한 문장과 정제된 여백으로 고급스러운 브랜드 홈을 어떻게 구성할 수 있는지 보여주는 샘플 랜딩입니다.
          </p>
        </div>
        <div className="flex gap-6">
          <Link className="transition-colors hover:text-foreground" href="#collection">
            Collection
          </Link>
          <Link className="transition-colors hover:text-foreground" href="#journal">
            Journal
          </Link>
          <Link className="transition-colors hover:text-foreground" href="#newsletter">
            Newsletter
          </Link>
        </div>
      </div>
    </footer>
  );
}
