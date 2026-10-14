import { CompanyIntelPackage, ScrapedQuestionItem } from "../types";
import { prisma } from "../db";

const CONTEXT_DEV_API_KEY = process.env.CONTEXT_DEV_API_KEY || "ctxt_secret_f3b13b74c16f4e6c96b28e96e2992701";

export function mapSeniorityToRoleLevel(company: string, seniority: string): { levelCode: string; roleName: string; archetype: "Product" | "Fintech" | "ITServices" | "CloudSaaS" } {
  const c = company.toLowerCase();

  // 1. Big Tech / Product
  if (c.includes("google") || c.includes("alphabet")) {
    if (seniority === "Fresher") return { levelCode: "L3", roleName: "Software Engineer, University Graduate", archetype: "Product" };
    if (seniority === "Senior") return { levelCode: "L5", roleName: "Senior Software Engineer", archetype: "Product" };
    return { levelCode: "L4", roleName: "Software Engineer II", archetype: "Product" };
  }
  if (c.includes("amazon")) {
    if (seniority === "Fresher") return { levelCode: "SDE I", roleName: "Software Development Engineer I", archetype: "Product" };
    if (seniority === "Senior") return { levelCode: "SDE III", roleName: "Senior Software Development Engineer", archetype: "Product" };
    return { levelCode: "SDE II", roleName: "Software Development Engineer II", archetype: "Product" };
  }
  if (c.includes("meta")) {
    if (seniority === "Fresher") return { levelCode: "E3", roleName: "Software Engineer (Rotational/Entry)", archetype: "Product" };
    if (seniority === "Senior") return { levelCode: "E5", roleName: "Senior Software Engineer", archetype: "Product" };
    return { levelCode: "E4", roleName: "Software Engineer", archetype: "Product" };
  }
  if (c.includes("microsoft")) {
    if (seniority === "Fresher") return { levelCode: "L59-L60", roleName: "Software Engineer", archetype: "Product" };
    if (seniority === "Senior") return { levelCode: "L63-L64", roleName: "Senior Software Engineer", archetype: "Product" };
    return { levelCode: "L61-L62", roleName: "Software Engineer II", archetype: "Product" };
  }
  if (c.includes("apple") || c.includes("netflix") || c.includes("uber")) {
    if (seniority === "Fresher") return { levelCode: "ICT2", roleName: "Software Engineer I", archetype: "Product" };
    if (seniority === "Senior") return { levelCode: "ICT4", roleName: "Senior Software Engineer", archetype: "Product" };
    return { levelCode: "ICT3", roleName: "Software Engineer II", archetype: "Product" };
  }

  // 2. Fintech & Investment Banking
  if (c.includes("jpmorgan") || c.includes("morgan stanley") || c.includes("goldman") || c.includes("visa") || c.includes("mastercard")) {
    if (seniority === "Fresher") return { levelCode: "Analyst", roleName: "Software Engineering Analyst", archetype: "Fintech" };
    if (seniority === "Senior") return { levelCode: "VP / Lead", roleName: "Vice President / Lead Engineer", archetype: "Fintech" };
    return { levelCode: "Associate", roleName: "Software Engineering Associate", archetype: "Fintech" };
  }

  // 3. Indian & Global IT Services / Systems Integrators
  if (c.includes("tcs") || c.includes("infosys") || c.includes("wipro") || c.includes("hcl") || c.includes("tech mahindra") || c.includes("cognizant") || c.includes("accenture")) {
    if (seniority === "Fresher") return { levelCode: "Associate / Trainee", roleName: "Systems Engineer / Associate Software Engineer", archetype: "ITServices" };
    if (seniority === "Senior") return { levelCode: "Tech Lead", roleName: "Technical Lead / Specialist", archetype: "ITServices" };
    return { levelCode: "Senior Systems Engineer", roleName: "Software Engineer / Senior Systems Engineer", archetype: "ITServices" };
  }

  // 4. Cloud & Enterprise SaaS Default
  return { levelCode: seniority, roleName: `${seniority} Software Engineer`, archetype: "CloudSaaS" };
}

