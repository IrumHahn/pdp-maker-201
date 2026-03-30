import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";

import { Button } from "../../../components/ui/button";

type Palette = {
  name: string;
  subtitle: string;
  bestFor: string;
  note: string;
  colors: {
    background: string;
    foreground: string;
    muted: string;
    primary: string;
    accent: string;
    card: string;
    border: string;
  };
};

const palettes: Palette[] = [
  {
    name: "Forest Sand",
    subtitle: "차분하고 안정적인 프리미엄",
    bestFor: "가장 무난하고 완성도 높게 가고 싶을 때",
    note: "현재 시안의 균형을 유지하면서도 브랜드 신뢰감을 가장 자연스럽게 끌어올리는 톤입니다.",
    colors: {
      background: "#f8f5ef",
      foreground: "#111111",
      muted: "#666c64",
      primary: "#1a4b3d",
      accent: "#e7ddcf",
      card: "rgba(255,255,255,0.82)",
      border: "rgba(17,17,17,0.08)"
    }
  },
  {
    name: "Stone Navy",
    subtitle: "도시적이고 선명한 프리미엄",
    bestFor: "브랜드/스튜디오 같은 현대성을 더하고 싶을 때",
    note: "서점보다 조금 더 구조적이고 세련된 느낌이 강해서, 정리된 브랜드 톤에 잘 맞습니다.",
    colors: {
      background: "#f5f3ef",
      foreground: "#121417",
      muted: "#68707a",
      primary: "#24384a",
      accent: "#e4e0d8",
      card: "rgba(255,255,255,0.84)",
      border: "rgba(18,20,23,0.08)"
    }
  },
  {
    name: "Clay Brown",
    subtitle: "따뜻하고 감성적인 프리미엄",
    bestFor: "브랜드 감성과 라이프스타일 무드를 강조하고 싶을 때",
    note: "콘텐츠와 큐레이션을 조금 더 따뜻하게 보이게 만들어서, 정서적 거리감을 줄여줍니다.",
    colors: {
      background: "#f7f1ea",
      foreground: "#171311",
      muted: "#73675f",
      primary: "#6b4d3e",
      accent: "#eadacc",
      card: "rgba(255,251,247,0.84)",
      border: "rgba(23,19,17,0.08)"
    }
  },
  {
    name: "Olive Gray",
    subtitle: "조용하고 지적인 프리미엄",
    bestFor: "조용한 큐레이션과 에디토리얼 무드를 유지하고 싶을 때",
    note: "초록과 회색 사이의 힘을 써서 지적이고 담백한 인상을 만듭니다.",
    colors: {
      background: "#f6f4ee",
      foreground: "#141512",
      muted: "#6f7368",
      primary: "#4e5b45",
      accent: "#e5e2d7",
      card: "rgba(255,255,255,0.82)",
      border: "rgba(20,21,18,0.08)"
    }
  },
  {
    name: "Ink Burgundy",
    subtitle: "차분하지만 개성이 있는 프리미엄",
    bestFor: "조금 더 유니크하고 아트북스러운 방향을 원할 때",
    note: "강한 자주색이 아니라 잉크 톤에 가까운 버건디라서 고급감은 유지하면서 개성을 만듭니다.",
    colors: {
      background: "#f8f4ef",
      foreground: "#141112",
      muted: "#746b6d",
      primary: "#6a2f3b",
      accent: "#eadfda",
      card: "rgba(255,255,255,0.84)",
      border: "rgba(20,17,18,0.08)"
    }
  },
  {
    name: "Charcoal Green",
    subtitle: "하이엔드하고 구조적인 프리미엄",
    bestFor: "장식을 줄이고 더 강한 브랜드 인상을 만들고 싶을 때",
    note: "미니멀한 레이아웃과 가장 잘 맞는 톤으로, 더 단단하고 고급스러운 인상을 줍니다.",
    colors: {
      background: "#f4f2ec",
      foreground: "#101110",
      muted: "#676b67",
      primary: "#20362f",
      accent: "#ddd8cf",
      card: "rgba(255,255,255,0.8)",
      border: "rgba(16,17,16,0.08)"
    }
  }
];

function hexLabel(value: string) {
  return value.startsWith("rgba") ? value.replace(/\s+/g, "") : value.toUpperCase();
}

