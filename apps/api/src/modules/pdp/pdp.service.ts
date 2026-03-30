import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type {
  AspectRatio,
  ImageGenOptions,
  LandingPageBlueprint,
  PdpAnalyzeRequest,
  PdpErrorCode,
  SectionBlueprint
} from "@runacademy/shared";

const ANALYZE_MODEL = "gemini-3.1-pro-preview";
const IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_IMAGE_MIME = "image/jpeg";

type GeneratedImagePayload = {
  base64: string;
  mimeType: string;
};

export class PdpServiceError extends Error {
  constructor(
    readonly code: PdpErrorCode,
    message: string,
    readonly detail?: string
  ) {
    super(message);
    this.name = "PdpServiceError";
  }
}

export class PdpService {
  async analyzeProduct(request: PdpAnalyzeRequest) {
    const normalizedImage = sanitizeBase64Payload(request.imageBase64);
    const mimeType = normalizeMimeType(request.mimeType);
    const referenceModelImage = normalizeReferenceModelImage(request.modelImageBase64, request.modelImageMimeType);
    const client = this.getClient();

    const blueprint = await retryOperation(async () => {
      const response = await client.models.generateContent({
        model: ANALYZE_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: normalizedImage
              }
            },
            {
              text: buildAnalyzePrompt(request.additionalInfo, request.desiredTone, Boolean(referenceModelImage))
            }
          ]
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              scorecard: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    score: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  }
                }
              },
              blueprintList: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    section_id: { type: Type.STRING },
                    section_name: { type: Type.STRING },
                    goal: { type: Type.STRING },
                    headline: { type: Type.STRING },
                    headline_en: { type: Type.STRING },
                    subheadline: { type: Type.STRING },
                    subheadline_en: { type: Type.STRING },
                    bullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    bullets_en: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    trust_or_objection_line: { type: Type.STRING },
                    trust_or_objection_line_en: { type: Type.STRING },
                    CTA: { type: Type.STRING },
                    CTA_en: { type: Type.STRING },
                    layout_notes: { type: Type.STRING },
                    compliance_notes: { type: Type.STRING },
                    image_id: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    prompt_ko: { type: Type.STRING },
                    prompt_en: { type: Type.STRING },
                    on_image_text: { type: Type.STRING },
                    negative_prompt: { type: Type.STRING },
                    style_guide: { type: Type.STRING },
                    reference_usage: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      return parseBlueprintResponse(response);
    });

    const firstSection = blueprint.sections[0];

    if (!firstSection) {
      throw new PdpServiceError(
        "GEMINI_RESPONSE_INVALID",
        "상세페이지 섹션을 생성하지 못했습니다.",
        "No sections returned from analyze response."
      );
    }

    const firstImage = await this.generateSectionImageInternal({
      originalImageBase64: normalizedImage,
      section: firstSection,
      aspectRatio: request.aspectRatio,
      desiredTone: request.desiredTone,
      options: {
        style: "studio",
        withModel: true,
        modelGender: "female",
        modelAgeRange: "20s",
        modelCountry: "korea",
        headline: firstSection.headline,
        subheadline: firstSection.subheadline,
        referenceModelImageBase64: referenceModelImage?.base64,
        referenceModelImageMimeType: referenceModelImage?.mimeType
      }
    });

    blueprint.sections[0] = {
      ...firstSection,
      generatedImage: toDataUrl(firstImage.mimeType, firstImage.base64)
    };

    return {
      originalImage: normalizedImage,
      blueprint
    };
  }

  async generateSectionImage(request: {
    originalImageBase64: string;
    section: SectionBlueprint;
    aspectRatio: AspectRatio;
    desiredTone?: string;
    options?: ImageGenOptions;
  }) {
    const image = await this.generateSectionImageInternal(request);

    return {
      imageBase64: image.base64,
      mimeType: image.mimeType
    };
  }

  private async generateSectionImageInternal(request: {
    originalImageBase64: string;
    section: SectionBlueprint;
    aspectRatio: AspectRatio;
    desiredTone?: string;
    options?: ImageGenOptions;
  }): Promise<GeneratedImagePayload> {
    const client = this.getClient();
    const originalImageBase64 = sanitizeBase64Payload(request.originalImageBase64);
    const section = normalizeSection(request.section, 0);

    if (!section.prompt_en) {
      throw new PdpServiceError(
        "INVALID_REQUEST",
        "이미지 프롬프트가 없는 섹션입니다.",
        "Section prompt_en is missing."
      );
    }

    const prompt = buildImagePrompt(section.prompt_en, request.desiredTone, request.options);

    return retryOperation(async () => {
      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [
        {
          inlineData: {
            mimeType: DEFAULT_IMAGE_MIME,
            data: originalImageBase64
          }
        }
      ];

      const normalizedReferenceModel = normalizeReferenceModelImage(
        request.options?.referenceModelImageBase64,
        request.options?.referenceModelImageMimeType
      );

      if (normalizedReferenceModel && request.options?.withModel) {
        parts.push({
          inlineData: {
            mimeType: normalizedReferenceModel.mimeType,
            data: normalizedReferenceModel.base64
          }
        });
      }

      parts.push({
        text: prompt
      });

      const response = await client.models.generateContent({
        model: IMAGE_MODEL,
        contents: {
          parts
        },
        config: {
          imageConfig: {
            aspectRatio: request.aspectRatio
          }
        }
      });

      const generatedImage = extractGeneratedImage(response);

      if (!generatedImage) {
        throw new PdpServiceError(
          "PDP_IMAGE_GENERATION_FAILED",
          "이미지를 생성하지 못했습니다.",
          "Gemini image response did not include inline image data."
        );
      }

      return generatedImage;
    });
  }

  private getClient() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      throw new PdpServiceError(
        "GEMINI_API_KEY_MISSING",
        "서버에 GEMINI_API_KEY가 설정되어 있지 않습니다."
      );
    }

    return new GoogleGenAI({ apiKey });
  }
}