export async function fetchCompanyIntelligence(company: string, seniority: string): Promise<CompanyIntelPackage> {
  const { levelCode, roleName, archetype } = mapSeniorityToRoleLevel(company, seniority);
  console.log(`[Company Intel] Fetching intelligence for ${company} (${levelCode} - ${archetype})...`);

  // 1. Check database cache
  try {
    const cachedReports = await prisma.scrapedInterviewReport.findMany({
      where: { company, level: levelCode }
    });

    if (cachedReports && cachedReports.length >= 2) {
      console.log(`[Company Intel] Found ${cachedReports.length} cached question reports for ${company} (${levelCode}). Using cache.`);
      return {
        companyName: company,
        normalizedLevel: levelCode,
        archetype,
        cultureValues: getArchetypeCulture(archetype, company),
        techStack: getArchetypeStack(archetype),
        interviewRoundsOverview: getArchetypeRounds(archetype, levelCode),
        questions: cachedReports as ScrapedQuestionItem[]
      };
    }
  } catch (err: any) {
    console.warn(`[Company Intel] Cache lookup warning:`, err.message);
  }

  // 2. Query context.dev Web Search API
  let rawSearchSnippets = "";
  try {
    const query = `${company} ${levelCode} software engineer technical interview questions LeetCode Discuss AmbitionBox GeeksforGeeks hiring bar 2025 2026`;
    console.log(`[Company Intel] Querying context.dev Web Search API: "${query}"...`);

    const res = await fetch("https://api.context.dev/v1/web/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CONTEXT_DEV_API_KEY}`
      },
      body: JSON.stringify({
        query,
        freshness: "last_year",
        queryFanout: true,
        highlightsOptions: { enabled: true }
      })
    });

    if (res.ok) {
      const searchData = await res.json();
      const results = searchData.results || [];
      rawSearchSnippets = results.slice(0, 5).map((r: any, idx: number) => {
        const highlights = r.highlights?.highlights ? r.highlights.highlights.join(" ") : "";
        return `Report ${idx + 1}: ${r.title} (${r.url})\nSummary: ${r.description}\nHighlights: ${highlights}`;
      }).join("\n\n");
      console.log(`[Company Intel] context.dev search returned ${results.length} ranked source reports.`);
    } else {
      console.warn(`[Company Intel] context.dev returned status ${res.status}. Falling back to domain knowledge.`);
    }
  } catch (apiErr: any) {
    console.warn(`[Company Intel] context.dev request error: ${apiErr.message}`);
  }

  // 3. Normalize into Structured Questions using GPT-4o
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    console.warn("[Company Intel] No OPENAI_API_KEY found, generating baseline archetype intel.");
    return generateFallbackPackage(company, levelCode, roleName, archetype);
  }

  const prompt = `
You are a Principal Hiring Intelligence Officer specializing in tech interview reverse-engineering.
Based on the live web search reports below for ${company} (${roleName}, Level: ${levelCode}), extract and structure real technical interview questions and round details into JSON.

LIVE SEARCH INTEL:
${rawSearchSnippets || `Target Company: ${company}, Role: ${roleName}, Archetype: ${archetype}`}

Return a valid JSON object matching this schema:
{
  "cultureValues": ["2-3 specific cultural/leadership values for ${company}, e.g. Amazon LPs, Googleyness, JPMC Risk Culture"],
  "techStack": ["Top 4-5 technologies/languages tested at ${company}"],
  "interviewRoundsOverview": ["Overview of typical 3-4 interview rounds at ${company}"],
  "questions": [
    {
      "company": "${company}",
      "level": "${levelCode}",
      "role": "${roleName}",
      "round_type": "technical_coding or system_design or behavioral",
      "round_number": 2,
      "duration_min": 45,
      "question_summary": "Concise summary of a real question frequently asked by ${company}",
      "topics": ["topic1", "topic2"],
      "difficulty": "medium",
      "followups": ["concrete follow-up 1", "concrete follow-up 2 on scale or constraints"],
      "evaluation_signals": ["signal 1", "signal 2", "edge cases"],
      "source_url": "LeetCode Discuss / AmbitionBox / GeeksforGeeks",
      "date": "2026-03",
      "confidence": 0.85
    }
  ]
}

Instructions:
1. Provide 2 to 3 high-frequency questions calibrated to ${company} for a ${levelCode} candidate.
2. If this is a Product company (Google, Amazon), include real DSA / System Design prompts.
3. If this is Fintech (JPMorgan, Goldman), include concurrency, distributed ledgers, and low-latency considerations.
4. If this is IT Services (TCS, Infosys), include OOP, DBMS, SQL, and practical problem solving.
5. Return ONLY valid JSON.
`;

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You extract structured hiring intelligence and interview questions into JSON." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        const questions: ScrapedQuestionItem[] = parsed.questions || [];

        // Save to database cache
        try {
          await prisma.scrapedInterviewReport.createMany({
            data: questions.map(q => ({
              company: q.company,
              level: q.level,
              role: q.role,
              roundType: q.round_type,
              roundNumber: q.round_number || 1,
              durationMin: q.duration_min || 45,
              questionSummary: q.question_summary,
              topics: q.topics || [],
              difficulty: q.difficulty || "medium",
              followups: q.followups || [],
              evaluationSignals: q.evaluation_signals || [],
              sourceUrl: q.source_url || "context.dev",
              date: q.date || "2026-03",
              confidence: q.confidence || 0.8
            }))
          });
          console.log(`[Company Intel] Successfully cached ${questions.length} structured question reports in database.`);
        } catch (dbErr: any) {
          console.warn("[Company Intel] Error saving reports to DB cache:", dbErr.message);
        }

        return {
          companyName: company,
          normalizedLevel: levelCode,
          archetype,
          cultureValues: parsed.cultureValues || getArchetypeCulture(archetype, company),
          techStack: parsed.techStack || getArchetypeStack(archetype),
          interviewRoundsOverview: parsed.interviewRoundsOverview || getArchetypeRounds(archetype, levelCode),
          questions
        };
      }
    }
  } catch (err: any) {
    console.error("[Company Intel] GPT-4o structuring error:", err.message);
  }

  return generateFallbackPackage(company, levelCode, roleName, archetype);
}

