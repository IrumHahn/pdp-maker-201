"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Type,
  User
} from "lucide-react";
import { Rnd } from "react-rnd";
import type {
  AspectRatio,
  GeneratedResult,
  ImageGenOptions,
  PdpGenerateImageResponse
} from "@runacademy/shared";
import type {
  FloatingWorkbenchState,
  OverlayTextAlign,
  PdpEditorDraftState,
  TextOverlay,
  WorkbenchTab
} from "./pdp-drafts";
import styles from "./pdp-maker.module.css";
import { apiJson, toDataUrl } from "./pdp-utils";

interface PdpEditorProps {
  initialResult: GeneratedResult;
  aspectRatio: AspectRatio;
  desiredTone: string;
  initialDraftState?: PdpEditorDraftState | null;
  lastSavedAt?: string | null;
  manualSaveToastToken?: number;
  onReset: () => void;
  onDraftStateChange?: (draftState: PdpEditorDraftState) => void;
  onManualSave?: () => void;
  saveState?: "idle" | "saving" | "saved" | "error";
}

const FONT_OPTIONS = [
  { label: "Pretendard", value: "'Pretendard', sans-serif" },
  { label: "Noto Sans KR", value: "'Noto Sans KR', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Monospace", value: "monospace" }
];

const STYLE_OPTIONS: Array<{ value: NonNullable<ImageGenOptions["style"]>; label: string; description: string }> = [
  { value: "studio", label: "스튜디오컷", description: "정제된 배경과 집중도 높은 제품 연출" },
  { value: "lifestyle", label: "라이프스타일컷", description: "실사용 장면과 감정선이 느껴지는 연출" },
  { value: "outdoor", label: "아웃도어컷", description: "씬이 살아있는 외부 공간 연출" }
];

const MODEL_GENDER_OPTIONS: Array<{ value: NonNullable<ImageGenOptions["modelGender"]>; label: string }> = [
  { value: "female", label: "여자 모델" },
  { value: "male", label: "남자 모델" }
];

const MODEL_AGE_OPTIONS: Array<{ value: NonNullable<ImageGenOptions["modelAgeRange"]>; label: string }> = [
  { value: "teen", label: "10대 후반" },
  { value: "20s", label: "20대" },
  { value: "30s", label: "30대" },
  { value: "40s", label: "40대" },
  { value: "50s_plus", label: "50대+" }
];

const MODEL_COUNTRY_OPTIONS: Array<{ value: NonNullable<ImageGenOptions["modelCountry"]>; label: string }> = [
  { value: "korea", label: "한국" },
  { value: "japan", label: "일본" },
  { value: "usa", label: "미국" },
  { value: "france", label: "프랑스" },
  { value: "germany", label: "독일" },
  { value: "africa", label: "아프리카" }
];

const FONT_WEIGHT_OPTIONS = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "700", label: "Bold" },
  { value: "900", label: "Black" }
];

const ALIGN_OPTIONS: Array<{ value: OverlayTextAlign; label: string; Icon: typeof AlignLeft }> = [
  { value: "left", label: "왼쪽", Icon: AlignLeft },
  { value: "center", label: "가운데", Icon: AlignCenter },
  { value: "right", label: "오른쪽", Icon: AlignRight }
];

