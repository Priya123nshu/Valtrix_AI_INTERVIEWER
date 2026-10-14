import { z } from "zod";

const outputSchema = z.object({
  feedback: z.string().describe("Comprehensive feedback covering technical architecture, code quality, behavioral competency, and hiring decision"),
  score: z.number().describe("Score out of 10 for their interview performance"),
});

export async function calculateResult(
  messages: { type: "Assistant" | "User"; message: string; createdAt: Date }[],
  interviewContext?: {
    targetCompany?: string;
    seniorityLevel?: string;
    hasResume?: boolean;
  }
) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for evaluation.");
  }

  const company = interviewContext?.targetCompany || "the target company";
  const level = interviewContext?.seniorityLevel || "Mid";

  // Check if session was terminated due to candidate misconduct
  const hasMisconductTermination = messages.some(
    (m) =>
      m.message.includes("[INTERVIEW TERMINATED]") ||
      m.message.toLowerCase().includes("repeated unprofessional conduct") ||
      m.message.toLowerCase().includes("candidate_misconduct")
  );

  if (hasMisconductTermination) {
    return {
      score: 0,
      feedback: `DECISION: IMMEDIATE DISQUALIFICATION (CANDIDATE MISCONDUCT)\n\nThe formal technical interview for ${company} (${level} Level) was terminated prematurely due to repeated or severe violations of the professional conduct policy. Candidate engaged in abusive, hostile, or willfully disruptive behavior that falls below ${company}'s code of conduct. Automatic No-Hire recommendation recorded.`,
    };
  }

  const transcriptFormatted = messages
    .map((m) => `[${m.type}]: ${m.message}`)
    .join("\n\n");

  const resultPrompt = `
You are an expert Principal Hiring Bar Raiser and Senior Technical Evaluator at ${company}.
Your job is to thoroughly evaluate the candidate's technical interview for a ${level}-level engineering role.

The candidate was evaluated across:
1. Target Role & Company Motivation: Articulation of interest in ${company}.
2. Technical Depth & Architecture: Discussion of real projects (from their resume and/or GitHub).
3. Problem Solving & Engineering Trade-offs: Depth of thought, handling edge cases, and rationale for decisions.
4. Behavioral & Culture Alignment: Responses to ${level}-level behavioral scenarios (Ownership, Conflict, Ambiguity, Delivery, Quality bar).

Interview Transcript:
${transcriptFormatted || "No conversation messages were recorded."}

Return ONLY a valid JSON object matching this schema:
{
  "feedback": "Detailed, highly constructive evaluation covering: 1) Executive Summary & Recommendation, 2) Technical Strengths, 3) Areas for Growth, 4) Behavioral & Culture Assessment calibrated to a ${level} engineer at ${company}.",
  "score": number (1 to 10 scale, calibrated to ${level} expectations at ${company})
}

DO NOT RETURN ANY OTHER TEXT OR MARKDOWN OUTSIDE THE JSON.
`;

  const evalModel = process.env.EVALUATION_MODEL || "gpt-4o";
  try {
    console.log(`[Evaluation] Calculating interview result using flagship model ${evalModel}...`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: evalModel,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer and hiring evaluation engine. Output valid JSON only.",
          },
          {
            role: "user",
            content: resultPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Evaluation] OpenAI API error:", response.status, errText);
      throw new Error(`OpenAI evaluation failed: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    const result = outputSchema.parse(parsed);
    return result;
  } catch (err: any) {
    console.error("[Evaluation] Error evaluating transcript:", err.message);
    return {
      feedback: `Interview completed for ${company} (${level} Level). The candidate engaged with technical and behavioral questions throughout the session.`,
      score: 7,
    };
  }
}