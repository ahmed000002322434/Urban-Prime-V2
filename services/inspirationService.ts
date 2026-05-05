
import { GoogleGenAI } from "@google/genai";
import type { InspirationContent } from '../types';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import supabaseMirror from './supabaseMirror';

const AI_UNAVAILABLE_MESSAGE = 'AI unavailable: configure VITE_GEMINI_API_KEY.';

const getApiKey = () => {
    const viteKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (viteKey) return viteKey;
    if (typeof process !== 'undefined') {
        return (process.env as any)?.API_KEY as string | undefined;
    }
    return undefined;
};

// Re-creating the instance is required for the Veo API key selection flow.
const getAiClient = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(AI_UNAVAILABLE_MESSAGE);
    }
    return new GoogleGenAI({ apiKey });
};

const POLLING_INTERVAL = 10000; // 10 seconds

const pollingMessages = [
    "Initializing the creativity engine...",
    "Consulting with digital muses...",
    "Warming up the pixel forge...",
    "Gathering stardust for rendering...",
    "Painting with light and algorithms...",
    "Directing the digital actors...",
    "Assembling the final frames...",
    "Polishing the final cut...",
];

export const inspirationService = {
  getInspirationContent: async (): Promise<InspirationContent[]> => {
    if (supabaseMirror.enabled) {
      const mirrored = await supabaseMirror.list<InspirationContent>('inspirationContent', { limit: 200 });
      if (mirrored.length > 0) return mirrored;
    }
    const snapshot = await getDocs(collection(db, 'inspirationContent'));
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InspirationContent[];
    if (supabaseMirror.enabled) {
      await Promise.all(items.map(item => supabaseMirror.upsert('inspirationContent', item.id, item)));
    }
    return items;
  },

  generateImage: async (
    prompt: string,
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
    onPoll: (update: { message: string; progress: number }) => void
  ): Promise<string> => {
    const ai = getAiClient();
    onPoll({ message: "Generating your image...", progress: 25 });

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
    });
    
    onPoll({ message: "Finalizing image...", progress: 100 });
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  },

  generateVideo: async (
    prompt: string,
    duration: number,
    aspectRatio: '16:9' | '9:16',
    style: string,
    voiceOver: string,
    onPoll: (update: { message: string; progress: number }) => void,
    initialImage?: { base64: string; mimeType: string }
  ): Promise<string> => {
    const ai = getAiClient();
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error(AI_UNAVAILABLE_MESSAGE);
    }
    
    const fullPrompt = `
      A video of ${prompt}.
      Style: ${style}.
      Duration: approximately ${duration} seconds.
      ${voiceOver ? `The scene should be narrated with a voice-over saying: "${voiceOver}"` : ''}
    `.trim();

    onPoll({ message: "Starting video generation...", progress: 5 });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: fullPrompt,
      image: initialImage ? {
        imageBytes: initialImage.base64,
        mimeType: initialImage.mimeType,
      } : undefined,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    onPoll({ message: "Processing your request... This may take a few minutes.", progress: 10 });
    
    let pollCount = 0;
    const maxPolls = 12; // Simulate ~2 minutes of generation time

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      pollCount++;
      
      const progress = 10 + Math.floor((pollCount / maxPolls) * 80);
      const messageIndex = pollCount % pollingMessages.length;
      onPoll({ message: pollingMessages[messageIndex], progress: Math.min(progress, 90) });
      
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was provided.");
    }
    
    onPoll({ message: "Finalizing video...", progress: 95 });
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Failed to download the generated video. Status: ${response.status}`);
    }

    const blob = await response.blob();
    onPoll({ message: "Done!", progress: 100 });
    return URL.createObjectURL(blob);
  }
};
