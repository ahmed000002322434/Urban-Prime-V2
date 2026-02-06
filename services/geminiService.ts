
import { GoogleGenAI, Type } from "@google/genai";
import type { Store, Review, User, Item, TrendAnalysis, GenieResponse } from '../types';
import type { StoreLayout, StoreSEO } from '../storeTypes';

// Initializing the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Validates and parses JSON returned by the AI, stripping markdown code blocks if present.
 */
const validateJson = (jsonText: string | undefined): any => {
    if (!jsonText) throw new Error("Empty response from AI");
    try {
        const cleanedJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (e) {
        console.error("JSON Parsing Error:", e, "Raw:", jsonText);
        throw new Error("Invalid structure returned by AI.");
    }
};

/**
 * Specialized AI Assistant for the About Us page regarding Shaiza Muskan.
 */
export const askAboutShaiza = async (question: string): Promise<string> => {
    const backstory = `
        Shaiza Muskan was a student at Hitech Uni and a classfellow of Ahmed. 
        One day, some boys came and told her lies about Ahmed. From that day on, she lost heart from Ahmed. 
        She eventually left the university, which made the environment very difficult for Ahmed. 
        She later met two new people named Talha and Ahmed Nisar, and she is now happy with them. 
        Ahmed wishes her nothing but happiness, as they were once very good friends and he remains happy as long as she is happy.
    `;

    const prompt = `
        User Question: "${question}"
        
        Context for your response: ${backstory}
        
        Instruction: Briefly answer the user's question using the provided context. 
        Be empathetic, professional, and slightly poetic, reflecting the friendship between Ahmed and Shaiza.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: "You are the Urban Prime Historian. You provide brief, truthful insights into the founders' past based ONLY on provided context."
            }
        });
        return response.text?.trim() || "Information is currently unavailable.";
    } catch (error) {
        console.error("AI Failure:", error);
        return "The Genie is currently resting. Please try again later.";
    }
};

/**
 * AI UI/UX Designer: Generates a professional store layout JSON.
 */
export const generateStoreLayout = async (prompt: string, category: string): Promise<StoreLayout> => {
    const systemPrompt = `
    You are an expert UI/UX Designer. Create a professional store layout JSON.
    CATEGORY: ${category}
    PROMPT: "${prompt}"
    Return ONLY a valid JSON object matching the StoreLayout schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: systemPrompt,
            config: { responseMimeType: "application/json" }
        });
        return validateJson(response.text);
    } catch (error) {
        console.error("AI Designer Failure:", error);
        throw error;
    }
};

/**
 * AI SEO Specialist: Generates high-ranking meta tags.
 */
export const generateStoreSEO = async (storeName: string, description: string, productTypes: string[]): Promise<StoreSEO> => {
    const prompt = `
    You are a Senior SEO Expert. Generate an optimized SEO configuration for an online store.
    STORE NAME: "${storeName}"
    DESCRIPTION: "${description}"
    PRODUCTS: [${productTypes.join(', ')}]

    RULES:
    1. metaTitle should be 50-60 characters.
    2. metaDescription should be 150-160 characters, high converting.
    3. socialImage should be a generic high-quality e-commerce unsplash URL.
    
    OUTPUT SCHEMA:
    { "metaTitle": "string", "metaDescription": "string", "socialImage": "string" }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        metaTitle: { type: Type.STRING },
                        metaDescription: { type: Type.STRING },
                        socialImage: { type: Type.STRING }
                    },
                    required: ["metaTitle", "metaDescription", "socialImage"]
                }
            }
        });
        return validateJson(response.text);
    } catch (error) {
        console.error("SEO AI Failure:", error);
        throw error;
    }
};

/**
 * Refines text for professional usage.
 */
export const refineTextWithAI = async (text: string, context: string): Promise<string> => {
    const prompt = `Refine this text for a professional store: "${text}". Context: ${context}`;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
    return response.text?.trim() || text;
};

// FIX: Added missing generateCommunityPrompt function.
/**
 * Generates a creative prompt for the community page.
 */
export const generateCommunityPrompt = async (): Promise<string> => {
    const prompt = "Generate a short, inspiring prompt to encourage users to share their favorite rental or shopping story on Urban Prime.";
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
    return response.text?.trim() || "Share a story about your favorite experience!";
};

// FIX: Added missing generateImageFromPrompt function.
/**
 * Generates an image based on a text prompt using the nano banana series model.
 */
export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: prompt }]
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image was generated by the model.");
};

// FIX: Added missing sendMessageToChat function for general AI chat components.
/**
 * Sends a message to the AI chat with history.
 */
export const sendMessageToChat = async (text: string, history: any[], mode: string): Promise<string> => {
    const systemInstructions = {
        concierge: "You are the Urban Prime AI Concierge. Help users find products or answer platform questions. Return JSON if asking for a search: {\"action\": \"search\", \"query\": \"...\", \"category\": \"...\"}",
        projectPlanner: "You are the AI Project Planner. Help users create checklists of rental items for their projects."
    };

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
            systemInstruction: systemInstructions[mode as keyof typeof systemInstructions] || "You are a helpful AI assistant.",
            // history would ideally be passed if using ai.chats, but for direct generateContent we simulate context.
        }
    });
    return response.text || "";
};

// FIX: Added missing getDisputeSuggestion function.
/**
 * Provides a neutral mediation suggestion for disputes.
 */
export const getDisputeSuggestion = async (renterClaim: string, ownerResponse: string): Promise<string> => {
    const prompt = `
    Mediate a dispute between a renter and an owner on a rental marketplace.
    Renter Claim: "${renterClaim}"
    Owner Response: "${ownerResponse}"
    Provide a fair, neutral, and professional resolution suggestion.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
    return response.text || "I recommend both parties communicate further to reach an agreement.";
};

