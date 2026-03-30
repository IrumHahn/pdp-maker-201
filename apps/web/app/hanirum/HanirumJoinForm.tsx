"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { CheckInResponse } from "../../lib/hanirum/types";
import styles from "./hanirum.module.css";

export function HanirumJoinForm() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage("이름을 입력해 주세요.");
      setResult(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/hanirum/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: trimmedName
        })
      });
      const payload = (await response.json()) as Partial<CheckInResponse> & { message?: string };

      if (typeof payload.status !== "string") {
        throw new Error(payload.message || "체크인 응답이 올바르지 않습니다.");
      }

      setResult(payload as CheckInResponse);
      setErrorMessage("");
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : "체크인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const success = result?.status === "success" || result?.status === "already_checked_in";

  return (
    <main className={styles.joinPage}>
      <section className={styles.joinCard}>
        <span className={styles.eyebrow}>HANIRUM CHECK-IN</span>
        <h1 className={styles.joinTitle}>이름을 입력하면 체크인이 완료돼요.</h1>
        <p className={styles.joinDescription}>
          체크인이 완료되면 대형 화면의 로비에 내 이름이 적힌 캐릭터가 바로 등장합니다.
        </p>

        <form className={styles.joinForm} onSubmit={handleSubmit}>
          <label className={styles.inputLabel} htmlFor="hanirum-name">
            성함
          </label>
          <input
            autoComplete="name"
            className={styles.nameInput}
            id="hanirum-name"
            inputMode="text"
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 한이룸"
            value={name}
          />
          <button className={styles.submitButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? "확인 중..." : "체크인 완료하기"}
          </button>
        </form>

        {errorMessage ? <div className={styles.errorBanner}>{errorMessage}</div> : null}

        {result ? (
          <section className={success ? styles.resultSuccess : styles.resultNeutral}>
            <p className={styles.resultEyebrow}>
              {result.serviceMode === "google-sheets" ? "GOOGLE SHEETS" : "DEMO MODE"}
            </p>
            <h2 className={styles.resultTitle}>{result.message}</h2>
            {result.attendee ? (
              <p className={styles.resultDescription}>
                {result.attendee.name}님의 캐릭터가 로비에 합류합니다.
                {result.attendee.dinner ? " 저녁 참석 심볼도 함께 표시돼요." : ""}
              </p>
            ) : (
              <p className={styles.resultDescription}>이름 확인이 필요하면 현장 스태프가 바로 도와드릴 수 있어요.</p>
            )}
          </section>
        ) : null}

        <div className={styles.joinFooter}>
          <Link className={styles.backLink} href="/hanirum">
            큰 화면 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
