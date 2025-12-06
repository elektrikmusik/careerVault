import { Type } from "@google/genai";
import { Experience, StructuredData } from "../types";
import { ai, FAST_MODEL, BANNED_WORDS_INSTRUCTION } from "./geminiService";

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

export const refineBulletPoint = async (text: string, options?: { tone?: string, length?: string }): Promise<string> => {
  const tone = options?.tone || 'Professional';
  const length = options?.length || 'Concise';
  
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `Rewrite this resume bullet point to be more professional, impactful, and result-oriented using the STAR method.
      
      STRICT STRUCTURE RULE:
      The output MUST follow one of these two patterns:
      1. Action Verb + Task or Project + Metric or Result
      2. Action Verb + Metric or Result + Task or Project
      
      Tone: ${tone}.
      Length: ${length}.
      Use strong action verbs. Avoid banned words.
      
      Bullet: "${text}"`,
      config: {
        systemInstruction: BANNED_WORDS_INSTRUCTION,
      }
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Error refining bullet:", error);
    return text;
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