function PalettePreview({ palette, recommended = false }: { palette: Palette; recommended?: boolean }) {
  const style = {
    "--preview-background": palette.colors.background,
    "--preview-foreground": palette.colors.foreground,
    "--preview-muted": palette.colors.muted,
    "--preview-primary": palette.colors.primary,
    "--preview-accent": palette.colors.accent,
    "--preview-card": palette.colors.card,
    "--preview-border": palette.colors.border
  } as CSSProperties;

  const swatches = [
    ["Background", palette.colors.background],
    ["Primary", palette.colors.primary],
    ["Accent", palette.colors.accent],
    ["Muted", palette.colors.muted]
  ];

  return (
    <article
      className="rounded-[36px] border border-black/6 p-5 shadow-card md:p-6"
      style={{ ...style, background: palette.colors.background }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.05em]" style={{ color: palette.colors.foreground }}>
              {palette.name}
            </h2>
            {recommended ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
                style={{ background: palette.colors.primary, color: "#f7f4ec" }}
              >
                Recommended
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm" style={{ color: palette.colors.muted }}>
            {palette.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          {swatches.map(([label, value]) => (
            <div className="text-center" key={label}>
              <div
                className="h-9 w-9 rounded-full border"
                style={{ background: value, borderColor: palette.colors.border }}
                title={`${label}: ${hexLabel(value)}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-6 overflow-hidden rounded-[32px] border p-5"
        style={{ background: "rgba(255,255,255,0.28)", borderColor: palette.colors.border }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-[-0.03em]" style={{ color: palette.colors.foreground }}>
            HANIRUM
          </div>
          <div className="flex gap-4 text-[0.7rem] font-medium" style={{ color: palette.colors.muted }}>
            <span>큐레이션</span>
            <span>저널</span>
            <span>뉴스레터</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_160px]">
          <div>
            <p
              className="inline-flex rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
              style={{
                color: palette.colors.muted,
                borderColor: palette.colors.border,
                background: "rgba(255,255,255,0.55)"
              }}
            >
              Pretendard premium
            </p>
            <h3
              className="mt-4 text-[2.05rem] font-semibold leading-[0.96] tracking-[-0.08em]"
              style={{ color: palette.colors.foreground }}
            >
              같은 레이아웃도
              <br />
              톤에 따라 인상이
              <br />
              크게 달라집니다.
            </h3>
            <p className="mt-4 max-w-[26rem] text-sm leading-6" style={{ color: palette.colors.muted }}>
              산세리프 기반의 현대적인 구조는 유지하면서, 포인트 컬러와 저채도 배경만 바꿔도 브랜드 인상이 완전히
              달라집니다.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ background: palette.colors.primary, color: "#f7f4ec" }}
                type="button"
              >
                주요 CTA
              </button>
              <button
                className="rounded-full border px-4 py-2 text-sm font-medium"
                style={{ borderColor: palette.colors.border, color: palette.colors.foreground }}
                type="button"
              >
                보조 버튼
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div
              className="rounded-[24px] p-4"
              style={{
                background: `linear-gradient(160deg, ${palette.colors.accent} 0%, ${palette.colors.primary} 100%)`,
                color: "#f7f4ec"
              }}
            >
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/72">Primary Card</p>
              <div className="mt-10 text-[1.35rem] font-semibold leading-[1.05] tracking-[-0.05em]">Quiet Shelf</div>
            </div>
            <div
              className="rounded-[24px] border p-4"
              style={{
                background: palette.colors.card,
                borderColor: palette.colors.border,
                color: palette.colors.foreground
              }}
            >
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em]" style={{ color: palette.colors.muted }}>
                Note
              </p>
              <p className="mt-3 text-sm leading-6">
                카드 대비와 배경 농도에 따라 같은 구성도 더 따뜻하거나 더 도시적으로 보입니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
        <div
          className="rounded-[28px] border p-5"
          style={{
            background: palette.colors.card,
            borderColor: palette.colors.border
          }}
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]" style={{ color: palette.colors.muted }}>
            Best For
          </p>
          <p className="mt-4 text-sm leading-7" style={{ color: palette.colors.foreground }}>
            {palette.bestFor}
          </p>
        </div>
        <div
          className="rounded-[28px] border p-5"
          style={{
            background: "rgba(255,255,255,0.46)",
            borderColor: palette.colors.border
          }}
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]" style={{ color: palette.colors.muted }}>
            Tone Note
          </p>
          <p className="mt-4 text-sm leading-7" style={{ color: palette.colors.foreground }}>
            {palette.note}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(palette.colors)
          .filter(([key]) => key !== "card" && key !== "border")
          .map(([key, value]) => (
            <div
              className="rounded-[22px] border px-4 py-3"
              key={key}
              style={{
                background: "rgba(255,255,255,0.46)",
                borderColor: palette.colors.border
              }}
            >
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em]" style={{ color: palette.colors.muted }}>
                {key}
              </p>
              <p className="mt-2 text-sm font-medium tracking-[-0.02em]" style={{ color: palette.colors.foreground }}>
                {hexLabel(value)}
              </p>
            </div>
          ))}
      </div>
    </article>
  );
}

export default function EditorialPaletteComparisonPage() {
  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#101010]">
      <main className="container py-10 md:py-14">
        <div className="flex flex-col gap-6 border-b border-black/6 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-[#5f665d] transition-colors hover:text-[#111111]"
              href="/editorial-home"
            >
              <ArrowLeft className="h-4 w-4" />
              기본 시안으로 돌아가기
            </Link>
            <p className="mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#6b7368]">
              Color Tone Comparison
            </p>
            <h1 className="mt-4 max-w-4xl text-[2.3rem] font-semibold leading-[1.02] tracking-[-0.07em] md:text-[4rem]">
              지금 느낌을 유지한 채,
              <br />
              어떤 컬러 톤이 가장 맞는지
              <br />
              한 번에 비교하는 보드
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#60675e]">
              Pretendard 중심의 현대적 레이아웃은 그대로 두고, 배경 온도와 포인트 컬러만 다르게 잡은 6개 조합입니다.
              같은 구조라도 색이 바뀌면 브랜드 인상이 어떻게 달라지는지 한눈에 볼 수 있도록 구성했습니다.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-[#585f57]">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/6 bg-white/60 px-4 py-2">
              <Check className="h-4 w-4 text-[#1a4b3d]" />
              구조는 동일, 톤만 변경
            </div>
            <Button asChild className="h-11 bg-[#1a4b3d] px-5 hover:bg-[#153c31]">
              <Link href="/editorial-home">
                현재 기본 시안 보기
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-8 2xl:grid-cols-2">
          {palettes.map((palette, index) => (
            <PalettePreview key={palette.name} palette={palette} recommended={index === 0 || index === 1} />
          ))}
        </div>
      </main>
    </div>
  );
}