export function toPdpErrorResponse(error: unknown) {
  if (error instanceof PdpServiceError) {
    return {
      ok: false as const,
      code: error.code,
      message: error.message,
      detail: error.detail
    };
  }

  const detail = stringifyError(error);
  const message = error instanceof Error ? error.message : "상세페이지 마법사 처리 중 오류가 발생했습니다.";

  if (isQuotaError(message)) {
    return {
      ok: false as const,
      code: "GEMINI_QUOTA_EXCEEDED" as const,
      message: "AI 사용량이 초과되었습니다. 잠시 후 다시 시도하거나 quota 상태를 확인해 주세요.",
      detail
    };
  }

  if (isJsonError(message)) {
    return {
      ok: false as const,
      code: "GEMINI_RESPONSE_INVALID" as const,
      message: "AI 응답을 해석하지 못했습니다. 같은 이미지로 다시 시도해 주세요.",
      detail
    };
  }

  return {
    ok: false as const,
    code: "PDP_ANALYZE_FAILED" as const,
    message: "상세페이지 마법사 처리 중 오류가 발생했습니다.",
    detail
  };
}

function normalizeMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();

  if (!normalized.startsWith("image/")) {
    throw new PdpServiceError(
      "INVALID_IMAGE_PAYLOAD",
      "이미지 파일만 업로드할 수 있습니다.",
      `Unsupported mime type: ${mimeType}`
    );
  }

  return normalized;
}

function sanitizeBase64Payload(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/^data:[^;]+;base64,(.+)$/);
  const normalized = (match ? match[1] : trimmed).replace(/\s/g, "");

  if (!normalized || !/^[A-Za-z0-9+/]+=*$/.test(normalized)) {
    throw new PdpServiceError(
      "INVALID_IMAGE_PAYLOAD",
      "이미지 데이터가 올바르지 않습니다.",
      "Malformed base64 payload."
    );
  }

  try {
    const bytes = Buffer.from(normalized, "base64");
    if (!bytes.byteLength) {
      throw new Error("empty payload");
    }
  } catch {
    throw new PdpServiceError(
      "INVALID_IMAGE_PAYLOAD",
      "이미지 데이터를 읽을 수 없습니다.",
      "Buffer.from failed for image payload."
    );
  }

  return normalized;
}

