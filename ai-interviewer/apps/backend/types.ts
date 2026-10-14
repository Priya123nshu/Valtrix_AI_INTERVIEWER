import z from "zod";

export const PreInterviewBody = z.object({
  github: z.string().optional().default(""),
  resumeBase64: z.string().optional(),
  resumeFileName: z.string().optional(),
  targetCompany: z.string().optional().default("Tech Company"),
  seniorityLevel: z.enum(["Fresher", "Mid", "Senior"]).optional().default("Mid"),
  durationMinutes: z.number().optional().default(30),
});

export interface ExtractedResume {
  fullName: string;
  summary: string;
  targetRole?: string;
  topSkills: string[];
  workExperience: {
    company: string;
    role: string;
    duration: string;
    keyAchievements: string[];
    technicalClaims: string[];
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    architectureHighlights?: string;
  }[];
  education: {
    institution: string;
    degree: string;
    year: string;
  }[];
}

export interface ScrapedQuestionItem {
  company: string;
  level: string;
  role: string;
  round_type: string;
  round_number: number;
  duration_min: number;
  question_summary: string;
  topics: string[];
  difficulty: "easy" | "medium" | "hard";
  followups: string[];
  evaluation_signals: string[];
  source_url: string;
  date: string;
  confidence: number;
}

export interface CompanyIntelPackage {
  companyName: string;
  normalizedLevel: string;
  archetype: "Product" | "Fintech" | "ITServices" | "CloudSaaS";
  cultureValues: string[];
  techStack: string[];
  interviewRoundsOverview: string[];
  questions: ScrapedQuestionItem[];
}