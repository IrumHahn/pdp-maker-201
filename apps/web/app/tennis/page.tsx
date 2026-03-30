import type { Metadata } from "next";
import { TennisApp } from "../../components/tennis/TennisApp";

export const metadata: Metadata = {
  title: "테니스 대회 정보",
  description: "한국 아마추어 테니스 대회 일정, 참가비, 참가 조건을 바로 확인하는 앱"
};

export default function TennisPage() {
  return <TennisApp />;
}