function buildAnalyzePrompt(additionalInfo?: string, desiredTone?: string, hasReferenceModel = false) {
  return `
이 제품 이미지를 분석하여 4~6개의 핵심 섹션으로 구성된 상세페이지 전체 블루프린트를 설계해주세요.
${additionalInfo ? `[사용자 추가 정보]: ${additionalInfo}` : ""}
${desiredTone ? `[원하는 디자인 톤]: ${desiredTone}` : ""}
${hasReferenceModel ? "[참고 모델 이미지가 함께 제공됨]: 모델이 포함되는 컷은 업로드된 reference model과 동일 인물/동일 성별/동일 인상으로 유지되도록 설계할 것." : ""}

# 섹션 템플릿(필수 필드)
- section_id: S1~S6
- section_name: (예: 히어로/체크리스트/베네핏/근거/사용법/후기 등)
- goal: 이 섹션의 역할(짧은 한 문장)
- headline: 한국어 1줄(강하게)
- headline_en: headline의 자연스러운 영어 번역 1줄
- subheadline: 한국어 1줄(명확하게)
- subheadline_en: subheadline의 자연스러운 영어 번역 1줄
- bullets: 한국어 3개(스캔용, 각 1줄)
- bullets_en: bullets의 자연스러운 영어 번역 3개
- trust_or_objection_line: 한국어 불안 제거/신뢰 1문장
- trust_or_objection_line_en: trust_or_objection_line의 자연스러운 영어 번역 1문장
- CTA: (있으면) 한국어 1줄
- CTA_en: CTA의 자연스러운 영어 번역 1줄
- layout_notes: 이미지 레이아웃 지시(짧게)
- compliance_notes: 카테고리별 규제/표현 주의(짧게)

# 섹션 구성 원칙(강제)
- 베네핏은 3개 고정
- 근거 섹션은 반드시 결과→조건→해석 3단으로 작성
- 리뷰 섹션은 전/후 사진보다 사용감 문장 후기 카드 6~12개 우선
- 사용법/루틴은 선택지를 2~3개로 줄여 선택 피로를 없앨 것
- CTA는 최소 2회 이상 배치
- 각 섹션의 이미지는 단순한 제품 누끼나 그래픽이 아닌 소비자의 구매 전환을 유도할 수 있는 고품질 광고 사진 느낌으로 기획할 것
- 첫 번째 섹션은 구매 전환에 가장 중요하므로 반드시 매력적인 모델이 제품과 함께 연출된 컷으로 프롬프트를 작성할 것
- 각 섹션 이미지는 해당 헤드라인과 서브헤드라인의 메시지를 시각적으로 전달해야 함

# 섹션별 이미지 생성 프롬프트
- image_id: IMG_S1~IMG_S6
- purpose: 이 이미지가 전달해야 하는 메시지(짧은 한 문장)
- prompt_ko: 한국어 이미지 생성 프롬프트(1~2문장). 구도, 거리감, 시선 높이, 제품이 프레임에서 차지하는 비중을 함께 명시할 것.
- prompt_en: 영어 프롬프트(실제 이미지 생성용). Include composition, framing distance, camera angle, and how the product should occupy the frame.
- on_image_text: 이미지에 들어갈 문구와 텍스트 레이아웃 지시
- negative_prompt: 피해야 할 요소
- style_guide: 전체 통일 스타일. 스튜디오는 정제된 세트/조명/질감, 라이프스타일은 현실감 있는 공간/행동, 아웃도어는 위치감/공기감/활동성을 분명히 적을 것.
- reference_usage: 업로드된 기존 제품 이미지를 어떻게 참고할지. 제품 형태, 라벨, 재질, 색감을 유지하는 기준을 명시할 것.
- section_name, goal, layout_notes, compliance_notes, purpose, on_image_text, style_guide, reference_usage는 반드시 한국어로 작성할 것
- 영어는 *_en 필드와 prompt_en에만 사용할 것

# 이미지 생성 공통 규칙
- 세로형 상세페이지용
- 이미지 내에 텍스트, 로고, 워터마크, 글자를 넣지 말 것
- 배경은 단순하게 유지하고 제품/핵심 오브젝트에 시선을 집중시킬 것
- 한 장에 메시지 하나만 전달할 것
- 규제 리스크가 있으면 안전한 표현으로 수정할 것
- JSON 외 텍스트를 붙이지 말고 모든 필드는 간결하게 작성할 것

응답은 반드시 제공된 JSON 스키마를 준수해야 합니다.
`.trim();
}

