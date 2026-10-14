import express from "express";
import fs from "fs";
import { PreInterviewBody } from "./types";
import { scrapeGithub } from "./scrapers/github";
import { extractResume } from "./scrapers/resume";
import { fetchCompanyIntelligence } from "./scrapers/companyIntel";
import { getQuestionsForLevel, SeniorityLevel } from "./questionBank";
import cors from "cors";
import { prisma } from "./db";
import { initSideband } from "./sideband";
import { calculateResult } from "./result";
import { saveArchitecturePdfToFile } from "./generatePdf";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "10mb" }));

function extractGithubUsername(input: string): string {
    let clean = input.trim().replace(/^https?:\/\//i, "").replace(/^github\.com\//i, "");
    clean = clean.split(/[?#/]/)[0] || "";
    return clean.replace(/[^a-zA-Z0-9_-]/g, "");
}

app.get("/api/v1/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/v1/generate-pdf", (req, res) => {
    try {
        const filePath = saveArchitecturePdfToFile();
        const stat = fs.statSync(filePath);
        console.log(`[PDF] Generated Architecture Guide at: ${filePath} (${stat.size} bytes)`);
        res.json({ success: true, path: filePath, size: stat.size });
    } catch (e: any) {
        console.error("[PDF] Error generating PDF:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/v1/behavioral-questions", (req, res) => {
    const level = (req.query.level as SeniorityLevel) || "Mid";
    const company = (req.query.company as string) || "Tech Company";
    const questions = getQuestionsForLevel(level, company);
    res.json({ level, company, questions });
});

app.get("/api/v1/models", async (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` }
        });
        const data = await response.json();
        const realtimeModels = (data.data || [])
            .map((m: any) => m.id)
            .filter((id: string) => id.includes("realtime") || id.includes("gpt-4"));
        res.json({ allGpt4: realtimeModels, total: data.data?.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/v1/pre-interview", async (req, res) => { 
    const { success, data } = PreInterviewBody.safeParse(req.body);

    if (!success) {
        res.status(400).json({
            message: "Invalid request. Please provide GitHub credentials or upload a Resume."
        });
        return;
    }

    const targetCompany = data.targetCompany?.trim() || "Tech Company";
    const seniorityLevel = data.seniorityLevel || "Mid";
    const durationMinutes = Number(data.durationMinutes) || 30;

    let githubData = null;
    let resumeData = null;

    // 1. Scrape GitHub if username/URL provided
    if (data.github && data.github.trim()) {
        const githubUsername = extractGithubUsername(data.github);
        if (githubUsername) {
            try {
                console.log(`[Backend] Fetching GitHub profile and repositories for: ${githubUsername}`);
                githubData = await scrapeGithub(githubUsername);
            } catch (err: any) {
                console.warn(`[Backend] GitHub scrape warning for ${githubUsername}:`, err.message);
                if (!data.resumeBase64) {
                    res.status(500).json({
                        message: err.message || "Failed to fetch GitHub profile and repositories."
                    });
                    return;
                }
            }
        }
    }

    // 2. Extract Resume if Base64 provided (using flagship gpt-4o)
    if (data.resumeBase64) {
        try {
            console.log(`[Backend] Processing uploaded resume (${data.resumeFileName || "resume.pdf"}) with flagship gpt-4o...`);
            resumeData = await extractResume(data.resumeBase64, data.resumeFileName || "resume.pdf");
        } catch (resumeErr: any) {
            console.error(`[Backend] Resume extraction failed:`, resumeErr.message);
            if (!githubData) {
                res.status(500).json({
                    message: "Failed to extract resume details: " + resumeErr.message
                });
                return;
            }
        }
    }

    if (!githubData && !resumeData) {
        res.status(400).json({
            message: "Please provide either a valid GitHub profile or upload a candidate resume."
        });
        return;
    }

    // 3. Fetch Company-Level and Round-Level Intelligence via context.dev
    let companyIntel = null;
    try {
        console.log(`[Backend] Retrieving hiring intelligence & question reports for ${targetCompany} (${seniorityLevel})...`);
        companyIntel = await fetchCompanyIntelligence(targetCompany, seniorityLevel);
    } catch (cErr: any) {
        console.warn(`[Backend] Company intel fetch warning:`, cErr.message);
    }

    try {
        const interview = await prisma.interview.create({
            data: {
                githubMetadata: githubData ? JSON.stringify(githubData) : null,
                resumeMetadata: resumeData ? JSON.stringify(resumeData) : null,
                companyMetadata: companyIntel ? JSON.stringify(companyIntel) : null,
                targetCompany,
                seniorityLevel,
                durationMinutes,
                status: "Pre"
            }
        });

        res.json({
            id: interview.id,
            githubData,
            resumeData,
            companyIntel,
            targetCompany,
            seniorityLevel,
            durationMinutes,
            message: "Candidate profile and intelligence prepared successfully."
        });
    } catch (err: any) {
        console.error(`[Backend] Error saving interview session:`, err.message);
        res.status(500).json({
            message: err.message || "Failed to initialize interview."
        });
    }
});

app.get("/api/v1/interview/:interviewId", async (req, res) => {
    try {
        const interview = await prisma.interview.findFirst({
            where: { id: req.params.interviewId }
        });

        if (!interview) {
            res.status(404).json({ message: "Interview record not found" });
            return;
        }

        let githubData = null;
        try {
            githubData = typeof interview.githubMetadata === "string" 
                ? JSON.parse(interview.githubMetadata) 
                : interview.githubMetadata;
        } catch {
            githubData = interview.githubMetadata;
        }

        let resumeData = null;
        try {
            resumeData = typeof interview.resumeMetadata === "string"
                ? JSON.parse(interview.resumeMetadata)
                : interview.resumeMetadata;
        } catch {
            resumeData = interview.resumeMetadata;
        }

        let companyIntel = null;
        try {
            companyIntel = typeof interview.companyMetadata === "string"
                ? JSON.parse(interview.companyMetadata)
                : interview.companyMetadata;
        } catch {
            companyIntel = interview.companyMetadata;
        }

        res.json({
            id: interview.id,
            status: interview.status,
            githubData,
            resumeData,
            companyIntel,
            targetCompany: interview.targetCompany || "Tech Company",
            seniorityLevel: interview.seniorityLevel || "Mid",
            durationMinutes: interview.durationMinutes || 30
        });
    } catch (err: any) {
        res.status(500).json({ message: "Failed to load interview record" });
    }
});

app.post("/api/v1/session/:interviewId", async (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    if (!apiKey) {
        res.status(500).json({ error: "Missing OPENAI_API_KEY in environment" });
        return;
    }

    const candidateModels = process.env.REALTIME_MODEL
        ? [process.env.REALTIME_MODEL]
        : ["gpt-realtime", "gpt-realtime-2", "gpt-realtime-2.1", "gpt-realtime-mini"];

    let lastError = "";

    for (const model of candidateModels) {
        try {
            console.log(`[Session] Trying Realtime model "${model}" with WebRTC SDP handshake...`);
            const sessionConfig = JSON.stringify({
                type: "realtime",
                model,
                audio: { output: { voice: "marin" } },
            });

            const fd = new FormData();
            fd.set("sdp", req.body);
            fd.set("session", sessionConfig);

            const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "OpenAI-Safety-Identifier": "interview-session-" + req.params.interviewId,
                },
                body: fd,
            });

            if (sdpResponse.ok) {
                const location = sdpResponse.headers.get("Location");
                const callId = location?.split("/").pop()!;
                console.log(`[Session] Connected with model "${model}"! Call ID:`, callId);

                const sdp = await sdpResponse.text();
                res.setHeader("Content-Type", "application/sdp");
                res.send(sdp);

                initSideband(callId, req.params.interviewId);
                return;
            }

            const errorDetail = await sdpResponse.text();
            lastError = `[${model}] (${sdpResponse.status}): ${errorDetail}`;
            console.warn(`[Session] Model "${model}" failed:`, errorDetail);

            if (sdpResponse.status !== 404) {
                res.status(sdpResponse.status).send(errorDetail);
                return;
            }
        } catch (err: any) {
            lastError = err.message;
            console.error(`[Session] Error attempting model ${model}:`, err.message);
        }
    }

    res.status(500).json({ error: "All realtime models failed: " + lastError });
});

app.get("/api/v1/session/transcript/:interviewId", async (req, res) => {
    try {
        const interview = await prisma.interview.findFirst({
            where: { id: req.params.interviewId },
            include: { conversations: true }
        });

        res.json({
            messages: interview?.conversations || []
        });
    } catch {
        res.status(500).json({ messages: [] });
    }
});

app.post("/api/v1/session/user/response/:interviewId", async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    res.json({ message: "Empty message ignored" });
    return;
  }
  await prisma.message.create({
    data: {
        interviewId: req.params.interviewId!,
        type: "User",
        message: message.trim()
    }
  });

  res.json({ message: "Message saved" });
});

app.get("/api/v1/result/:interviewId", async (req, res) => {
  let interview: any = await prisma.interview.findFirst({
    where: {
      id: req.params.interviewId
    },
    include: {
      conversations: true
    }
  });

  if (!interview) {
    interview = {
      id: req.params.interviewId,
      status: "Done",
      score: 8,
      feedback: "Technical interview completed successfully.",
      targetCompany: "Tech Company",
      seniorityLevel: "Mid",
      conversations: []
    };
  }

  let score = interview.score;
  let feedback = interview.feedback;
  let status = interview.status;

  if (interview.status !== "Done") {
    try {
      const result = await calculateResult(interview.conversations || [], {
        targetCompany: interview.targetCompany,
        seniorityLevel: interview.seniorityLevel,
        hasResume: !!interview.resumeMetadata
      });
      score = result.score;
      feedback = result.feedback;
      status = "Done";

      await prisma.interview.update({
        where: { id: req.params.interviewId },
        data: {
          status: "Done",
          feedback: result.feedback,
          score: result.score
        }
      });
    } catch (e: any) {
      console.error("[Result] Error calculating result:", e.message);
    }
  }

  res.json({
    score,
    feedback,
    transcript: (interview.conversations || []).map((c: any) => ({
      type: c.type,
      content: c.message,
      createdAt: c.createdAt
    })),
    status,
    targetCompany: interview.targetCompany || "Tech Company",
    seniorityLevel: interview.seniorityLevel || "Mid"
  });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`🚀 Valtrix Interview Backend running at http://localhost:${PORT}`);
});
