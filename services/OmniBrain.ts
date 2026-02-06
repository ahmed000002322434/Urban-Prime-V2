
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { GrowthInsight } from "./OmniGrowthService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const omniTools: FunctionDeclaration[] = [
  {
    name: 'list_product',
    description: 'Creates a new product listing in the marketplace',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        price: { type: Type.NUMBER },
        category: { type: Type.STRING }
      },
      required: ['title', 'price']
    }
  },
  {
    name: 'design_store',
    description: 'Updates the visual design and layout of a user storefront',
    parameters: {
      type: Type.OBJECT,
      properties: {
        themeVibe: { type: Type.STRING, description: 'The overall aesthetic (e.g., luxury, cyberpunk, minimal)' },
        primaryColor: { type: Type.STRING }
      }
    }
  },
  {
    name: 'adjust_pricing',
    description: 'Adjusts pricing for a given item',
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemId: { type: Type.STRING },
        price: { type: Type.NUMBER }
      },
      required: ['itemId', 'price']
    }
  },
  {
    name: 'set_promotion',
    description: 'Creates a promotion or flash sale',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        percentage: { type: Type.NUMBER },
        startsAt: { type: Type.STRING },
        endsAt: { type: Type.STRING }
      },
      required: ['title', 'percentage']
    }
  },
  {
    name: 'notify_users',
    description: 'Send a notification to users',
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING },
        link: { type: Type.STRING }
      },
      required: ['message']
    }
  },
  {
    name: 'create_coupon',
    description: 'Create a coupon code for discounts',
    parameters: {
      type: Type.OBJECT,
      properties: {
        code: { type: Type.STRING },
        percentage: { type: Type.NUMBER }
      },
      required: ['code', 'percentage']
    }
  }
];

export const generateOmniPlan = async (userPrompt: string) => {
  // Real-time Intent Interception
  const lowerPrompt = userPrompt.toLowerCase();
  const isListingIntent = lowerPrompt.includes('sell') || lowerPrompt.includes('list') || lowerPrompt.includes('post');

  if (isListingIntent && !lowerPrompt.includes('confirm')) {
    return { status: 'REQUIRE_ASSETS' };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: userPrompt,
    config: {
      systemInstruction: `
        You are Omni, the Autonomous Engine of Urban Prime. 
        You have direct control over the marketplace via OmniActions.
        Analyze the user prompt and generate a sequence of logical actions.
      `,
      tools: [{ functionDeclarations: omniTools }]
    }
  });

  return response.functionCalls || [];
};

export const summarizeGrowthInsights = async (insights: GrowthInsight[]) => {
    if (insights.length === 0) return "Omni is observing market fluctuations. No critical optimizations required.";

    const prompt = `Review these marketplace growth insights and provide a concise, professional, 1-sentence summary of the revenue opportunity. DATA: ${JSON.stringify(insights)}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            systemInstruction: "You are the Omni Voice. Be concise, authoritative, and growth-oriented."
        }
    });

    return response.text;
};