function buildImagePrompt(
  prompt: string,
  desiredTone?: string,
  options?: ImageGenOptions
) {
  let enhancedPrompt = "Create a high-end, conversion-optimized commercial advertising photograph. ";

  if (options?.headline) {
    enhancedPrompt += `Context: The image should visually represent the advertising headline "${options.headline}"`;
    if (options.subheadline) {
      enhancedPrompt += ` and subheadline "${options.subheadline}"`;
    }
    enhancedPrompt += ". ";
  }

  if (options?.withModel && options.referenceModelImageBase64) {
    enhancedPrompt +=
      "Reference Inputs: image 1 is the original product reference and must preserve the exact product. image 2 is the mandatory model identity reference. ";
    enhancedPrompt +=
      "The final image MUST use the same person from image 2. Do not switch to a different model, do not change gender, and do not drift to a generic portrait face. ";
  }

  if (options?.isRegeneration) {
    enhancedPrompt += "\n[USER OVERRIDE INSTRUCTIONS - STRICTLY FOLLOW THESE OVER ANY CONFLICTING BASE INSTRUCTIONS]\n";
    enhancedPrompt += buildImageStyleInstructions(options);
    enhancedPrompt += "[END USER OVERRIDE INSTRUCTIONS]\n\n";
  } else {
    enhancedPrompt += "\nBase Instructions: ";
  }

  enhancedPrompt += `Keep the product exactly as is. Change the background to: ${prompt}. `;

  if (desiredTone) {
    enhancedPrompt += `The overall style and tone should be ${desiredTone}. `;
  }

  if (!options?.isRegeneration) {
    enhancedPrompt += buildImagePreferenceInstructions(options);
  }

  enhancedPrompt += "\nComposition Rules: ";
  enhancedPrompt +=
    "use a varied, intentional camera distance that matches the scene instead of defaulting to a chest-up portrait. ";
  enhancedPrompt +=
    "Depending on the section, use wide shots, medium shots, tabletop/product detail shots, hands-in-frame moments, over-the-shoulder angles, seated scenes, or environment-led framing when they improve product storytelling. ";
  enhancedPrompt +=
    "Keep the product readable, prominent, and beautifully lit, but allow the frame to breathe with negative space, props, and surrounding context when useful. ";
  enhancedPrompt += "\nCRITICAL: The final image must look like a top-tier magazine advertisement or a premium brand's landing page hero shot. ";
  enhancedPrompt +=
    "It should be highly attractive and induce purchase conversion. IMPORTANT: Do NOT include any text, words, letters, typography, or logos in the generated image.";

  return enhancedPrompt;
}

