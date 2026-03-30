export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type PdpImageStyle = "studio" | "lifestyle" | "outdoor";
export type PdpModelGender = "female" | "male";
export type PdpModelAgeRange = "teen" | "20s" | "30s" | "40s" | "50s_plus";
export type PdpModelCountry = "korea" | "japan" | "usa" | "france" | "germany" | "africa";

export interface ScorecardItem {
  category: string;
  score: string;
  reason: string;
}

export interface SectionBlueprint {
  section_id: string;
  section_name: string;
  goal: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  trust_or_objection_line: string;
  CTA: string;
  layout_notes: string;
  compliance_notes: string;
  image_id: string;
  purpose: string;
  prompt_ko: string;
  prompt_en: string;
  on_image_text: string;
  negative_prompt: string;
  style_guide: string;
  reference_usage: string;
  generatedImage?: string;
}

export interface LandingPageBlueprint {
  executiveSummary: string;
  scorecard: ScorecardItem[];
  blueprintList: string[];
  sections: SectionBlueprint[];
}

export interface GeneratedResult {
  originalImage: string;
  blueprint: LandingPageBlueprint;
}

export interface ImageGenOptions {
  style: PdpImageStyle;
  withModel: boolean;
  modelGender?: PdpModelGender;
  modelAgeRange?: PdpModelAgeRange;
  modelCountry?: PdpModelCountry;
  headline?: string;
  subheadline?: string;
  isRegeneration?: boolean;
}

export interface PdpAnalyzeRequest {
  imageBase64: string;
  mimeType: string;
  additionalInfo?: string;
  desiredTone?: string;
  aspectRatio: AspectRatio;
}

export interface PdpAnalyzeSuccessResponse {
  ok: true;
  result: GeneratedResult;
}

export interface PdpGenerateImageRequest {
  originalImageBase64: string;
  section: SectionBlueprint;
  aspectRatio: AspectRatio;
  desiredTone?: string;
  options?: ImageGenOptions;
}

export interface PdpGenerateImageSuccessResponse {
  ok: true;
  imageBase64: string;
  mimeType: string;
}

export type PdpErrorCode =
  | "GEMINI_API_KEY_MISSING"
  | "INVALID_IMAGE_PAYLOAD"
  | "INVALID_REQUEST"
  | "GEMINI_QUOTA_EXCEEDED"
  | "GEMINI_RESPONSE_INVALID"
  | "PDP_ANALYZE_FAILED"
  | "PDP_IMAGE_GENERATION_FAILED";

export interface PdpErrorResponse {
  ok: false;
  code: PdpErrorCode;
  message: string;
  detail?: string;
}

export type PdpAnalyzeResponse = PdpAnalyzeSuccessResponse | PdpErrorResponse;
export type PdpGenerateImageResponse = PdpGenerateImageSuccessResponse | PdpErrorResponse;
