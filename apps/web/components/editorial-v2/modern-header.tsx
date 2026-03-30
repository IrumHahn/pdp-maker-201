"use client";

import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

const navItems = [
  { href: "#curation", label: "큐레이션" },
  { href: "#story", label: "브랜드 노트" },
  { href: "#journal", label: "저널" },
  { href: "#newsletter", label: "뉴스레터" }
];

export function ModernHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[rgba(249,245,238,0.82)] backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <Link className="text-lg font-semibold tracking-[-0.04em] text-[#111111]" href="/editorial-home">
          HANIRUM
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#6a6a64] md:flex">
          {navItems.map((item) => (
            <Link className="transition-colors hover:text-[#111111]" href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 text-sm font-medium text-[#6a6a64] transition-colors hover:text-[#111111]">
                둘러보기
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Quick Access</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="#hero">첫 인상</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#curation">이번 주 큐레이션</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#journal">추천 저널</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="hidden md:block">
          <Button asChild className="bg-[#1a4b3d] hover:bg-[#153c31]">
            <Link href="#newsletter">새 시안 저장하기</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button className="md:hidden" size="icon" variant="outline">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴 열기</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle className="font-sans text-[1.5rem] font-semibold tracking-[-0.04em]">HANIRUM</SheetTitle>
              <SheetDescription>
                Pretendard 기반의 현대적이고 정제된 프리미엄 홈 랜딩 샘플입니다.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-10 grid gap-3">
              {navItems.map((item) => (
                <Link
                  className="rounded-[22px] border border-border px-4 py-3 text-base text-foreground transition-colors hover:bg-[#efe6d8]"
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
