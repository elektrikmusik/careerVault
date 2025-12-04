export interface StructuredData {
  skills: string[];
  tangibleSkills?: string[];
  competencies: string[];
  qualifications?: string[];
  tools: string[];
  experienceLevel: string;
  seniority: string;
  summaryBullets?: string[];
  industry?: string;
  jobType?: string;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  rawDescription: string;
  
  // New Structured Fields
  industry?: string;
  sector?: string;
  products?: string[];
  aboutCompany?: string;
  starBullets?: string[];
  hardSkills?: string[];
  softSkills?: string[];

  // Deprecated/Legacy (kept for backward compatibility during migration)
  professionalBullets?: string[]; 
  professionalDescription?: string;
  structuredData?: StructuredData;
}

export enum ApplicationStatus {
  BOOKMARKED = 'Bookmarked',
  APPLYING = 'Applying',
  APPLIED = 'Applied',
  INTERVIEWING = 'Interviewing',
  NEGOTIATING = 'Negotiating',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected'
}

export interface Job {
  id: string;
  title: string;
  company: string;
  url?: string;
  description: string;
  status: ApplicationStatus;
  structuredData?: StructuredData;
  fitAnalysis?: FitAnalysisResult;
  tailoredResume?: string;
  tailoredCoverLetter?: string;
  createdAt: number;
  industry?: string;
  jobType?: string;
}

export interface FitAnalysisResult {
  score: number;
  gapAnalysis: string[];
  strengths: string[];
  summary: string;
  recommendedActions?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}