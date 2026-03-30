import type { ReactNode } from "react";

export const metadata = {
  title: "한이룸의 소싱 마법사",
  description: "상품 후보 탐색, 한국 시장 검토, 공급처 후보 정리를 한 번에 진행하는 소싱 화면"
};

export default function SourcingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
