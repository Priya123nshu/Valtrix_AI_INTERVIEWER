import { ExtractedResume } from "../types";

const RESUME_EXTRACTION_PROMPT = `
You are a senior technical interviewer and executive talent evaluator at a top-tier tech company.
Analyze the attached resume and extract comprehensive, high-signal technical details for an upcoming in-depth technical interview.

Extract and structure the data into valid JSON matching this exact schema:
{
  "fullName": "Candidate full name",
  "summary": "2-3 sentence overview highlighting core competencies and domain focus",
  "targetRole": "Role title matching their background (e.g. Senior Backend Engineer, Full-Stack Engineer, Systems Architect)",
  "topSkills": ["TypeScript", "Distributed Systems", "Kubernetes", "PostgreSQL", ...],
  "workExperience": [
    {
      "company": "Company Name",
      "role": "Title",
      "duration": "e.g. Jan 2022 - Present",
      "keyAchievements": [
        "Concrete metrics, shipped features, or scale handled"
      ],
      "technicalClaims": [
        "High-impact technical choices, architectural claims, or performance numbers ripe for deep-dive questioning"
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "What the project does and its core problem statement",
      "technologies": ["React", "Go", "Redis", ...],
      "architectureHighlights": "Notable design decisions, concurrency handling, database schema, or protocols used"
    }
  ],
  "education": [
    {
      "institution": "University / College",
      "degree": "Degree and major",
      "year": "Graduation year or dates"
    }
  ]
}

Instructions:
1. Pay special attention to "technicalClaims" - extract specific claims about scalability, latency improvements, reliability, architectural choices, and systems they built.
2. Return ONLY valid JSON. Do not include markdown code block backticks or any introductory text.
`;

export async function extractResume(base64Data: string, fileName: string = "resume.pdf"): Promise<ExtractedResume> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment");
  }

  // Sanitize base64 string
  let cleanBase64 = base64Data.trim();
  let mimeType = "application/pdf";

  if (cleanBase64.includes(";base64,")) {
    const parts = cleanBase64.split(";base64,");
    const mimeMatch = parts[0].match(/data:(.*)/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
    cleanBase64 = parts[1];
  }

  const model = process.env.RESUME_EXTRACTION_MODEL || "gpt-4o";
  console.log(`[Resume Scraper] Extracting resume "${fileName}" (${mimeType}) using flagship model ${model}...`);

  // If text file, decode directly into prompt text
  if (fileName.endsWith(".txt") || mimeType.includes("text/plain")) {
    const rawText = Buffer.from(cleanBase64, "base64").toString("utf-8");
    return callGpt4oWithText(rawText, model, apiKey);
  }

  // For PDF or documents, first try direct file payload in Chat Completions
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer and resume intelligence engine. Output valid JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: fileName,
                  file_data: `data:${mimeType};base64,${cleanBase64}`,
                },
              },
              {
                type: "text",
                text: RESUME_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        console.log(`[Resume Scraper] Successfully extracted resume intel for candidate: ${parsed.fullName || "Candidate"}`);
        return parsed;
      }
    }

    const errDetail = await response.text();
    console.warn(`[Resume Scraper] Direct file input failed (${response.status}): ${errDetail}. Attempting OpenAI Files API fallback...`);
  } catch (err: any) {
    console.warn(`[Resume Scraper] Direct file request error: ${err.message}. Attempting Files API fallback...`);
  }

  // Fallback: Upload to OpenAI Files API and reference file_id
  try {
    const buffer = Buffer.from(cleanBase64, "base64");
    const fd = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    fd.append("file", blob, fileName);
    fd.append("purpose", "user_data");

    const fileUploadRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: fd,
    });

    if (!fileUploadRes.ok) {
      const fileErr = await fileUploadRes.text();
      throw new Error(`OpenAI Files API upload failed: ${fileErr}`);
    }

    const fileData = await fileUploadRes.json();
    const fileId = fileData.id;
    console.log(`[Resume Scraper] Uploaded file to OpenAI Files API. ID: ${fileId}`);

    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer and resume intelligence engine. Output valid JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: { file_id: fileId },
              },
              {
                type: "text",
                text: RESUME_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!chatResponse.ok) {
      const chatErr = await chatResponse.text();
      throw new Error(`OpenAI Chat Completions with file_id failed: ${chatErr}`);
    }

    const chatData = await chatResponse.json();
    const content = chatData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    console.log(`[Resume Scraper] Successfully extracted resume intel via file_id for: ${parsed.fullName || "Candidate"}`);
    return parsed;
  } catch (fallbackErr: any) {
    console.error(`[Resume Scraper] All extraction methods failed: ${fallbackErr.message}`);
    throw new Error(`Failed to extract resume with ${model}: ${fallbackErr.message}`);
  }
}

async function callGpt4oWithText(rawText: string, model: string, apiKey: string): Promise<ExtractedResume> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert technical interviewer and resume intelligence engine. Output valid JSON only.",
        },
        {
          role: "user",
          content: `${RESUME_EXTRACTION_PROMPT}\n\nCandidate Resume Raw Text:\n${rawText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI extraction failed: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return JSON.parse(content);
}
