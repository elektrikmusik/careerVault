import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Experience, StructuredData, FitAnalysisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for Models
const FAST_MODEL = 'gemini-2.5-flash';
const PRO_MODEL = 'gemini-3-pro-preview';
const CHAT_MODEL = 'gemini-3-pro-preview';

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

const BANNED_WORDS_INSTRUCTION = `
STRICT STYLE GUIDELINE:
Do NOT use the following words or phrases in your response: ${BANNED_WORDS.join(", ")}.
Instead, use simple, direct, and professional language. Focus on facts, actions, and results.
`;

// --- Schemas ---

const structuredDataSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    tangibleSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Concrete, measurable competencies and achievements" },
    competencies: { type: Type.ARRAY, items: { type: Type.STRING } },
    qualifications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Educational credentials, certifications" },
    tools: { type: Type.ARRAY, items: { type: Type.STRING } },
    experienceLevel: { type: Type.STRING, enum: ["Junior", "Mid-Level", "Senior", "Lead", "Executive"] },
    seniority: { type: Type.STRING },
    summaryBullets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key responsibilities and requirements summarized as bullet points" },
    industry: { type: Type.STRING, description: "The primary industry of the job (e.g. Fintech, Healthcare, E-commerce)" },
    jobType: { type: Type.STRING, description: "Job type (e.g. Full-time, Contract, Remote, Hybrid)" },
  },
  required: ["skills", "competencies", "experienceLevel", "summaryBullets"],
};

const fitAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "Match score between 0 and 100" },
    gapAnalysis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of missing skills or qualifications" },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of matching strong points" },
    summary: { type: Type.STRING, description: "Brief summary of the fit analysis" },
    recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific actions to close gaps" }
  },
  required: ["score", "gapAnalysis", "strengths", "summary", "recommendedActions"]
};

// --- Services ---

export const parseCareerHistory = async (text: string): Promise<Partial<Experience>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `The user has provided a file containing their career history. It may contain multiple roles at different companies, or multiple roles within the same company (promotions/moves).
      
      Please parse this text and split it into distinct professional experiences.
      For each experience, extract:
      - Title
      - Company
      - Start Date (Format: YYYY-MM-DD if possible)
      - End Date (Format: YYYY-MM-DD or "Present")
      - Raw Description: Include the FULL narrative, bullet points, and specific details associated with that role. Do NOT summarize. Preserve the original detail.
      
      Input Text:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            experiences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  company: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  rawDescription: { type: Type.STRING },
                },
                required: ["title", "company", "rawDescription"]
              }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json.experiences || [];
  } catch (error) {
    console.error("Error parsing career history:", error);
    return [];
  }
};

export const enrichExperience = async (rawText: string): Promise<Partial<Experience>> => {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `Analyze the following career experience. Extract and formulate the following fields:
      1. Industry (e.g., Automotive, Fintech)
      2. Sector (e.g., Manufacturing, Software Development)
      3. Products/Services (List of key products or services worked on)
      4. About Company (Brief description of what the company does, based on context or general knowledge)
      5. STAR Bullets (Synthetic bullet points using the Situation, Task, Action, Result method. Use strong verbs. Avoid banned words.)
      6. Hard Skills (Technical and functional skills)
      7. Soft Skills (Interpersonal and leadership skills)
      
      Raw Text:
      ${rawText}`,
      config: {
        systemInstruction: BANNED_WORDS_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            industry: { type: Type.STRING },
            sector: { type: Type.STRING },
            products: { type: Type.ARRAY, items: { type: Type.STRING } },
            aboutCompany: { type: Type.STRING },
            starBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            hardSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["starBullets", "hardSkills", "softSkills"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json;
  } catch (error) {
    console.error("Error enriching experience:", error);
    return {};
  }
};

// Deprecated: kept for compatibility if needed, but enrichedExperience covers it.
export const reformulateExperience = async (rawText: string): Promise<string[]> => {
  const result = await enrichExperience(rawText);
  return result.starBullets || [];
};

// Deprecated: kept for compatibility.
export const extractStructuredData = async (text: string): Promise<StructuredData> => {
  const result = await enrichExperience(text);
  return {
    skills: [...(result.hardSkills || []), ...(result.softSkills || [])],
    competencies: result.softSkills || [],
    tools: result.hardSkills || [],
    experienceLevel: "Mid-Level",
    seniority: "N/A",
    tangibleSkills: result.products
  };
};

export const analyzeJobDescription = async (text: string, url?: string): Promise<StructuredData> => {
  try {
    let prompt = `Analyze this job description. Extract structured requirements, industry, job type, and a summary of key responsibilities as bullet points: ${text}`;
    const tools = [];
    
    // Use Google Search if URL provided and text is minimal
    if (url && text.length < 50) {
      prompt = `Find the job description for this URL: ${url}. Analyze the content and extract structured requirements, including summary bullets, industry, and job type.
      Return the output as valid JSON matching the schema: { skills: [], tangibleSkills: [], competencies: [], qualifications: [], tools: [], experienceLevel: "", seniority: "", summaryBullets: [], industry: "", jobType: "" }
      `;
      tools.push({ googleSearch: {} });
    }

    const hasTools = tools.length > 0;

    const response = await ai.models.generateContent({
      model: PRO_MODEL, // Using Pro for search/reasoning
      contents: prompt,
      config: {
        // responseMimeType and responseSchema cannot be used with googleSearch tool
        responseMimeType: hasTools ? undefined : "application/json",
        responseSchema: hasTools ? undefined : structuredDataSchema,
        tools: hasTools ? tools : undefined
      },
    });

    let jsonText = response.text || "{}";
    // If tools were used, the response might be wrapped in markdown JSON blocks, clean it up
    if (hasTools) {
       jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
       const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         jsonText = jsonMatch[0];
       }
    }

    return JSON.parse(jsonText) as StructuredData;
  } catch (error) {
    console.error("Error analyzing job:", error);
    throw error;
  }
};

export const calculateFit = async (candidateData: Experience[], jobDescription: string): Promise<FitAnalysisResult> => {
  try {
    const candidateSummary = candidateData.map(exp => {
      // Prioritize new fields
      const desc = exp.starBullets?.join('\n') || exp.professionalBullets?.join('\n') || exp.rawDescription;
      const skills = [...(exp.hardSkills || []), ...(exp.softSkills || []), ...(exp.structuredData?.skills || [])].join(', ');
      
      return `Role: ${exp.title} at ${exp.company}. 
       Industry: ${exp.industry || 'N/A'}. Sector: ${exp.sector || 'N/A'}.
       Products: ${exp.products?.join(', ') || 'N/A'}.
       Description: ${desc}. 
       Skills: ${skills}.`;
    }).join('\n\n');

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Compare the following Candidate Profile with the Job Description. 
      Provide a match score (0-100), analyze gaps, and suggest specific recommended actions to improve fit (e.g., "Add metrics to Project X").
      
      JOB DESCRIPTION:
      ${jobDescription}
      
      CANDIDATE PROFILE:
      ${candidateSummary}`,
      config: {
        systemInstruction: BANNED_WORDS_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: fitAnalysisSchema,
      },
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as FitAnalysisResult;
  } catch (error) {
    console.error("Error calculating fit:", error);
    throw error;
  }
};

