"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { CheckInState, LiveFeedEvent, PublicAttendee } from "../../lib/hanirum/types";
import { HanirumSceneCanvas } from "./HanirumSceneCanvas";
import styles from "./hanirum.module.css";

function mergeAttendee(state: CheckInState, attendee: PublicAttendee): CheckInState {
  const existingIndex = state.attendees.findIndex((item) => item.id === attendee.id);
  const attendees =
    existingIndex >= 0
      ? state.attendees.map((item, index) => (index === existingIndex ? attendee : item))
      : [...state.attendees, attendee];
  const checkedInAttendees = attendees.filter((item) => item.checkedIn);

  return {
    ...state,
    attendees,
    checkedInCount: checkedInAttendees.length,
    dinnerCount: checkedInAttendees.filter((item) => item.dinner).length,
    latestGuest: attendee,
    updatedAt: new Date().toISOString()
  };
}

export function HanirumScreen() {
  const [screenState, setScreenState] = useState<CheckInState | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("실시간 연결 준비 중");
  const [highlightName, setHighlightName] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadState = async () => {
      try {
        const response = await fetch("/api/hanirum/state", {
          cache: "no-store"
        });
        const payload = (await response.json()) as CheckInState | { message?: string };

        if (!response.ok) {
          throw new Error("message" in payload && payload.message ? payload.message : "상태를 불러오지 못했습니다.");
        }

        if (isMounted) {
          setScreenState(payload as CheckInState);
          setErrorMessage("");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "상태를 불러오지 못했습니다.");
        }
      }
    };

    void loadState();
    const poll = window.setInterval(() => {
      void loadState();
    }, 20000);

    return () => {
      isMounted = false;
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!screenState?.joinUrl) {
      return;
    }

    let cancelled = false;

    void QRCode.toDataURL(screenState.joinUrl, {
      width: 420,
      margin: 1,
      color: {
        dark: "#12334a",
        light: "#f7f3ea"
      }
    }).then((value: string) => {
      if (!cancelled) {
        setQrImageUrl(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [screenState?.joinUrl]);

  useEffect(() => {
    const source = new EventSource("/api/hanirum/stream");

    source.onopen = () => {
      setConnectionLabel("실시간 연결됨");
    };

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as LiveFeedEvent;

      if (payload.type === "check-in" && payload.attendee) {
        setScreenState((current) => (current ? mergeAttendee(current, payload.attendee as PublicAttendee) : current));
        setHighlightName(payload.attendee.name);
        window.setTimeout(() => {
          setHighlightName((current) => (current === payload.attendee?.name ? "" : current));
        }, 5000);
      }
    };

    source.onerror = () => {
      setConnectionLabel("실시간 재연결 중");
    };

    return () => {
      source.close();
    };
  }, []);

  const displayName = highlightName || screenState?.latestGuest?.name || "첫 번째 입장을 기다리는 중";

  return (
    <main className={styles.screenPage}>
      <section className={styles.screenShell}>
        <div className={styles.screenHeader}>
          <div>
            <span className={styles.eyebrow}>HANIRUM LIVE CHECK-IN</span>
            <h1 className={styles.screenTitle}>QR 체크인을 하면 대형 로비에 내 캐릭터가 등장합니다.</h1>
            <p className={styles.screenDescription}>
              입장한 이름은 왼쪽 상단에 크게 표시되고, 캐릭터는 2층 로비를 돌아다니며 서로 인사합니다.
            </p>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.metaBadge}>{connectionLabel}</span>
            <span className={styles.metaBadge}>
              {screenState?.serviceMode === "google-sheets" ? "구글 시트 연동" : "데모 모드"}
            </span>
          </div>
        </div>

        {errorMessage ? <div className={styles.errorBanner}>{errorMessage}</div> : null}

        {screenState?.serviceMode === "demo" ? (
          <div className={styles.modeBanner}>
            구글 시트 환경변수가 아직 없어 데모 명단으로 동작 중입니다. 실제 운영 시에는 서비스 계정 정보를 넣으면 바로 연결돼요.
          </div>
        ) : null}

        <div className={styles.heroGrid}>
          <section className={styles.latestCard}>
            <p className={styles.latestLabel}>방금 입장한 사람</p>
            <div className={styles.latestNameRow}>
              <h2 className={styles.latestName}>{displayName}</h2>
              {screenState?.latestGuest?.dinner ? <span className={styles.dinnerBadge}>DINNER</span> : null}
            </div>
            <p className={styles.latestHint}>입장 직후 캐릭터가 등장하고, 저녁 참석자는 골드 심볼이 함께 표시됩니다.</p>
            <div className={styles.statsGrid}>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>전체 명단</span>
                <strong className={styles.statValue}>{screenState?.totalGuests ?? "-"}</strong>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>체크인 완료</span>
                <strong className={styles.statValue}>{screenState?.checkedInCount ?? "-"}</strong>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>저녁 참석</span>
                <strong className={styles.statValue}>{screenState?.dinnerCount ?? "-"}</strong>
              </article>
            </div>
          </section>

          <aside className={styles.qrCard}>
            <p className={styles.qrLabel}>휴대폰 카메라로 QR을 스캔해 주세요</p>
            {qrImageUrl ? (
              <img alt="한이룸 체크인 QR 코드" className={styles.qrImage} src={qrImageUrl} />
            ) : (
              <div className={styles.qrPlaceholder}>QR 생성 중</div>
            )}
            <p className={styles.qrHint}>QR을 찍고 이름만 입력하면 출석 체크와 캐릭터 생성이 동시에 진행됩니다.</p>
            <div className={styles.qrLinkBox}>{screenState?.joinUrl ?? "/hanirum/join"}</div>
          </aside>
        </div>

        <section className={styles.sceneSection}>
          <div className={styles.sceneHeader}>
            <div>
              <p className={styles.sceneLabel}>LIVE LOBBY</p>
              <h2 className={styles.sceneTitle}>2층 건물을 내려다보는 체크인 로비</h2>
            </div>
            <p className={styles.sceneHint}>사람들끼리 가까워지면 악수, 손인사, 환영 제스처가 자연스럽게 나옵니다.</p>
          </div>
          <HanirumSceneCanvas attendees={screenState?.attendees ?? []} latestGuestName={displayName} />
        </section>
      </section>
    </main>
  );
}
