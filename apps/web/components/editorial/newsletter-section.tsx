import { Input } from "../ui/input";
import { Button } from "../ui/button";

export function NewsletterSection() {
  return (
    <section className="container pb-20 pt-8 md:pb-28" id="newsletter">
      <div className="overflow-hidden rounded-[40px] border border-[#244a40]/10 bg-[#163c34] px-6 py-10 text-[#f7f4ec] shadow-soft md:px-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/62">Newsletter</p>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight md:text-5xl">
              한 달에 한 번,
              <br />
              오래 남는 책과 문장을 보냅니다.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/72">
              실사용 연동은 제외한 샘플이므로 제출 동작은 막아두되, 프리미엄 랜딩에서 이메일 입력 구간이 어떤 밀도와
              분위기로 보이는지 확인할 수 있도록 구성했습니다.
            </p>
          </div>
          <form className="grid gap-3 rounded-[30px] bg-white/8 p-4 backdrop-blur-sm">
            <label className="text-xs uppercase tracking-[0.24em] text-white/62" htmlFor="newsletter-email">
              Email Address
            </label>
            <Input
              className="border-white/14 bg-white/92 placeholder:text-[#5f675f] focus:border-white/28"
              id="newsletter-email"
              placeholder="you@example.com"
              type="email"
            />
            <Button className="w-full bg-[#f1e4cf] text-[#162019] hover:bg-[#ead9be]" type="button">
              큐레이션 편지 받아보기
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