function getArchetypeCulture(archetype: string, company: string): string[] {
  if (archetype === "Product") return ["Navigating Ambiguity", "Intellectual Humility & Googleyness / Leadership Principles", "System Ownership"];
  if (archetype === "Fintech") return ["Fiduciary Responsibility & Risk Management", "Data Integrity", "Client Focus under Pressure"];
  if (archetype === "ITServices") return ["Client Centricity & Clear Communication", "Structured Delivery", "Continuous Technical Upskilling"];
  return ["Customer Obsession", "Architectural Rigor", "Fast Execution"];
}

function getArchetypeStack(archetype: string): string[] {
  if (archetype === "Product") return ["Distributed Systems", "C++ / Go / Java", "Kafka", "PostgreSQL / Spanner"];
  if (archetype === "Fintech") return ["Java Concurrency", "Python", "SQL / Relational Integrity", "Low-Latency Event Streaming"];
  if (archetype === "ITServices") return ["Core Java / Spring Boot", ".NET Core", "SQL / Relational DBMS", "RESTful APIs"];
  return ["TypeScript / Node.js", "Go", "Docker / Kubernetes", "Cloud Infrastructure"];
}

function getArchetypeRounds(archetype: string, level: string): string[] {
  if (archetype === "Product") return ["Online Coding Screen (60m)", "Data Structures & Algorithmic Problem Solving (45m)", "Systems Architecture & Design (45m)", "Behavioral & Googleyness / Leadership Principles (45m)"];
  if (archetype === "Fintech") return ["Technical Phone Screen (45m)", "HackerRank Coding Challenge", "Virtual Superday: PR Review & Live Code (60m)", "System Design & Financial Architecture (45m)"];
  if (archetype === "ITServices") return ["Aptitude & Coding Online Assessment (90m)", "Technical Interview on CS Fundamentals & OOP (45m)", "Project Deep Dive & Architecture (30m)", "HR & Managerial Discussion (20m)"];
  return ["Technical Screen (45m)", "System Architecture Round (45m)", "Cultural & Leadership Round (30m)"];
}

function generateFallbackPackage(company: string, levelCode: string, roleName: string, archetype: "Product" | "Fintech" | "ITServices" | "CloudSaaS"): CompanyIntelPackage {
  return {
    companyName: company,
    normalizedLevel: levelCode,
    archetype,
    cultureValues: getArchetypeCulture(archetype, company),
    techStack: getArchetypeStack(archetype),
    interviewRoundsOverview: getArchetypeRounds(archetype, levelCode),
    questions: [
      {
        company,
        level: levelCode,
        role: roleName,
        round_type: levelCode === "L5" || levelCode.includes("Senior") ? "system_design" : "technical_coding",
        round_number: 2,
        duration_min: 45,
        question_summary: levelCode.includes("Senior") 
          ? `Design a high-throughput, low-latency distributed event ingestion pipeline for ${company}`
          : `Graph traversal with dynamic obstacles, optimizing space under memory constraints`,
        topics: levelCode.includes("Senior") ? ["distributed systems", "Kafka", "eventual consistency"] : ["graphs", "BFS", "space optimization"],
        difficulty: "medium",
        followups: ["How does time and space complexity scale under 100x traffic?", "What happens if a node fails during execution?"],
        evaluation_signals: ["problem solving", "architectural trade-offs", "communication"],
        source_url: "LeetCode Discuss",
        date: "2026-03",
        confidence: 0.85
      }
    ]
  };
}