function buildImageStyleInstructions(options?: ImageGenOptions) {
  if (!options) {
    return "";
  }

  let instructions = "";

  if (options.style === "studio") {
    instructions +=
      "- Setting: Professional studio lighting, polished seamless backdrop, premium surfaces or editorial props allowed when they support the product story.\n";
    instructions +=
      "- Composition: Avoid a default chest-up portrait. Prefer a mix of product-centric wide frames, half-body frames, seated or standing full-figure compositions, tabletop layouts, hand interactions, and close detail inserts depending on the section goal.\n";
    instructions +=
      "- Art Direction: Crisp controlled light, subtle shadows, refined color balance, and a clearly designed studio set that feels intentional rather than empty.\n";
  } else if (options.style === "lifestyle") {
    instructions +=
      "- Setting: Authentic, aspirational lifestyle environment with natural lighting, lived-in textures, and everyday context that feels believable.\n";
    instructions +=
      "- Composition: Use candid moments, on-location interaction, room context, hands using the product, and gentle movement. Vary distance between environmental wide shots, medium shots, and close usage details.\n";
    instructions +=
      "- Art Direction: Warm, human, relatable, and editorial, with enough context to explain why the product fits into daily life.\n";
  } else if (options.style === "outdoor") {
    instructions +=
      "- Setting: Beautiful outdoor environment with cinematic natural lighting, location depth, airiness, and scene-based storytelling.\n";
    instructions +=
      "- Composition: Use wide scenic frames, dynamic movement, environmental close-ups, and product-in-use storytelling that feels active and open.\n";
    instructions +=
      "- Art Direction: Fresh, expansive, airy, and energetic, with the location helping explain the product mood or usage context.\n";
  }

  if (options.withModel) {
    if (options.referenceModelImageBase64) {
      instructions += "- Subject: MUST feature the exact same person shown in the attached reference model image.\n";
      instructions += "- Identity Lock: Preserve the face, hairstyle, skin tone, and overall appearance of that same person while adapting pose, styling, and composition to the scene.\n";
    } else {
      const modelDescriptor = buildModelDescriptor(options);
      instructions += `- Subject: MUST feature an attractive, professional model (${modelDescriptor}) posing with and interacting naturally with the product.\n`;
    }
  } else {
    instructions += "- Subject: Do NOT include any people or models. Focus entirely on the product and background.\n";
  }

  return instructions;
}

function buildImagePreferenceInstructions(options?: ImageGenOptions) {
  if (!options) {
    return "";
  }

  const parts: string[] = [];

  if (options.style === "studio") {
    parts.push("Use a polished studio set with controlled light and flexible framing, not a fixed upper-body portrait.");
  } else if (options.style === "lifestyle") {
    parts.push("Use an authentic lifestyle setting with natural interaction and believable context.");
  } else if (options.style === "outdoor") {
    parts.push("Use an outdoor environment with scenic depth and active visual storytelling.");
  }

  if (options.withModel && options.referenceModelImageBase64) {
    parts.push("Use the attached reference model as the same person for this scene.");
  } else if (options.withModel) {
    const modelDescriptor = buildModelDescriptor(options);
    parts.push(`If appropriate for the scene, feature a model (${modelDescriptor}).`);
  }

  parts.push("Keep the product central to the story and avoid collapsing the scene into a generic portrait.");

  return parts.length ? `Style Preferences: ${parts.join(" ")}` : "";
}

function buildModelDescriptor(options: ImageGenOptions) {
  const nationalityDescriptor = getModelCountryDescriptor(options.modelCountry);
  const ageDescriptor = getModelAgeDescriptor(options.modelAgeRange);
  const genderDescriptor = options.modelGender === "male" ? "man" : "woman";

  return `${nationalityDescriptor} ${genderDescriptor} ${ageDescriptor}`.trim();
}

function getModelCountryDescriptor(country?: ImageGenOptions["modelCountry"]) {
  if (country === "japan") {
    return "Japanese";
  }
  if (country === "usa") {
    return "American";
  }
  if (country === "france") {
    return "French";
  }
  if (country === "germany") {
    return "German";
  }
  if (country === "africa") {
    return "African";
  }

  return "Korean";
}

function getModelAgeDescriptor(ageRange?: ImageGenOptions["modelAgeRange"]) {
  if (ageRange === "teen") {
    return "in the late teens";
  }
  if (ageRange === "30s") {
    return "in the 30s";
  }
  if (ageRange === "40s") {
    return "in the 40s";
  }
  if (ageRange === "50s_plus") {
    return "in the 50s or older";
  }

  return "in the 20s";
}

function parseBlueprintResponse(response: { text?: string }) {
  if (!response.text) {
    throw new PdpServiceError(
      "GEMINI_RESPONSE_INVALID",
      "AI 응답이 비어 있습니다.",
      "Gemini did not return response.text."
    );
  }

  let text = response.text.trim();
  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }

  try {
    const parsed = JSON.parse(text.trim()) as Partial<LandingPageBlueprint>;
    return sanitizeBlueprint(parsed);
  } catch (error) {
    throw new PdpServiceError(
      "GEMINI_RESPONSE_INVALID",
      "AI 응답을 해석하지 못했습니다.",
      stringifyError(error)
    );
  }
}

