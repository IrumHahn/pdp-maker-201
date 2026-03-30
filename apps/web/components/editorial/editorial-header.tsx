"use client";

import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

const navItems = [
  { href: "#collection", label: "Collection" },
  { href: "#editorial-note", label: "Editor's Note" },
  { href: "#journal", label: "Journal" },
  { href: "#newsletter", label: "Newsletter" }
];

export function EditorialHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/30 bg-[rgba(248,244,236,0.82)] backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <Link className="font-serif text-2xl tracking-[0.14em] text-foreground" href="/editorial-home">
          HANIRUM
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          {navItems.map((item) => (
            <Link className="transition-colors hover:text-foreground" href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
                Explore
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Curated Paths</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="#collection">이번 달 선반</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#journal">읽기의 기록</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#newsletter">월간 큐레이션 편지</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="hidden md:block">
          <Button asChild variant="outline">
            <Link href="#newsletter">새로운 큐레이션 받기</Link>
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
              <SheetTitle>HANIRUM</SheetTitle>
              <SheetDescription>조용한 문장과 오래 남는 독서를 위한 프리미엄 에디토리얼 랜딩 샘플</SheetDescription>
            </SheetHeader>
            <div className="mt-10 grid gap-3">
              {navItems.map((item) => (
                <Link
                  className="rounded-2xl border border-border px-4 py-3 text-base text-foreground transition-colors hover:bg-[#efe6d8]"
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