export const generateResume = async (candidateData: Experience[], jobDescription: string): Promise<string> => {
  try {
    const candidateSummary = candidateData.map(exp => {
       const desc = exp.starBullets?.join('\n') || exp.professionalBullets?.join('\n') || exp.rawDescription;
       const skills = [...(exp.hardSkills || []), ...(exp.softSkills || [])].join(', ');
       return `Role: ${exp.title} at ${exp.company}. Dates: ${exp.startDate} - ${exp.endDate}. 
       Industry: ${exp.industry}. Products: ${exp.products?.join(', ')}.
       Details: ${desc}
       Skills: ${skills}`;
    }).join('\n\n');

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Write a tailored resume for this candidate specifically for the provided job description. 
      Focus on relevant skills and achievements. Format in Markdown.
      Ensure the layout is ATS-friendly (no tables, standard headings).
      Use the STAR method bullets provided in the candidate profile where possible.
      
      JOB DESCRIPTION:
      ${jobDescription}
      
      CANDIDATE EXPERIENCE:
      ${candidateSummary}`,
      config: {
        systemInstruction: BANNED_WORDS_INSTRUCTION
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Error generating resume:", error);
    throw error;
  }
};

export const generateCoverLetter = async (candidateData: Experience[], jobDescription: string): Promise<string> => {
  try {
    const candidateSummary = candidateData.map(exp => `${exp.title} at ${exp.company} (${exp.industry})`).join(', ');

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Write a compelling cover letter for this candidate applying to the job. Match the tone of the job description.
      
      JOB DESCRIPTION:
      ${jobDescription}
      
      CANDIDATE HIGHLIGHTS:
      ${candidateSummary}`,
      config: {
        systemInstruction: BANNED_WORDS_INSTRUCTION
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Error generating cover letter:", error);
    throw error;
  }
};

export const validateResumeATS = async (resumeText: string): Promise<{ score: number; issues: string[]; suggestions: string[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `Analyze this resume content for ATS (Applicant Tracking System) compatibility.
      Check for: formatting issues, keyword density, clarity, and structure.
      Return JSON with a score (0-100), a list of issues, and a list of suggestions.
      
      Resume Content:
      ${resumeText}`,
      config: {
        systemInstruction: BANNED_WORDS_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("ATS Validation error", error);
    return { score: 0, issues: ["Analysis failed"], suggestions: [] };
  }
};

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