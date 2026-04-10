"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import styles from "./pdp-maker.module.css";
import { type PdpClientSettings, maskGeminiApiKey } from "./pdp-settings";
import { validateGeminiApiKey } from "./pdp-utils";

interface PdpSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PdpClientSettings;
  onSave: (settings: PdpClientSettings) => void;
}

export function PdpSettingsSheet({
  open,
  onOpenChange,
  settings,
  onSave
}: PdpSettingsSheetProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
      setErrorMessage("");
      setSuccessMessage("");
      setIsValidating(false);
    }
  }, [open, settings]);

  const maskedCustomApiKey = localSettings.customGeminiApiKey ? maskGeminiApiKey(localSettings.customGeminiApiKey) : "";
  const currentKeyPreview = maskedCustomApiKey || "아직 저장된 개인 Gemini API 키가 없습니다.";

  const handleSave = async () => {
    if (!localSettings.customGeminiApiKey.trim()) {
      setErrorMessage("개인 Gemini API 키를 입력해 주세요.");
      return;
    }

    setIsValidating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const candidateKey = localSettings.customGeminiApiKey.trim();
      const validation = await validateGeminiApiKey(candidateKey);

      if (!validation.ok) {
        setErrorMessage(validation.message);
        return;
      }

      onSave({
        customGeminiApiKey: candidateKey
      });
      setSuccessMessage(validation.message);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gemini API 키 연결 상태를 확인하지 못했습니다.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className={styles.settingsSheet} side="right">
        <SheetHeader className={styles.settingsSheetHeader}>
          <div className={styles.settingsSheetKicker}>
            <KeyRound size={14} />
            설정
          </div>
          <SheetTitle>Gemini API 설정</SheetTitle>
          <SheetDescription>
            이 앱은 서버 기본 키 없이, 사용자 본인의 Gemini API 키로만 동작합니다. 입력한 키는 이 브라우저에만 저장됩니다.
          </SheetDescription>
        </SheetHeader>

        <div className={styles.settingsSheetBody}>
          <section className={styles.settingsCard}>
            <div className={styles.settingsCardHeader}>
              <div>
                <span className={styles.panelLabel}>현재 연결</span>
                <h3 className={styles.settingsCardTitle}>개인 Gemini API 키</h3>
              </div>
              <span className={maskedCustomApiKey ? styles.settingsStatusStrong : styles.settingsStatusSoft}>
                {maskedCustomApiKey ? "저장됨" : "미설정"}
              </span>
            </div>

            <div className={styles.settingsKeyPreview}>
              <strong>현재 표시</strong>
              <code>{currentKeyPreview}</code>
            </div>

            <div className={styles.settingsStatusList}>
              <div className={styles.settingsStatusRow}>
                <UserRound size={14} />
                <span>개인 입력 키</span>
                <strong>{maskedCustomApiKey || "아직 없음"}</strong>
              </div>
            </div>
          </section>

          <section className={styles.settingsCard}>
            <div className={styles.settingsLockedNotice}>
              <ShieldCheck size={16} />
              공개 배포 안전을 위해 서버 기본 키는 완전히 사용하지 않습니다.
            </div>

            <label className={styles.settingsField}>
              <span className={styles.fieldLabel}>Gemini API 키</span>
              <input
                autoComplete="off"
                className={styles.settingsInput}
                disabled={isValidating}
                onChange={(event) => {
                  setLocalSettings({ customGeminiApiKey: event.target.value });
                  if (errorMessage) {
                    setErrorMessage("");
                  }
                  if (successMessage) {
                    setSuccessMessage("");
                  }
                }}
                placeholder="AIza..."
                type="password"
                value={localSettings.customGeminiApiKey}
              />
            </label>

            <p className={styles.settingsHelper}>
              개인 키는 Git에 포함되지 않고, 이 브라우저 localStorage에만 저장됩니다. 저장 전에 Gemini 3.1 Pro Preview와 Gemini 3 Pro Image Preview 접근 가능 여부를 먼저 확인합니다.
            </p>

            {errorMessage ? <div className={styles.settingsError}>{errorMessage}</div> : null}
            {successMessage ? <div className={styles.settingsSuccess}>{successMessage}</div> : null}

            <div className={styles.settingsActions}>
              <button className={styles.secondaryButton} disabled={isValidating} onClick={() => onOpenChange(false)} type="button">
                닫기
              </button>
              <button className={styles.primaryButton} disabled={isValidating} onClick={() => void handleSave()} type="button">
                {isValidating ? "키 확인 중..." : "설정 저장"}
              </button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
