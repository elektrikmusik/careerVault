import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for Models
export const FAST_MODEL = 'gemini-2.5-flash';
export const PRO_MODEL = 'gemini-3-pro-preview';
export const CHAT_MODEL = 'gemini-3-pro-preview';

// --- Banned Words Configuration ---
const BANNED_WORDS = [
  "delve", "realm", "harness", "unlock", "tapestry", "paradigm", "cutting-edge", "revolutionize", 
  "landscape", "potential", "findings", "intricate", "showcasing", "crucial", "pivotal", "surpass", 
  "meticulously", "vibrant", "unparalleled", "underscore", "leverage", "synergy", "innovative", 
  "game-changer", "testament", "commendable", "meticulous", "highlight", "emphasize", "boast", 
  "groundbreaking", "align", "foster", "showcase", "enhance", "holistic", "garner", "accentuate", 
  "pioneering", "trailblazing", "unleash", "versatile", "transformative", "redefine", "seamless", 
  "optimize", "scalable", "robust", "breakthrough", "empower", "streamline", "intelligent", "smart", 
  "next-gen", "frictionless", "elevate", "adaptive", "effortless", "data-driven", "insightful", 
  "proactive", "mission-critical", "visionary", "disruptive", "reimagine", "agile", "customizable", 
  "personalized", "unprecedented", "intuitive", "leading-edge", "synergize", "democratize", 
  "automate", "accelerate", "state-of-the-art", "dynamic", "reliable", "efficient", "cloud-native", 
  "immersive", "predictive", "transparent", "proprietary", "integrated", "plug-and-play", "turnkey", 
  "future-proof", "open-ended", "AI-powered", "next-generation", "always-on", "hyper-personalized", 
  "results-driven", "machine-first", "paradigm-shifting"
];

export const BANNED_WORDS_INSTRUCTION = `
STRICT STYLE GUIDELINE:
Do NOT use the following words or phrases in your response: ${BANNED_WORDS.join(", ")}.
Instead, use simple, direct, and professional language. Focus on facts, actions, and results.
`;

export const streamChatMessage = async (
  history: { role: 'user' | 'model'; content: string }[],
  newMessage: string
) => {
  try {
    const chat = ai.chats.create({
      model: CHAT_MODEL,
      history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      config: {
        systemInstruction: `You are a helpful AI career counselor. Help the user with job search advice, interview prep, and career planning.
        ${BANNED_WORDS_INSTRUCTION}`,
      }
    });

    return await chat.sendMessageStream({ message: newMessage });
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};