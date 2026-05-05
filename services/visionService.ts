
import { GoogleGenAI, Type } from "@google/genai";

const AI_UNAVAILABLE_MESSAGE = 'AI unavailable: configure VITE_GEMINI_API_KEY.';

const getApiKey = () => {
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (viteKey) return viteKey;
  if (typeof process !== 'undefined') {
    return (process.env as any)?.API_KEY as string | undefined;
  }
  return undefined;
};

const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export interface VisualAuditResult {
  itemName: string;
  category: string;
  flaws: string[];
  confidence: number;
}

export const visionService = {
  analyzeProductImage: async (base64Data: string, mimeType: string): Promise<VisualAuditResult> => {
    const ai = getAiClient();
    if (!ai) {
      throw new Error(AI_UNAVAILABLE_MESSAGE);
    }
    const prompt = "Analyze this specific image. Return JSON for: Item Name, Category, and 3 specific visual flaws (scratches/wear/imperfections). If the image is not a clearly identifiable product, return ERROR.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            category: { type: Type.STRING },
            flaws: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidence: { type: Type.NUMBER }
          },
          required: ["itemName", "category", "flaws"]
        }
      }
    });

    const result = JSON.parse(response.text);
    if (result.error || !result.itemName) throw new Error("Image analysis failed: Not a valid product.");
    
    return result;
  }
};