export function PdpEditor({
  initialResult,
  aspectRatio,
  desiredTone,
  initialDraftState,
  lastSavedAt,
  manualSaveToastToken = 0,
  onReset,
  onDraftStateChange,
  onManualSave,
  saveState = "idle"
}: PdpEditorProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(() => initialDraftState?.currentSectionIndex ?? 0);
  const [sections, setSections] = useState(() =>
    initialDraftState?.sections?.length
      ? initialDraftState.sections.map((section) => ({ ...section }))
      : initialResult.blueprint.sections.map((section) => ({ ...section }))
  );
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState(
    () => initialDraftState?.notice ?? "섹션 컷을 고르고 텍스트를 배치한 뒤 바로 다운로드할 수 있습니다."
  );
  const [sectionOptions, setSectionOptions] = useState<Record<number, ImageGenOptions>>(() => initialDraftState?.sectionOptions ?? {});
  const [overlaysBySection, setOverlaysBySection] = useState<Record<number, TextOverlay[]>>(
    () => initialDraftState?.overlaysBySection ?? {}
  );
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [inspectorSections, setInspectorSections] = useState({
    shotMood: true,
    persona: true
  });
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>(() => initialDraftState?.workbenchTab ?? "image");
  const [workbenchState, setWorkbenchState] = useState<FloatingWorkbenchState>(
    () =>
      initialDraftState?.workbenchState ?? {
        x: 756,
        y: 24,
        width: 332,
        height: 500,
        isOpen: true
      }
  );
  const [showSaveToast, setShowSaveToast] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const resizeSessionRef = useRef<Record<string, { width: number; height: number; fontSize: number }>>({});

  const currentSection = sections[currentSectionIndex];
  const currentOverlays = overlaysBySection[currentSectionIndex] ?? [];
  const selectedOverlay = currentOverlays.find((overlay) => overlay.id === selectedOverlayId) ?? null;
  const generatedCount = sections.filter((section) => Boolean(section.generatedImage)).length;
  const blueprintList = initialResult.blueprint.blueprintList.filter(Boolean);
  const toneLabel = desiredTone || "AI 자동 추천";
  const progressPercent = sections.length ? Math.round(((currentSectionIndex + 1) / sections.length) * 100) : 0;

  useEffect(() => {
    setSelectedOverlayId(null);
    setEditingOverlayId(null);
    setErrorMessage("");
  }, [currentSectionIndex]);

  useEffect(() => {
    if (!selectedOverlay) {
      return;
    }

    setWorkbenchState((current) => ({
      ...current,
      isOpen: true
    }));
  }, [currentSectionIndex, selectedOverlayId]);

  useEffect(() => {
    if (!previewStageRef.current) {
      return;
    }

    setWorkbenchState((current) => clampWorkbenchToStage(current, previewStageRef.current));
  }, [currentSectionIndex, currentSection.generatedImage]);

  useEffect(() => {
    onDraftStateChange?.({
      currentSectionIndex,
      sections,
      sectionOptions,
      overlaysBySection,
      notice,
      workbenchTab,
      workbenchState
    });
  }, [currentSectionIndex, notice, onDraftStateChange, overlaysBySection, sectionOptions, sections, workbenchState, workbenchTab]);

  useEffect(() => {
    if (!manualSaveToastToken) {
      return;
    }

    setShowSaveToast(true);
    const timeout = window.setTimeout(() => {
      setShowSaveToast(false);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [manualSaveToastToken]);

  const currentOptions = useMemo(() => {
    return (
      sectionOptions[currentSectionIndex] ?? {
        style: "studio",
        withModel: currentSectionIndex === 0,
        modelGender: "female",
        modelAgeRange: "20s",
        modelCountry: "korea"
      }
    );
  }, [currentSectionIndex, sectionOptions]);

  if (!currentSection) {
    return (
      <main className={styles.page}>
        <section className={styles.editorShell}>
          <div className={styles.errorBanner}>섹션 정보를 불러오지 못했습니다.</div>
        </section>
      </main>
    );
  }

  const setCurrentOptions = (updates: Partial<ImageGenOptions>) => {
    setSectionOptions((current) => ({
      ...current,
      [currentSectionIndex]: {
        ...currentOptions,
        ...updates
      }
    }));
  };

  const stopShellClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const toggleInspectorSection = (key: keyof typeof inspectorSections) => {
    setInspectorSections((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const openWorkbench = (tab: WorkbenchTab) => {
    setWorkbenchTab(tab);
    setWorkbenchState((current) => {
      const fallback = getWorkbenchPosition(previewStageRef.current);

      return {
        ...(current.isOpen ? current : fallback),
        isOpen: true
      };
    });
  };

  const snapWorkbenchToEdge = () => {
    const nextPosition = getWorkbenchPosition(previewStageRef.current);
    setWorkbenchState((current) => ({
      ...current,
      ...nextPosition,
      isOpen: true
    }));
  };

  const snapWorkbenchToOverlay = () => {
    if (!selectedOverlay) {
      return;
    }

    setWorkbenchState((current) => ({
      ...current,
      ...anchorWorkbenchToOverlay(selectedOverlay, imageContainerRef.current, previewStageRef.current, current),
      isOpen: true
    }));
  };

  const renderWorkbenchBody = () => {
    switch (workbenchTab) {
      case "image":
        return (
          <div className={styles.workbenchSectionStack}>
            <div className={styles.optionSummaryBar}>
              <span className={styles.summaryChip}>
                {STYLE_OPTIONS.find((option) => option.value === currentOptions.style)?.label ?? "스튜디오컷"}
              </span>
              <span className={styles.summaryChip}>{selectedModelSummary}</span>
            </div>

            <div className={styles.optionSurface}>
              <div className={styles.optionSectionHeader}>
                <div>
                  <span className={styles.optionSectionEyebrow}>샷 타입</span>
                  <strong>배경과 연출 무드</strong>
                </div>
                <button className={styles.sectionToggleButton} onClick={() => toggleInspectorSection("shotMood")} type="button">
                  {inspectorSections.shotMood ? "숨기기" : "보이기"}
                  {inspectorSections.shotMood ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
              {inspectorSections.shotMood ? (
                <div className={styles.styleOptionGrid}>
                  {STYLE_OPTIONS.map((style) => (
                    <button
                      className={currentOptions.style === style.value ? styles.styleCardActive : styles.styleCard}
                      key={style.value}
                      onClick={() => setCurrentOptions({ style: style.value })}
                      type="button"
                    >
                      <strong>{style.label}</strong>
                      <small>{style.description}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.collapsedHint}>현재 선택: {STYLE_OPTIONS.find((style) => style.value === currentOptions.style)?.label ?? "스튜디오컷"}</p>
              )}
            </div>

            <div className={styles.optionSurface}>
              <div className={styles.optionSectionHeader}>
                <div>
                  <span className={styles.optionSectionEyebrow}>모델 설정</span>
                  <strong>타깃 페르소나 지정</strong>
                </div>
                <div className={styles.optionHeaderTools}>
                  <User size={16} />
                  <button className={styles.sectionToggleButton} onClick={() => toggleInspectorSection("persona")} type="button">
                    {inspectorSections.persona ? "숨기기" : "보이기"}
                    {inspectorSections.persona ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
              {inspectorSections.persona ? (
                <>
                  <label className={styles.toggleCard}>
                    <div className={styles.toggleCardCopy}>
                      <strong>모델컷 포함</strong>
                      <span>제품과 함께 연출되는 인물컷이 필요한 경우 켜 두세요.</span>
                    </div>
                    <input
                      checked={currentOptions.withModel}
                      onChange={(event) => setCurrentOptions({ withModel: event.target.checked })}
                      type="checkbox"
                    />
                  </label>

                  {currentOptions.withModel ? (
                    <div className={styles.optionStack}>
                      <div className={styles.optionFieldBlock}>
                        <span className={styles.optionMiniLabel}>성별</span>
                        <div className={styles.segmentedRow}>
                          {MODEL_GENDER_OPTIONS.map((option) => (
                            <button
                              className={currentOptions.modelGender === option.value ? styles.segmentedButtonActive : styles.segmentedButton}
                              key={option.value}
                              onClick={() => setCurrentOptions({ modelGender: option.value })}
                              type="button"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.optionFieldBlock}>
                        <span className={styles.optionMiniLabel}>연령대</span>
                        <div className={styles.segmentedGridCompact}>
                          {MODEL_AGE_OPTIONS.map((option) => (
                            <button
                              className={currentOptions.modelAgeRange === option.value ? styles.segmentedButtonActive : styles.segmentedButton}
                              key={option.value}
                              onClick={() => setCurrentOptions({ modelAgeRange: option.value })}
                              type="button"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.optionFieldBlock}>
                        <div className={styles.optionFieldHeader}>
                          <span className={styles.optionMiniLabel}>국가</span>
                          <Globe2 size={14} />
                        </div>
                        <div className={styles.countryGrid}>
                          {MODEL_COUNTRY_OPTIONS.map((option) => (
                            <button
                              className={currentOptions.modelCountry === option.value ? styles.countryCardActive : styles.countryCard}
                              key={option.value}
                              onClick={() => setCurrentOptions({ modelCountry: option.value })}
                              type="button"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={styles.collapsedHint}>현재 설정: {selectedModelSummary}</p>
              )}
            </div>

            <button className={styles.primaryButtonWide} disabled={isGeneratingImage} onClick={handleGenerateImage} type="button">
              {isGeneratingImage ? <Loader2 className={styles.spinIcon} size={16} /> : currentSection.generatedImage ? <RefreshCw size={16} /> : <ImageIcon size={16} />}
              {currentSection.generatedImage ? "이미지 다시 만들기" : "이미지 생성하기"}
            </button>

            <p className={styles.inspectorHelper}>섹션 헤드라인과 지금 선택한 모델 조건을 반영해 현재 컷만 다시 생성합니다.</p>
          </div>
        );
      case "layer":
        return selectedOverlay ? (
          <div className={styles.workbenchSectionStack}>
            <div className={styles.toolbarRow}>
              <button className={styles.inlineButton} onClick={snapWorkbenchToOverlay} type="button">
                <RefreshCw size={14} />
                텍스트 옆으로 붙이기
              </button>
              <button className={styles.inlineDangerButton} onClick={() => deleteOverlay(selectedOverlay.id)} type="button">
                <Trash2 size={14} />
                삭제
              </button>
            </div>

            <label className={styles.floatingField}>
              <span className={styles.optionMiniLabel}>텍스트 내용</span>
              <textarea
                className={styles.floatingTextarea}
                onChange={(event) => updateOverlay(selectedOverlay.id, { text: event.target.value })}
                rows={3}
                value={selectedOverlay.text}
              />
            </label>

            <div className={styles.floatingCompactGrid}>
              <label className={styles.floatingField}>
                <span className={styles.optionMiniLabel}>폰트</span>
                <select
                  className={styles.select}
                  onChange={(event) => updateOverlay(selectedOverlay.id, { fontFamily: event.target.value })}
                  value={selectedOverlay.fontFamily}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.floatingField}>
                <span className={styles.optionMiniLabel}>굵기</span>
                <select
                  className={styles.select}
                  onChange={(event) => updateOverlay(selectedOverlay.id, { fontWeight: event.target.value })}
                    value={selectedOverlay.fontWeight}
                  >
                    {FONT_WEIGHT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.floatingCompactGrid}>
              <label className={styles.floatingField}>
                <span className={styles.optionMiniLabel}>폭</span>
                <input
                  className={styles.input}
                  min={80}
                  onChange={(event) =>
                    updateOverlay(selectedOverlay.id, {
                      width: clampValue(Number(event.target.value) || 320, 80, 1200)
                    })
                  }
                  type="number"
                  value={toNumericSize(selectedOverlay.width, 320)}
                />
              </label>

              <label className={styles.floatingField}>
                <span className={styles.optionMiniLabel}>크기</span>
                <div className={styles.rangeField}>
                  <input
                    className={styles.rangeInput}
                    max={180}
                    min={10}
                    onChange={(event) => updateOverlay(selectedOverlay.id, { fontSize: Number(event.target.value) || 16 })}
                    type="range"
                    value={selectedOverlay.fontSize}
                  />
                  <input
                    className={styles.input}
                    min={10}
                    onChange={(event) => updateOverlay(selectedOverlay.id, { fontSize: Number(event.target.value) || 16 })}
                    type="number"
                    value={selectedOverlay.fontSize}
                  />
                </div>
              </label>

              <label className={styles.floatingField}>
                <span className={styles.optionMiniLabel}>줄 간격</span>
                <div className={styles.rangeField}>
                  <input
                    className={styles.rangeInput}
                    max={3}
                    min={0.8}
                    onChange={(event) => updateOverlay(selectedOverlay.id, { lineHeight: Number(event.target.value) || 1.2 })}
                    step={0.1}
                    type="range"
                    value={selectedOverlay.lineHeight}
                  />
                  <input
                    className={styles.input}
                    max={3}
                    min={0.8}
                    onChange={(event) => updateOverlay(selectedOverlay.id, { lineHeight: Number(event.target.value) || 1.2 })}
                    step={0.1}
                    type="number"
                    value={selectedOverlay.lineHeight}
                  />
                </div>
              </label>
            </div>

            <div className={styles.floatingCompactGrid}>
              <label className={styles.floatingField}>
                <span className={styles.optionMiniLabel}>글자색</span>
                <div className={styles.colorControlRow}>
                  <input
                    className={styles.colorInputLarge}
                    onChange={(event) => updateOverlay(selectedOverlay.id, { color: event.target.value })}
                    type="color"
                    value={selectedOverlay.color}
                  />
                  <code>{selectedOverlay.color}</code>
                </div>
              </label>

              <label className={styles.floatingField}>
                <span className={styles.optionMiniLabel}>배경색</span>
                <div className={styles.colorControlRow}>
                  <input
                    className={styles.colorInputLarge}
                    onChange={(event) => updateOverlay(selectedOverlay.id, { backgroundColor: event.target.value })}
                    type="color"
                    value={
                      selectedOverlay.backgroundColor === "transparent"
                        ? "#ffffff"
                        : selectedOverlay.backgroundColor
                    }
                  />
                  <button
                    className={
                      selectedOverlay.backgroundColor === "transparent" ? styles.ghostButtonActive : styles.ghostButton
                    }
                    onClick={() => updateOverlay(selectedOverlay.id, { backgroundColor: "transparent" })}
                    type="button"
                  >
                    투명
                  </button>
                </div>
              </label>
            </div>

            <div className={styles.floatingField}>
              <span className={styles.optionMiniLabel}>정렬</span>
              <div className={styles.alignButtonGroup}>
                {ALIGN_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    className={selectedOverlay.textAlign === value ? styles.alignButtonActive : styles.alignButton}
                    key={value}
                    onClick={() => updateOverlay(selectedOverlay.id, { textAlign: value })}
                    type="button"
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.inspectorEmpty}>
            <Type size={18} />
            <div>
              <strong>텍스트를 선택해 주세요</strong>
              <p>캔버스의 문구를 클릭하면 이 패널에서 바로 편집할 수 있습니다.</p>
            </div>
          </div>
        );
      case "copy":
        return (
          <div className={styles.copyLibrary}>
            <div className={styles.copySection}>
              <p className={styles.cardLabel}>Headline</p>
              <button className={styles.copyBlock} onClick={() => handleAddTextOverlay(currentSection.headline, "headline")} type="button">
                {currentSection.headline}
              </button>
            </div>

            <div className={styles.copySection}>
              <p className={styles.cardLabel}>Subheadline</p>
              <button className={styles.copyBlockSoft} onClick={() => handleAddTextOverlay(currentSection.subheadline, "subheadline")} type="button">
                {currentSection.subheadline}
              </button>
            </div>

            {currentSection.bullets.length ? (
              <div className={styles.copySection}>
                <p className={styles.cardLabel}>Key Points</p>
                <div className={styles.bulletStack}>
                  {currentSection.bullets.map((bullet, index) => (
                    <button className={styles.bulletButton} key={`${bullet}-${index}`} onClick={() => handleAddTextOverlay(bullet, "keypoint")} type="button">
                      <CheckCircle2 size={14} />
                      {bullet}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {currentSection.trust_or_objection_line ? (
              <div className={styles.trustBox}>
                <p className={styles.cardLabel}>Trust / Objection</p>
                <p>{currentSection.trust_or_objection_line}</p>
              </div>
            ) : null}

            {currentSection.CTA ? (
              <button className={styles.ctaPreview} type="button">
                {currentSection.CTA}
              </button>
            ) : null}
          </div>
        );
      case "guide":
      default:
        return (
          <div className={styles.workbenchSectionStack}>
            <div className={styles.guidelineGrid}>
              <div>
                <strong>Image Purpose</strong>
                <p>{currentSection.purpose}</p>
              </div>
              <div>
                <strong>On-Image Text</strong>
                <p>{currentSection.on_image_text}</p>
              </div>
              <div>
                <strong>Layout Notes</strong>
                <p>{currentSection.layout_notes}</p>
              </div>
              <div>
                <strong>Style Guide</strong>
                <p>{currentSection.style_guide}</p>
              </div>
            </div>

            {currentSection.compliance_notes ? (
              <div className={styles.warningBox}>
                <strong>Compliance Notes</strong>
                <p>{currentSection.compliance_notes}</p>
              </div>
            ) : null}
          </div>
        );
    }
  };

  const selectedModelSummary = currentOptions.withModel
    ? `${getModelCountryLabel(currentOptions.modelCountry)} ${getModelAgeLabel(currentOptions.modelAgeRange)} ${getModelGenderLabel(currentOptions.modelGender)}`
    : "모델 없이 제품 중심";

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setErrorMessage("");

    try {
      const response = await apiJson<PdpGenerateImageResponse>("/pdp/images", {
        method: "POST",
        body: JSON.stringify({
          originalImageBase64: initialResult.originalImage,
          section: currentSection,
          aspectRatio,
          desiredTone: desiredTone || undefined,
          options: {
            ...currentOptions,
            headline: currentSection.headline,
            subheadline: currentSection.subheadline,
            isRegeneration: Boolean(currentSection.generatedImage)
          }
        })
      });

      setIsGeneratingImage(false);

      if (!response.ok) {
        setErrorMessage(response.message);
        return;
      }

      setSections((current) =>
        current.map((section, index) =>
          index === currentSectionIndex
            ? {
                ...section,
                generatedImage: toDataUrl(response.mimeType, response.imageBase64)
              }
            : section
        )
      );
      setNotice(`${currentSection.section_name} 이미지를 새 옵션으로 업데이트했습니다.`);
    } catch (error) {
      setIsGeneratingImage(false);
      setErrorMessage(error instanceof Error ? error.message : "이미지를 다시 만들지 못했습니다.");
    }
  };

  const handleAddTextOverlay = (text: string, type: "headline" | "subheadline" | "keypoint" | "default" = "default") => {
    if (!currentSection.generatedImage) {
      setErrorMessage("이미지를 먼저 생성해야 텍스트를 올릴 수 있습니다.");
      return;
    }

    const defaultFontSize =
      type === "headline" ? 42 : type === "subheadline" ? 24 : type === "keypoint" ? 18 : 20;
    const displayText = type === "keypoint" ? `• ${text}` : text;
    const defaultFontWeight = type === "subheadline" ? "500" : "700";
    const estimatedBox = estimateOverlayBox(displayText, {
      fontSize: defaultFontSize,
      fontWeight: defaultFontWeight,
      fontFamily: "'Pretendard', sans-serif",
      lineHeight: 1.2,
      maxWidth: type === "headline" ? 360 : type === "subheadline" ? 320 : 280
    });

    const newOverlay: TextOverlay = {
      id: crypto.randomUUID(),
      text: displayText,
      x: 52,
      y: 52,
      width: estimatedBox.width,
      height: estimatedBox.height,
      fontSize: defaultFontSize,
      color: "#ffffff",
      backgroundColor: "transparent",
      fontFamily: "'Pretendard', sans-serif",
      fontWeight: defaultFontWeight,
      textAlign: "left",
      lineHeight: 1.2
    };

    setOverlaysBySection((current) => ({
      ...current,
      [currentSectionIndex]: [...(current[currentSectionIndex] ?? []), newOverlay]
    }));
    setSelectedOverlayId(newOverlay.id);
    setWorkbenchState((current) => ({
      ...current,
      isOpen: true
    }));
    setNotice("텍스트를 추가했습니다. 워크벤치에서 바로 폰트와 크기를 조정해 보세요.");
  };

  const updateOverlay = (overlayId: string, updates: Partial<TextOverlay>) => {
    setOverlaysBySection((current) => ({
      ...current,
      [currentSectionIndex]: (current[currentSectionIndex] ?? []).map((overlay) =>
        overlay.id === overlayId ? { ...overlay, ...updates } : overlay
      )
    }));
  };

  const deleteOverlay = (overlayId: string) => {
    setOverlaysBySection((current) => ({
      ...current,
      [currentSectionIndex]: (current[currentSectionIndex] ?? []).filter((overlay) => overlay.id !== overlayId)
    }));
    if (selectedOverlayId === overlayId) {
      setSelectedOverlayId(null);
      setEditingOverlayId(null);
    }
  };

  const handleResizeStart = (overlay: TextOverlay) => {
    resizeSessionRef.current[overlay.id] = {
      width: toNumericSize(overlay.width, 320),
      height: toNumericSize(overlay.height, 92),
      fontSize: overlay.fontSize
    };
  };

  const handleResize = (
    overlay: TextOverlay,
    direction: string,
    ref: HTMLElement,
    position: { x: number; y: number }
  ) => {
    const base = resizeSessionRef.current[overlay.id] ?? {
      width: toNumericSize(overlay.width, 320),
      height: toNumericSize(overlay.height, 92),
      fontSize: overlay.fontSize
    };

    const nextWidth = ref.offsetWidth;
    const nextHeight = ref.offsetHeight;
    const isHorizontalOnly = direction === "left" || direction === "right";
    const isVerticalOnly = direction === "top" || direction === "bottom";

    if (isHorizontalOnly) {
      updateOverlay(overlay.id, {
        width: nextWidth,
        x: position.x
      });
      return;
    }

    if (isVerticalOnly) {
      updateOverlay(overlay.id, {
        height: nextHeight,
        y: position.y
      });
      return;
    }

    const scale = Math.max(nextWidth / Math.max(base.width, 1), nextHeight / Math.max(base.height, 1));
    const nextFontSize = clampValue(Math.round(base.fontSize * scale), 10, 180);

    updateOverlay(overlay.id, {
      width: nextWidth,
      height: nextHeight,
      x: position.x,
      y: position.y,
      fontSize: nextFontSize
    });
  };

  const handleResizeStop = (overlayId: string) => {
    delete resizeSessionRef.current[overlayId];
  };

  const handleDownload = async () => {
    if (!imageContainerRef.current || !currentSection.generatedImage) {
      return;
    }

    try {
      const previousSelected = selectedOverlayId;
      setSelectedOverlayId(null);
      setEditingOverlayId(null);
      await new Promise((resolve) => setTimeout(resolve, 80));

      const canvas = await html2canvas(imageContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2
      });

      if (previousSelected) {
        setSelectedOverlayId(previousSelected);
      }

      const link = document.createElement("a");
      link.download = `pdp-${currentSection.section_id.toLowerCase()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.92);
      link.click();
      setNotice(`${currentSection.section_name} 컷을 다운로드했습니다.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "이미지를 다운로드하지 못했습니다.");
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.editorShell} onClick={() => setSelectedOverlayId(null)}>
        <header className={styles.editorHeader} onClick={stopShellClick}>
          <div>
            <span className={styles.toolKicker}>팀 한이룸</span>
            <h1 className={styles.editorHeading}>상세페이지 마법사 2.0</h1>
            <p className={styles.editorSubcopy}>섹션 컷을 고르고 텍스트를 배치한 뒤 바로 완성본을 저장하세요.</p>
          </div>

          <div className={styles.editorHeaderMeta}>
            <span className={styles.metaPill}>비율 {aspectRatio}</span>
            <span className={styles.metaPill}>톤 {toneLabel}</span>
            <span className={styles.metaPill}>생성됨 {generatedCount}/{sections.length}</span>
            {lastSavedAt ? <span className={styles.metaPill}>최근 저장 {formatSavedAt(lastSavedAt)}</span> : null}
            {saveState === "saving" ? <span className={styles.metaPill}>저장 중</span> : null}
          </div>

          <div className={styles.topbarActions}>
            {onManualSave ? (
              <button className={`${styles.secondaryButton} ${styles.headerActionButton} ${styles.headerSaveButton}`} disabled={saveState === "saving"} onClick={onManualSave} type="button">
                {saveState === "saving" ? <Loader2 className={styles.spinIcon} size={16} /> : <Save size={16} />}
                작업 저장하기
              </button>
            ) : null}
            <button className={styles.primaryButton} onClick={handleDownload} type="button" disabled={!currentSection.generatedImage}>
              <Download size={16} />
              현재 섹션 다운로드
            </button>
          </div>
        </header>

        {showSaveToast ? <div className={styles.saveToast}>저장되었습니다.</div> : null}

        <div className={styles.noticeRow} onClick={stopShellClick}>
          <div className={styles.noticeBanner}>{notice}</div>
          {errorMessage ? (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className={styles.editorLayout}>
          <aside className={styles.sectionRail} onClick={stopShellClick}>
            <div className={styles.railCard}>
              <p className={styles.sidebarLabel}>현재 섹션</p>
              <h2 className={styles.railTitle}>{currentSection.section_name}</h2>
              <p className={styles.railDescription}>{currentSection.goal}</p>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
              </div>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span>현재 섹션</span>
                  <strong>
                    {currentSectionIndex + 1}/{sections.length}
                  </strong>
                </div>
                <div className={styles.metricCard}>
                  <span>텍스트</span>
                  <strong>{currentOverlays.length}</strong>
                </div>
              </div>
            </div>

            <div className={styles.sectionRailCard}>
              <p className={styles.sidebarLabel}>섹션 목록</p>
              <div className={styles.sectionList}>
                {sections.map((section, index) => (
                  <button
                    className={index === currentSectionIndex ? styles.sectionButtonActive : styles.sectionButton}
                    key={section.section_id}
                    onClick={() => setCurrentSectionIndex(index)}
                    type="button"
                  >
                    <span className={styles.sectionStep}>
                      {section.generatedImage && index !== currentSectionIndex ? <CheckCircle2 size={12} /> : index + 1}
                    </span>
                    <span className={styles.sectionButtonCopy}>
                      <strong>{section.section_name}</strong>
                      <small>{section.goal || "전환 목적을 정리한 섹션"}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <details className={styles.analysisDisclosure}>
              <summary className={styles.disclosureSummary}>
                <Sparkles size={16} />
                AI 분석 요약 보기
              </summary>
              <div className={styles.analysisBody}>
                <p className={styles.summaryText}>{initialResult.blueprint.executiveSummary}</p>

                {blueprintList.length ? (
                  <div className={styles.blueprintList}>
                    {blueprintList.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                ) : null}

                <div className={styles.scoreStack}>
                  {initialResult.blueprint.scorecard.map((item) => (
                    <article className={styles.scoreCard} key={`${item.category}-${item.score}`}>
                      <div className={styles.scoreRow}>
                        <strong>{item.category}</strong>
                        <span
                          className={
                            item.score.startsWith("A")
                              ? styles.scoreBadgeStrong
                              : item.score.startsWith("B")
                                ? styles.scoreBadgeMid
                                : styles.scoreBadgeSoft
                          }
                        >
                          {item.score}
                        </span>
                      </div>
                      <p>{item.reason}</p>
                    </article>
                  ))}
                </div>
              </div>
            </details>
          </aside>

          <section className={styles.canvasColumn}>
            <article className={styles.canvasPanel}>
              <div className={styles.canvasHeader}>
                <div>
                  <p className={styles.panelLabel}>편집 섹션</p>
                  <h2 className={styles.panelTitle}>{currentSection.section_name}</h2>
                  <p className={styles.panelDescription}>{currentSection.goal}</p>
                </div>

                <div className={styles.canvasActions}>
                  <button
                    className={styles.navButton}
                    disabled={currentSectionIndex === 0}
                    onClick={() => setCurrentSectionIndex((current) => Math.max(0, current - 1))}
                    type="button"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className={styles.metaPill}>
                    {currentSectionIndex + 1}/{sections.length}
                  </span>
                  <button
                    className={styles.navButton}
                    disabled={currentSectionIndex === sections.length - 1}
                    onClick={() => setCurrentSectionIndex((current) => Math.min(sections.length - 1, current + 1))}
                    type="button"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className={styles.previewStage} ref={previewStageRef}>
                <div className={styles.workbenchDock}>
                  <button
                    className={workbenchTab === "image" && workbenchState.isOpen ? styles.workbenchDockButtonActive : styles.workbenchDockButton}
                    onClick={() => openWorkbench("image")}
                    type="button"
                  >
                    <Settings2 size={15} />
                    이미지
                  </button>
                  <button
                    className={workbenchTab === "layer" && workbenchState.isOpen ? styles.workbenchDockButtonActive : styles.workbenchDockButton}
                    onClick={() => openWorkbench("layer")}
                    type="button"
                  >
                    <Type size={15} />
                    텍스트 편집
                  </button>
                  <button
                    className={workbenchTab === "copy" && workbenchState.isOpen ? styles.workbenchDockButtonActive : styles.workbenchDockButton}
                    onClick={() => openWorkbench("copy")}
                    type="button"
                  >
                    <Sparkles size={15} />
                    카피
                  </button>
                  <button
                    className={workbenchTab === "guide" && workbenchState.isOpen ? styles.workbenchDockButtonActive : styles.workbenchDockButton}
                    onClick={() => openWorkbench("guide")}
                    type="button"
                  >
                    <Palette size={15} />
                    가이드
                  </button>
                </div>

                {currentSection.generatedImage ? (
                  <div className={styles.imageCanvas} ref={imageContainerRef}>
                    <img
                      alt={currentSection.section_name}
                      className={styles.sectionImage}
                      draggable={false}
                      src={currentSection.generatedImage}
                    />

                    {currentOverlays.map((overlay) => (
                      <Rnd
                        bounds="parent"
                        className={`${styles.overlayBox} ${selectedOverlayId === overlay.id ? styles.overlaySelected : ""}`}
                        enableUserSelectHack={false}
                        enableResizing={
                          selectedOverlayId === overlay.id
                            ? {
                                top: false,
                                right: true,
                                bottom: false,
                                left: true,
                                topRight: true,
                                bottomRight: true,
                                bottomLeft: true,
                                topLeft: true
                              }
                            : false
                        }
                        key={overlay.id}
                        onClick={(event: ReactMouseEvent<HTMLDivElement>) => {
                          event.stopPropagation();
                          setSelectedOverlayId(overlay.id);
                        }}
                        onDragStart={() => setSelectedOverlayId(overlay.id)}
                        onDragStop={(_, data) => updateOverlay(overlay.id, { x: data.x, y: data.y })}
                        onResize={(_, direction, ref, __, position) => handleResize(overlay, direction, ref, position)}
                        onResizeStart={() => handleResizeStart(overlay)}
                        onResizeStop={(_, direction, ref, __, position) => {
                          handleResize(overlay, direction, ref, position);
                          handleResizeStop(overlay.id);
                        }}
                        position={{ x: overlay.x, y: overlay.y }}
                        resizeHandleClasses={{
                          left: styles.resizeHandleLeft,
                          right: styles.resizeHandleRight,
                          topLeft: styles.resizeHandleTopLeft,
                          topRight: styles.resizeHandleTopRight,
                          bottomLeft: styles.resizeHandleBottomLeft,
                          bottomRight: styles.resizeHandleBottomRight
                        }}
                        size={{ width: overlay.width, height: overlay.height }}
                      >
                        <div
                          className={`${editingOverlayId === overlay.id ? styles.overlayEditing : styles.overlayContent} ${styles.overlayDragSurface}`}
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            setSelectedOverlayId(overlay.id);
                            setEditingOverlayId(overlay.id);
                          }}
                          style={buildOverlayStyle(overlay)}
                        >
                          {editingOverlayId === overlay.id ? (
                            <textarea
                              autoFocus
                              className={styles.overlayTextarea}
                              onBlur={() => setEditingOverlayId(null)}
                              onChange={(event) => updateOverlay(overlay.id, { text: event.target.value })}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  setEditingOverlayId(null);
                                }
                              }}
                              value={overlay.text}
                            />
                          ) : (
                            overlay.text
                          )}
                        </div>
                      </Rnd>
                    ))}

                  </div>
                ) : (
                  <div className={styles.placeholderPanel}>
                    <div className={styles.placeholderIcon}>
                      <ImageIcon size={28} />
                    </div>
                    <strong>이 섹션의 이미지를 아직 만들지 않았습니다.</strong>
                    <p>이미지 생성 옵션을 정하고 이미지를 만들면, 캔버스 안에서 바로 텍스트를 얹고 편집할 수 있습니다.</p>
                  </div>
                )}

                {workbenchState.isOpen ? (
                  <Rnd
                    bounds="parent"
                    className={styles.workbenchShell}
                    dragHandleClassName={styles.workbenchHandle}
                    enableResizing={{
                      top: false,
                      right: true,
                      bottom: true,
                      left: false,
                      topRight: false,
                      bottomRight: true,
                      bottomLeft: false,
                      topLeft: false
                    }}
                    minHeight={420}
                    minWidth={320}
                    onDragStop={(_, data) =>
                      setWorkbenchState((current) => ({
                        ...current,
                        x: data.x,
                        y: data.y
                      }))
                    }
                    onResizeStop={(_, __, ref, ___, position) =>
                      setWorkbenchState((current) => ({
                        ...current,
                        x: position.x,
                        y: position.y,
                        width: ref.offsetWidth,
                        height: ref.offsetHeight
                      }))
                    }
                    position={{ x: workbenchState.x, y: workbenchState.y }}
                    size={{ width: workbenchState.width, height: workbenchState.height }}
                  >
                    <div className={styles.workbenchPanel} onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
                      <div className={styles.workbenchHandle}>
                        <div className={styles.workbenchHandleCopy}>
                          <span className={styles.optionMiniLabel}>Canvas Workbench</span>
                          <strong>
                            {workbenchTab === "image"
                              ? "이미지 옵션"
                              : workbenchTab === "layer"
                                ? "텍스트 편집"
                                : workbenchTab === "copy"
                                  ? "카피 라이브러리"
                                  : "섹션 가이드"}
                          </strong>
                        </div>
                        <div className={styles.workbenchHeaderActions}>
                          <button
                            className={styles.inlineButton}
                            onClick={workbenchTab === "layer" && selectedOverlay ? snapWorkbenchToOverlay : snapWorkbenchToEdge}
                            type="button"
                          >
                            <RefreshCw size={14} />
                            옆으로 붙이기
                          </button>
                          <button
                            className={styles.inlineButton}
                            onClick={() =>
                              setWorkbenchState((current) => ({
                                ...current,
                                isOpen: false
                              }))
                            }
                            type="button"
                          >
                            닫기
                          </button>
                        </div>
                      </div>

                      <div className={styles.workbenchTabs}>
                        <button
                          className={workbenchTab === "image" ? styles.workbenchTabActive : styles.workbenchTab}
                          onClick={() => setWorkbenchTab("image")}
                          type="button"
                        >
                          <Settings2 size={15} />
                          이미지
                        </button>
                        <button
                          className={workbenchTab === "layer" ? styles.workbenchTabActive : styles.workbenchTab}
                          onClick={() => setWorkbenchTab("layer")}
                          type="button"
                        >
                          <Type size={15} />
                          텍스트 편집
                        </button>
                        <button
                          className={workbenchTab === "copy" ? styles.workbenchTabActive : styles.workbenchTab}
                          onClick={() => setWorkbenchTab("copy")}
                          type="button"
                        >
                          <Sparkles size={15} />
                          카피
                        </button>
                        <button
                          className={workbenchTab === "guide" ? styles.workbenchTabActive : styles.workbenchTab}
                          onClick={() => setWorkbenchTab("guide")}
                          type="button"
                        >
                          <Palette size={15} />
                          가이드
                        </button>
                      </div>

                      <div className={styles.workbenchBody}>{renderWorkbenchBody()}</div>
                    </div>
                  </Rnd>
                ) : null}
              </div>

              <div className={styles.canvasFooter}>
                <span className={styles.footerStatus}>{currentSection.generatedImage ? "이미지 준비 완료" : "이미지 생성 필요"}</span>
                <span className={styles.footerStatus}>텍스트 {currentOverlays.length}개</span>
                <span className={styles.footerStatus}>{workbenchState.isOpen ? "플로팅 워크벤치 열림" : "플로팅 워크벤치 닫힘"}</span>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}

function buildOverlayStyle(overlay: TextOverlay): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    padding: "6px 10px",
    color: overlay.color,
    backgroundColor: overlay.backgroundColor,
    fontFamily: overlay.fontFamily,
    fontSize: `${overlay.fontSize}px`,
    fontWeight: overlay.fontWeight,
    lineHeight: overlay.lineHeight,
    textAlign: overlay.textAlign,
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      overlay.textAlign === "center" ? "center" : overlay.textAlign === "right" ? "flex-end" : "flex-start",
    borderRadius: "10px",
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all"
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumericSize(value: number | string, fallback: number) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function estimateOverlayBox(
  text: string,
  options: {
    fontSize: number;
    fontWeight: string;
    fontFamily: string;
    lineHeight: number;
    maxWidth: number;
  }
) {
  const horizontalPadding = 20;
  const verticalPadding = 12;
  const availableLineWidth = Math.max(120, options.maxWidth - horizontalPadding);
  const lines = text.split("\n").map((line) => line.trimEnd());
  const measure = createTextMeasure(options);

  let wrappedLineCount = 0;
  let widestLine = 0;

  lines.forEach((line) => {
    const targetLine = line || " ";
    const measuredWidth = measure(targetLine);
    widestLine = Math.max(widestLine, Math.min(measuredWidth, availableLineWidth));
    wrappedLineCount += Math.max(1, Math.ceil(measuredWidth / availableLineWidth));
  });

  const lineHeightPx = options.fontSize * options.lineHeight;

  return {
    width: Math.round(clampValue(widestLine + horizontalPadding, 96, options.maxWidth)),
    height: Math.round(clampValue(wrappedLineCount * lineHeightPx + verticalPadding, 40, 220))
  };
}

function createTextMeasure(options: { fontSize: number; fontWeight: string; fontFamily: string }) {
  if (typeof document === "undefined") {
    return (text: string) => Math.max(options.fontSize * 1.6, text.length * options.fontSize * 0.58);
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return (text: string) => Math.max(options.fontSize * 1.6, text.length * options.fontSize * 0.58);
  }

  context.font = `${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`;
  return (text: string) => context.measureText(text).width;
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "방금";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function anchorWorkbenchToOverlay(
  overlay: TextOverlay,
  canvasEl: HTMLDivElement | null,
  stageEl: HTMLDivElement | null,
  workbench: FloatingWorkbenchState
) {
  const workbenchWidth = workbench.width;
  const workbenchHeight = workbench.height;
  const gap = 18;
  const stageWidth = stageEl?.clientWidth ?? 1240;
  const stageHeight = stageEl?.clientHeight ?? 720;
  const canvasLeft = canvasEl?.offsetLeft ?? 0;
  const canvasTop = canvasEl?.offsetTop ?? 0;
  const overlayWidth = toNumericSize(overlay.width, 320);

  let x = canvasLeft + overlay.x + overlayWidth + gap;
  if (x + workbenchWidth > stageWidth - 16) {
    x = canvasLeft + overlay.x - workbenchWidth - gap;
  }
  if (x < 12) {
    x = clampValue(canvasLeft + overlay.x + 12, 12, Math.max(12, stageWidth - workbenchWidth - 16));
  }

  const y = clampValue(canvasTop + overlay.y, 12, Math.max(12, stageHeight - workbenchHeight - 16));

  return {
    x: Math.round(x),
    y: Math.round(y)
  };
}

function getWorkbenchPosition(stageEl: HTMLDivElement | null) {
  const width = 332;
  const height = 500;
  const stageWidth = stageEl?.clientWidth ?? 1240;
  const stageHeight = stageEl?.clientHeight ?? 720;

  return {
    x: Math.max(16, stageWidth - width - 20),
    y: 20,
    width,
    height: Math.min(height, Math.max(420, stageHeight - 40)),
    isOpen: true
  };
}

function clampWorkbenchToStage(workbench: FloatingWorkbenchState, stageEl: HTMLDivElement | null) {
  if (!stageEl) {
    return workbench;
  }

  const maxX = Math.max(16, stageEl.clientWidth - workbench.width - 16);
  const maxY = Math.max(16, stageEl.clientHeight - workbench.height - 16);

  return {
    ...workbench,
    x: clampValue(workbench.x, 16, maxX),
    y: clampValue(workbench.y, 16, maxY)
  };
}

function getModelGenderLabel(gender?: ImageGenOptions["modelGender"]) {
  return gender === "male" ? "남자 모델" : "여자 모델";
}

function getModelAgeLabel(ageRange?: ImageGenOptions["modelAgeRange"]) {
  if (ageRange === "teen") {
    return "10대 후반";
  }
  if (ageRange === "30s") {
    return "30대";
  }
  if (ageRange === "40s") {
    return "40대";
  }
  if (ageRange === "50s_plus") {
    return "50대+";
  }

  return "20대";
}

function getModelCountryLabel(country?: ImageGenOptions["modelCountry"]) {
  if (country === "japan") {
    return "일본";
  }
  if (country === "usa") {
    return "미국";
  }
  if (country === "france") {
    return "프랑스";
  }
  if (country === "germany") {
    return "독일";
  }
  if (country === "africa") {
    return "아프리카";
  }

  return "한국";
}
