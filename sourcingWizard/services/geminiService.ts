import { GoogleGenAI, Type } from '@google/genai';

const MODEL = 'gemini-2.5-flash-preview-04-17';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delay = 3000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const msg = error?.message || '';
    const isQuotaError =
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('resource has been exhausted') ||
      error.status === 429;

    if (retries > 0 && isQuotaError) {
      console.warn(`[Gemini] 쿼터 초과. ${delay}ms 후 재시도... (남은 횟수: ${retries})`);
      await wait(delay);
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  const ai = new GoogleGenAI({ apiKey });
  try {
    await ai.models.generateContent({
      model: MODEL,
      contents: { parts: [{ text: 'Hi' }] },
      config: { maxOutputTokens: 1 },
    });
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * 텍스트 프롬프트 → JSON 구조화 응답
 * responseSchema를 사용하여 안정적인 JSON 출력 보장
 */
export async function callGeminiJSON<T>(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  responseSchema: object
): Promise<T> {
  const ai = new GoogleGenAI({ apiKey });

  const operation = async (): Promise<T> => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: { parts: [{ text: userPrompt }] },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    if (!response.text) {
      throw new Error('Gemini API로부터 응답이 없습니다.');
    }

    try {
      return JSON.parse(response.text) as T;
    } catch {
      // JSON parse 실패 시 텍스트에서 JSON 추출 시도
      const match = response.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]) as T;
      throw new Error('JSON 파싱 실패: ' + response.text.substring(0, 200));
    }
  };

  try {
    return await retryOperation(operation);
  } catch (error) {
    console.error('[Gemini] 오류:', error);
    throw error;
  }
}

// 스키마 헬퍼
export const S = {
  object: (properties: Record<string, object>, required?: string[]) => ({
    type: Type.OBJECT,
    properties,
    ...(required ? { required } : {}),
  }),
  array: (items: object) => ({ type: Type.ARRAY, items }),
  string: () => ({ type: Type.STRING }),
  number: () => ({ type: Type.NUMBER }),
  boolean: () => ({ type: Type.BOOLEAN }),
};