function sanitizeBlueprint(input: Partial<LandingPageBlueprint>) {
  const sections = Array.isArray(input.sections)
    ? input.sections.map((section, index) => normalizeSection(section, index))
    : [];

  return {
    executiveSummary: asString(input.executiveSummary),
    scorecard: Array.isArray(input.scorecard)
      ? input.scorecard.map((item) => ({
          category: asString(item?.category),
          score: asString(item?.score),
          reason: asString(item?.reason)
        }))
      : [],
    blueprintList: Array.isArray(input.blueprintList)
      ? input.blueprintList.map((item) => asString(item)).filter(Boolean)
      : sections.map((section) => section.section_name),
    sections
  } satisfies LandingPageBlueprint;
}

function normalizeSection(section: Partial<SectionBlueprint>, index: number): SectionBlueprint {
  return {
    section_id: asString(section.section_id) || `S${index + 1}`,
    section_name: asString(section.section_name) || `섹션 ${index + 1}`,
    goal: asString(section.goal),
    headline: asString(section.headline),
    headline_en: asString(section.headline_en) || asString(section.headline),
    subheadline: asString(section.subheadline),
    subheadline_en: asString(section.subheadline_en) || asString(section.subheadline),
    bullets: Array.isArray(section.bullets) ? section.bullets.map((item) => asString(item)).filter(Boolean) : [],
    bullets_en: Array.isArray(section.bullets_en)
      ? section.bullets_en.map((item) => asString(item)).filter(Boolean)
      : Array.isArray(section.bullets)
        ? section.bullets.map((item) => asString(item)).filter(Boolean)
        : [],
    trust_or_objection_line: asString(section.trust_or_objection_line),
    trust_or_objection_line_en:
      asString(section.trust_or_objection_line_en) || asString(section.trust_or_objection_line),
    CTA: asString(section.CTA),
    CTA_en: asString(section.CTA_en) || asString(section.CTA),
    layout_notes: asString(section.layout_notes),
    compliance_notes: asString(section.compliance_notes),
    image_id: asString(section.image_id) || `IMG_S${index + 1}`,
    purpose: asString(section.purpose),
    prompt_ko: asString(section.prompt_ko),
    prompt_en: asString(section.prompt_en),
    on_image_text: asString(section.on_image_text),
    negative_prompt: asString(section.negative_prompt),
    style_guide: asString(section.style_guide),
    reference_usage: asString(section.reference_usage),
    generatedImage: section.generatedImage
  };
}

function normalizeReferenceModelImage(base64?: string, mimeType?: string) {
  if (!base64?.trim()) {
    return null;
  }

  if (!mimeType?.trim()) {
    throw new PdpServiceError(
      "INVALID_IMAGE_PAYLOAD",
      "모델 이미지 형식이 올바르지 않습니다.",
      "Reference model image is missing mime type."
    );
  }

  return {
    base64: sanitizeBase64Payload(base64),
    mimeType: normalizeMimeType(mimeType)
  };
}

function extractGeneratedImage(response: {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
}) {
  const parts = response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData.mimeType) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType
      };
    }
  }

  return null;
}

async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delay = 1500): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (retries > 0 && (isQuotaError(message) || isJsonError(message))) {
      await wait(delay);
      return retryOperation(operation, retries - 1, delay * 2);
    }

    if (error instanceof PdpServiceError) {
      throw error;
    }

    if (isQuotaError(message)) {
      throw new PdpServiceError(
        "GEMINI_QUOTA_EXCEEDED",
        "AI 사용량이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
        message
      );
    }

    if (isJsonError(message)) {
      throw new PdpServiceError(
        "GEMINI_RESPONSE_INVALID",
        "AI 응답을 해석하지 못했습니다.",
        message
      );
    }

    throw error;
  }
}

function isQuotaError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes("429") || lowered.includes("quota") || lowered.includes("resource_exhausted");
}

function isJsonError(message: string) {
  return message.includes("JSON") || message.includes("Unexpected token") || message.includes("Unterminated string");
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDataUrl(mimeType: string, base64: string) {
  return `data:${mimeType};base64,${base64}`;
}
