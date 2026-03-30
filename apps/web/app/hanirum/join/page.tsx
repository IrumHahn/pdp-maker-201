import type { Metadata } from "next";
import { HanirumJoinForm } from "../HanirumJoinForm";

export const metadata: Metadata = {
  title: "한이룸 체크인 입력",
  description: "행사 참석자가 이름을 입력해 체크인을 완료하는 페이지"
};

export default function HanirumJoinPage() {
  return <HanirumJoinForm />;
}
