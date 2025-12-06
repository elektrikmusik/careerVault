import { Type, Schema } from "@google/genai";
import { Experience, FitAnalysisResult } from "../types";
import { ai, PRO_MODEL, FAST_MODEL, BANNED_WORDS_INSTRUCTION } from "./geminiService";

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