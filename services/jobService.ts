import { Type, Schema } from "@google/genai";
import { StructuredData } from "../types";
import { ai, PRO_MODEL } from "./geminiService";

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