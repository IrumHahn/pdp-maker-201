import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "테니스 대회 정보",
  description: "한국 아마추어 테니스 대회 일정, 참가비, 참가 조건을 한 화면에서 보는 서비스"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
