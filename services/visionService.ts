
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export interface VisualAuditResult {
  itemName: string;
  category: string;
  flaws: string[];
  confidence: number;
}

export const visionService = {
  analyzeProductImage: async (base64Data: string, mimeType: string): Promise<VisualAuditResult> => {
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