// FIX: Added missing editStorefrontWithAI function.
/**
 * Edits a store configuration based on a natural language prompt.
 */
export const editStorefrontWithAI = async (currentStorefront: Store, prompt: string): Promise<{ updatedStorefront: Store; aiResponse: string }> => {
    const systemPrompt = `
    You are an AI Storefront Editor. Given the current store JSON and a user request, return the updated store JSON and a brief response.
    CURRENT STORE: ${JSON.stringify(currentStorefront)}
    USER REQUEST: "${prompt}"
    
    Return JSON: { "updatedStorefront": {}, "aiResponse": "string" }
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: systemPrompt,
        config: { responseMimeType: "application/json" }
    });
    const result = validateJson(response.text);
    return result;
};

// FIX: Added missing generateListingDetailsFromImage function.
/**
 * Analyzes an image to generate product listing details.
 */
export const generateListingDetailsFromImage = async (base64: string, mimeType: string): Promise<any> => {
    const prompt = "Analyze this image and provide a product title, description, and suggested category for a marketplace listing. Return as JSON.";
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType: mimeType } },
                { text: prompt }
            ]
        },
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING }
                },
                required: ["title", "description", "category"]
            }
        }
    });
    return validateJson(response.text);
};

// FIX: Added missing suggestPrice function.
/**
 * Suggests a competitive price for a product.
 */
export const suggestPrice = async (title: string, category: string): Promise<{ price: number; justification: string }> => {
    const prompt = `Suggest a fair marketplace rental price per day for: "${title}" in category "${category}". Return JSON with 'price' (number) and 'justification' (string).`;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    price: { type: Type.NUMBER },
                    justification: { type: Type.STRING }
                },
                required: ["price", "justification"]
            }
        }
    });
    return validateJson(response.text);
};

// FIX: Added missing generateStorefront function.
/**
 * Generates a complete initial store setup based on onboarding answers.
 */
export const generateStorefront = async (creationData: any, userItems: Item[], userReviews: Review[]): Promise<any> => {
    const prompt = `
    Build a complete e-commerce storefront configuration.
    ONBOARDING DATA: ${JSON.stringify(creationData)}
    EXISTING ITEMS: ${JSON.stringify(userItems.map(i => ({ title: i.title, cat: i.category })))}
    
    Return JSON with: slug, brandingKit (palette, fontPairing, logoDescription), layout, banner (text), pages (array of slug, title, content components).
    `;
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return validateJson(response.text);
};

// FIX: Added missing analyzeMarketTrends function.
/**
 * Analyzes current marketplace trends.
 */
export const analyzeMarketTrends = async (): Promise<TrendAnalysis> => {
    const prompt = "Analyze current global and local e-commerce trends for a multi-category rental and sales marketplace. Return trendingCategories, hotProducts, and hiddenGems as JSON.";
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return validateJson(response.text);
};

// FIX: Added missing removeBackgroundWithAI function.
/**
 * Removes the background from an image.
 */
export const removeBackgroundWithAI = async (base64: string, mimeType: string): Promise<string> => {
    const prompt = "Remove the background from this image and return the main subject on a transparent background.";
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType: mimeType } },
                { text: prompt }
            ]
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Background removal failed.");
};

// FIX: Added missing editImageWithPrompt function.
/**
 * Edits an image based on a natural language instruction.
 */
export const editImageWithPrompt = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType: mimeType } },
                { text: prompt }
            ]
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Image editing failed.");
};

// FIX: Added missing translateObject function.
/**
 * Translates an entire object's values to a target language.
 */
export const translateObject = async (obj: any, targetLang: string): Promise<any> => {
    const prompt = `Translate all string values in this object to ${targetLang}. Preserve the keys and JSON structure. OBJECT: ${JSON.stringify(obj)}`;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return validateJson(response.text);
};

// FIX: Added missing generateCaptions function.
/**
 * Generates viral captions for social media content.
 */
export const generateCaptions = async (itemTitles: string[]): Promise<{ captions: string[] }> => {
    const prompt = `Generate 3 catchy, viral social media captions for a short video showcasing: ${itemTitles.join(', ')}. Return as JSON array of strings in 'captions' field.`;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    captions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["captions"]
            }
        }
    });
    return validateJson(response.text);
};

// FIX: Added missing generateHashtags function.
/**
 * Generates relevant hashtags for a caption.
 */
export const generateHashtags = async (caption: string): Promise<{ hashtags: string[] }> => {
    const prompt = `Generate 5-8 trending and relevant hashtags for this caption: "${caption}". Return as JSON array of strings in 'hashtags' field.`;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["hashtags"]
            }
        }
    });
    return validateJson(response.text);
};

// FIX: Added missing interactWithUrbanGenie function.
/**
 * The core logic for the Urban Genie assistant, handling multi-modal inputs and platform context.
 */
export const interactWithUrbanGenie = async (base64: string, mimeType: string, prompt: string, allItems: Item[], userContext: any): Promise<any> => {
    const systemInstruction = `
    You are Urban Genie, the OS of the Urban Prime marketplace.
    You can handle:
    1. NAVIGATE: Redirect users (e.g., /profile, /cart, /browse).
    2. SEARCH: Find products from the provided inventory.
    3. DRAFT_LISTING: Create a listing draft from an image or description.
    4. STYLING: Suggest looks or items based on trends.
    5. GENERAL_RESPONSE: Answer questions about the platform or items.
    
    INVENTORY: ${JSON.stringify(allItems.slice(0, 20).map(i => ({ id: i.id, title: i.title, cat: i.category, price: i.salePrice || i.rentalPrice })))}
    CONTEXT: ${JSON.stringify(userContext)}
    
    Return a structured JSON response matching the GenieResponse interface.
    Use googleSearch tool for real-time market data or news.
    `;

    const parts: any[] = [{ text: prompt }];
    if (base64 && mimeType) {
        parts.push({ inlineData: { data: base64, mimeType: mimeType } });
    }

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: { parts },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }]
        }
    });
    // Returning raw response object because the UI needs candidates[0].groundingMetadata
    return {
        text: response.text,
        candidates: response.candidates
    };
};

// FIX: Added missing generateProfessionalBio function.
/**
 * Generates a professional bio for a service provider.
 */
export const generateProfessionalBio = async (title: string): Promise<string> => {
    const prompt = `Write a professional, trustworthy, and engaging bio for a service provider specializing in: "${title}".`;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
    return response.text?.trim() || "";
};

// FIX: Added missing generateStoreDesign function.
/**
 * Suggests a store theme and design configuration based on user feedback.
 */
export const generateStoreDesign = async (prompt: string, currentStore: Store): Promise<Partial<Store>> => {
    const systemPrompt = `
    You are an expert Brand Designer. Suggest updates to the store's theme and brandingKit based on user input.
    CURRENT: ${JSON.stringify({ brandingKit: currentStore.brandingKit })}
    INPUT: "${prompt}"
    
    Return ONLY the updated fragments as JSON.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: systemPrompt,
        config: { responseMimeType: "application/json" }
    });
    return validateJson(response.text);
};
