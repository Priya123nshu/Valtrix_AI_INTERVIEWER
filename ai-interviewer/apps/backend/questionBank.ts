export type SeniorityLevel = "Fresher" | "Mid" | "Senior";

export interface BehavioralQuestionItem {
  id: string;
  category: 
    | "CompanyMotivation"
    | "Ownership"
    | "ConflictResolution"
    | "Ambiguity"
    | "DeliveryUnderPressure"
    | "TechnicalLeadership"
    | "QualityBar"
    | "FailureAndLearning";
  level: SeniorityLevel;
  question: string;
  evalCriteria: string;
}

export const QUESTION_BANK: BehavioralQuestionItem[] = [
  // --- FRESHER LEVEL (Foundations, Learning Velocity, Team Dynamics) ---
  {
    id: "fresher-1",
    category: "CompanyMotivation",
    level: "Fresher",
    question: "Why do you want to join {{COMPANY}}, and how does this role align with where you want to start and grow your engineering career?",
    evalCriteria: "Demonstrates authentic research into {{COMPANY}}, personal passion, and a clear vision for foundational learning."
  },
  {
    id: "fresher-2",
    category: "Ownership",
    level: "Fresher",
    question: "Give an example of an academic project, open-source work, or internship where you took ownership of a problem that wasn't formally assigned to you. What was the outcome?",
    evalCriteria: "Proactivity, going beyond the basic rubric or task assignment to deliver meaningful results."
  },
  {
    id: "fresher-3",
    category: "Ambiguity",
    level: "Fresher",
    question: "Describe a situation where you had to build a project using a programming language, library, or framework you had never touched before. How did you get up to speed and unblock yourself?",
    evalCriteria: "Self-driven learning methodology, ability to read documentation, and resourcefulness."
  },
  {
    id: "fresher-4",
    category: "ConflictResolution",
    level: "Fresher",
    question: "Tell me about a time someone gave you critical or tough feedback on your code or design during a review. How did you receive it and what changed in your subsequent work?",
    evalCriteria: "Openness to feedback, humility, positive attitude, and willingness to improve."
  },
  {
    id: "fresher-5",
    category: "DeliveryUnderPressure",
    level: "Fresher",
    question: "Give an example where you delivered a high-impact project under aggressive deadlines. What mechanisms or habits kept you on track?",
    evalCriteria: "Prioritization skills, milestone breakdown, avoiding perfectionist traps."
  },
  {
    id: "fresher-6",
    category: "FailureAndLearning",
    level: "Fresher",
    question: "Tell me about a time you encountered a stubborn bug or missed a project milestone. How did you analyze what went wrong and prevent recurrence?",
    evalCriteria: "Root-cause thinking, systematic debugging, resilience, and personal accountability."
  },
  {
    id: "fresher-7",
    category: "TechnicalLeadership",
    level: "Fresher",
    question: "How have you kept your technical skills current in the last year, and what personal project did you build or contribute to that demonstrates that learning?",
    evalCriteria: "Continuous learning enthusiasm, building projects beyond classroom syllabus."
  },

  // --- MID-LEVEL (Autonomy, Pragmatism, Trade-offs, Engineering Craft) ---
  {
    id: "mid-1",
    category: "CompanyMotivation",
    level: "Mid",
    question: "Why are you leaving your current company, and why is {{COMPANY}} the right environment for your next engineering leap?",
    evalCriteria: "Professional framing, clear motivation toward {{COMPANY}}'s tech stack and scale."
  },
  {
    id: "mid-2",
    category: "Ownership",
    level: "Mid",
    question: "Give an example of a project where you took ownership of an ambiguous problem that wasn't formally assigned to you. What was the outcome?",
    evalCriteria: "Bias for action, recognizing system inefficiencies, end-to-end execution."
  },
  {
    id: "mid-3",
    category: "Ambiguity",
    level: "Mid",
    question: "Describe a situation where you had limited data or unclear requirements but still had to decide and act. What mechanisms increased your confidence?",
    evalCriteria: "Hypothesis testing, prototyping, telemetry instrumentation, risk mitigation."
  },
  {
    id: "mid-4",
    category: "DeliveryUnderPressure",
    level: "Mid",
    question: "Describe a situation where you had to balance short-term delivery with long-term code quality and customer satisfaction. What specific trade-offs did you make?",
    evalCriteria: "Pragmatic balance between business velocity and technical debt, documenting follow-ups."
  },
  {
    id: "mid-5",
    category: "DeliveryUnderPressure",
    level: "Mid",
    question: "When a deliverable was trending off-track, how did you raise the flag early and get it back on schedule without burning out the team?",
    evalCriteria: "Early communication, scope negotiation, stakeholder transparency."
  },
  {
    id: "mid-6",
    category: "QualityBar",
    level: "Mid",
    question: "Describe a time you removed needless complexity from an existing codebase or pipeline. How did you validate that it was truly simpler and didn't regress behavior?",
    evalCriteria: "Refactoring safely, automated test suites, measurable complexity reduction."
  },
  {
    id: "mid-7",
    category: "FailureAndLearning",
    level: "Mid",
    question: "Tell me about a time you missed a commitment. How did you analyze the planning fallacy, course correct, and ensure it did not recur?",
    evalCriteria: "Honest retrospective, realistic estimations, improved sprint planning."
  },
  {
    id: "mid-8",
    category: "TechnicalLeadership",
    level: "Mid",
    question: "What would your colleagues say about you when asked about your technical strengths, code review style, and team collaboration?",
    evalCriteria: "Self-awareness, emotional intelligence, constructive review habits."
  },

  // --- SENIOR / LEAD LEVEL (Systems Architecture, Influence, Culture, Strategic Decisions) ---
  {
    id: "senior-1",
    category: "CompanyMotivation",
    level: "Senior",
    question: "Given your senior experience, why do you want to join {{COMPANY}} specifically, and what impact do you expect to drive across our engineering org in your first 6 months?",
    evalCriteria: "Strategic understanding of {{COMPANY}}'s business, architectural challenges, and high-leverage contributions."
  },
  {
    id: "senior-2",
    category: "ConflictResolution",
    level: "Senior",
    question: "Recall a meeting where you disagreed strongly with a principal engineer, architect, or engineering manager. How did you drive the technical decision without damaging team trust?",
    evalCriteria: "Data-driven persuasion, disagree-and-commit maturity, building consensus."
  },
  {
    id: "senior-3",
    category: "TechnicalLeadership",
    level: "Senior",
    question: "Describe a time you had to earn a skeptical stakeholder or partner team's trust on a major architectural change. What specific behaviors changed their perception?",
    evalCriteria: "Clear communication, POC demonstrations, empathy for partner constraints."
  },
  {
    id: "senior-4",
    category: "TechnicalLeadership",
    level: "Senior",
    question: "Tell me about the most inventive or impactful technical solution you delivered in the past 3 years. What architectural alternatives did you evaluate and reject?",
    evalCriteria: "Deep technical insight, non-trivial architectural trade-offs, measurable business impact."
  },
  {
    id: "senior-5",
    category: "QualityBar",
    level: "Senior",
    question: "Tell me about a project where you raised the engineering quality bar across your team (e.g., testing conventions, CI/CD, canary rollouts, observability). What metrics moved?",
    evalCriteria: "Institutionalizing engineering excellence, tracking MTTR, error budgets, test coverage."
  },
  {
    id: "senior-6",
    category: "ConflictResolution",
    level: "Senior",
    question: "Share an instance where you gave tough but constructive feedback to a peer or direct report. How did you deliver it and what changed in their execution?",
    evalCriteria: "Radical candor with empathy, specific actionable coaching, measurable turnaround."
  },
  {
    id: "senior-7",
    category: "FailureAndLearning",
    level: "Senior",
    question: "Describe a major production outage, data corruption, or system failure your team encountered. How did you lead the incident response and the blameless post-mortem?",
    evalCriteria: "Calm leadership during severity-1 incidents, blameless culture, systemic prevention."
  },
  {
    id: "senior-8",
    category: "TechnicalLeadership",
    level: "Senior",
    question: "How have you kept your technical skills and systems thinking current in the last year, and how did you scale that knowledge across your engineering organization?",
    evalCriteria: "Continuous learning, tech talks, architecture reviews, elevating peers."
  }
];

export function getQuestionsForLevel(level: SeniorityLevel, companyName: string): BehavioralQuestionItem[] {
  const normalizedLevel = level === "Fresher" ? "Fresher" : level === "Senior" ? "Senior" : "Mid";
  return QUESTION_BANK
    .filter(q => q.level === normalizedLevel)
    .map(q => ({
      ...q,
      question: q.question.replace(/\{\{COMPANY\}\}/g, companyName || "this company")
    }));
}
