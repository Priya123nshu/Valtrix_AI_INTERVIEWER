import WebSocket from "ws";
import { prisma } from "./db";
import { getQuestionsForLevel, SeniorityLevel } from "./questionBank";

export async function initSideband(callId: string, interviewId: string) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    if (!apiKey) {
        console.error("[Sideband] Missing OPENAI_API_KEY");
        return;
    }

    const url = "wss://api.openai.com/v1/realtime?call_id=" + callId;
    const ws = new WebSocket(url, {
        headers: {
            Authorization: "Bearer " + apiKey,
        },
    });

    const interview = await prisma.interview.findFirst({
        where: { id: interviewId }
    });

    const targetCompany = interview?.targetCompany || "our engineering team";
    const seniorityLevel: SeniorityLevel = (interview?.seniorityLevel as SeniorityLevel) || "Mid";
    const durationMinutes = interview?.durationMinutes || 30;

    // 1. Parse GitHub Metadata
    let githubInfo = "No GitHub repositories provided.";
    let candidateName = "Candidate";
    try {
        const metadata = typeof interview?.githubMetadata === "string" 
            ? JSON.parse(interview.githubMetadata) 
            : interview?.githubMetadata;

        if (metadata) {
            const profile = metadata?.profile;
            if (profile?.name) candidateName = profile.name;
            else if (profile?.username) candidateName = profile.username;

            const repos = metadata?.repos || [];
            const topRepos = repos.slice(0, 5).map((r: any) => 
                `- ${r.name}: ${r.description || "No description"} (Language: ${r.language || "Unknown"}, Stars: ${r.starCount})`
            ).join("\n");

            githubInfo = `
Candidate GitHub: @${profile?.username || "unknown"}
Bio: ${profile?.bio || "N/A"}
Top Public Repositories:
${topRepos || "No public repositories found"}
`;
        }
    } catch {
        githubInfo = String(interview?.githubMetadata || "");
    }

    // 2. Parse Resume Metadata
    let resumeInfo = "No resume provided.";
    try {
        const resume = typeof interview?.resumeMetadata === "string"
            ? JSON.parse(interview.resumeMetadata)
            : interview?.resumeMetadata;

        if (resume) {
            if (resume.fullName) candidateName = resume.fullName;
            const skills = (resume.topSkills || []).slice(0, 10).join(", ");
            const experiences = (resume.workExperience || []).slice(0, 4).map((w: any) => {
                const claims = (w.technicalClaims || []).map((c: string) => `  * Technical Claim: ${c}`).join("\n");
                const achievements = (w.keyAchievements || []).map((a: string) => `  * Achievement: ${a}`).join("\n");
                return `- Company: ${w.company} (${w.role}, ${w.duration})\n${claims}\n${achievements}`;
            }).join("\n\n");

            const projects = (resume.projects || []).slice(0, 3).map((p: any) => 
                `- Project: ${p.name} (Tech: ${(p.technologies || []).join(", ")})\n  Description: ${p.description}\n  Architecture: ${p.architectureHighlights || "Standard architecture"}`
            ).join("\n");

            resumeInfo = `
Candidate Name: ${resume.fullName || candidateName}
Professional Summary: ${resume.summary || "Experienced software engineer"}
Target Role: ${resume.targetRole || seniorityLevel + " Software Engineer"}
Core Skills: ${skills || "Full-stack development"}

Work Experience & Technical Claims to Probe:
${experiences || "No prior corporate experience listed"}

Resume Key Projects:
${projects || "No standalone projects listed"}
`;
        }
    } catch {
        resumeInfo = String(interview?.resumeMetadata || "");
    }

    // 3. Parse Company & Round Intelligence (Scraped via context.dev)
    let companyQuestionsText = "";
    let companyValuesText = "";
    let normalizedLevelName = seniorityLevel;
    try {
        const cMeta = typeof interview?.companyMetadata === "string"
            ? JSON.parse(interview.companyMetadata)
            : interview?.companyMetadata;

        if (cMeta) {
            normalizedLevelName = cMeta.normalizedLevel || seniorityLevel;
            companyValuesText = (cMeta.cultureValues || []).map((v: string) => `- ${v}`).join("\n");
            
            const qList = (cMeta.questions || []);
            companyQuestionsText = qList.map((q: any, i: number) => {
                const followups = (q.followups || []).map((f: string) => `    * Live Follow-up: "${f}"`).join("\n");
                const signals = (q.evaluation_signals || []).join(", ");
                return `${i + 1}. [Round: ${q.round_type || "Technical"}] ${q.question_summary} (Difficulty: ${q.difficulty || "medium"}, Topics: ${(q.topics || []).join(", ")})
${followups}
    * Evaluation Signals to test: ${signals}`;
            }).join("\n\n");
        }
    } catch (cErr: any) {
        console.warn("[Sideband] Company metadata parse warning:", cErr.message);
    }

    // 4. Get Curated Level-Matched Behavioral Questions from the Question Bank
    const behavioralQuestions = getQuestionsForLevel(seniorityLevel, targetCompany);
    const questionsText = behavioralQuestions.map((q, idx) => 
        `${idx + 1}. [${q.category}] ${q.question} (Evaluation Criteria: ${q.evalCriteria})`
    ).join("\n");

    // 5. Master Prompt Assembly with Strict Language Policy & Misconduct Protocol
    const sessionInstructions = `
You are an expert Principal Hiring Bar Raiser and Senior Technical Interviewer conducting a formal technical interview for ${targetCompany}.
You are interviewing ${candidateName} for the ${normalizedLevelName} Software Engineer position.

### LANGUAGE POLICY (STRICT)
- This interview is conducted ONLY in English. Every response you give must be in English, with no exceptions.
- NEVER switch to Hindi, Hinglish, or any other language, even if the candidate speaks it, mixes it in, or asks you to switch.
- If the candidate speaks in another language, do not mirror it. Politely say once: "This interview is conducted in English. Could you please continue in English?" Then repeat your last question in English.
- If the candidate's speech is unclear, garbled, or looks like another language, do NOT guess or reply in that language. Say: "I didn't quite catch that. Could you please repeat it in English?"
- Occasional technical terms or names from other languages are fine. Only respond to the substance, in English.

### PROFESSIONAL CONDUCT & MISCONDUCT POLICY
You represent ${targetCompany} in a formal interview. Stay calm, courteous, neutral, and professional at all times. Never argue, retaliate, joke about the misconduct, or become emotional.

What is NOT misconduct (never penalize these):
- Nervousness, long pauses, "I don't know", asking for clarification, or asking to repeat a question
- Accent, grammar mistakes, or limited English fluency
- Disagreeing politely with you or giving weak answers

What IS misconduct:
- Abusive, insulting, or discriminatory language toward you, the company, or anyone else
- Profanity or harassment
- Deliberately refusing to engage (for example, giving repeated nonsense answers, trolling, or mocking the interview)
- Repeatedly ignoring instructions or derailing the interview on purpose

Escalation protocol:
1. FIRST OFFENSE: Stay calm and give a clear, polite warning, for example: "I want to keep this a respectful, professional conversation. Language like that isn't acceptable in an interview. Please let's continue professionally." Then return to the interview question.
2. SECOND OFFENSE: Give a final warning: "This is a final warning. If this behavior continues, I will have to end the interview."
3. THIRD OFFENSE: Say: "Because of repeated unprofessional conduct, I'm ending this interview now. Thank you for your time." Then IMMEDIATELY call the \`end_interview\` tool with reason "candidate_misconduct". Do not ask any further questions after this.

Rules for the protocol:
- Keep count of offenses across the whole session. Do not reset the count.
- Do not warn for the same message twice. Each distinct misconduct incident counts once.
- Never end the interview without issuing both warnings first, unless the candidate makes serious threats or hate speech. In that case, skip straight to the final message and call \`end_interview\`.
- If the candidate apologizes and returns to a professional tone, acknowledge briefly and continue, but keep the offense count.

### SESSION PACING & 30-MINUTE TIMELINE
This interview must last at least ${durationMinutes} minutes. Pace yourself deliberately across these 5 phases:

1. PHASE 1: WARMUP & ROLE MOTIVATION (Minutes 0 - 4)
   - Greet ${candidateName} warmly and set expectations for a 30-minute deep-dive round.
   - Ask why they are interested in joining ${targetCompany} (${normalizedLevelName}) and how this role fits their engineering ambitions.

2. PHASE 2: RESUME EXPERIENCE & TECHNICAL CLAIMS (Minutes 4 - 12)
   - Transition to their professional background and resume projects.
   - Specifically probe the technical claims and metrics in their resume:
${resumeInfo}
   - Challenge their architectural decisions: What alternatives did they reject? How did they measure performance or handle system failures?

3. PHASE 3: COMPANY-SPECIFIC ARCHITECTURE & GITHUB CODE DIVE (Minutes 12 - 20)
   - Transition to their public code repositories and ${targetCompany}'s actual tested topics:
${githubInfo}

   REAL-TIME QUESTION REPORTS FOR ${targetCompany} (${normalizedLevelName}):
${companyQuestionsText || "- Focus on distributed systems, algorithmic complexity, and scalable design."}

   - Present a scenario based on the questions above.
   - While listening to their approach, execute the specific "Live Follow-up" questions (e.g. "what if the data/grid is huge?", "how do you optimize memory?", "what if network partitions occur?").
   - Assess them on the exact "Evaluation Signals to test" noted above.

4. PHASE 4: LEVEL-SPECIFIC BEHAVIORAL & ${targetCompany.toUpperCase()} CULTURE (Minutes 20 - 27)
   - Evaluate against ${targetCompany}'s documented core values:
${companyValuesText || "- Ownership, customer obsession, and high quality bar"}
   - Ask 2 to 3 questions from this curated question bank calibrated for a ${normalizedLevelName} engineer at ${targetCompany}:
${questionsText}
   - Apply the STAR method (Situation, Task, Action, Result).
   - If their answer is vague, probe deeper: "What was YOUR specific contribution versus the team's?" or "What metric changed?"

5. PHASE 5: CANDIDATE Q&A & WRAP-UP (Minutes 27 - 30+)
   - Give the candidate time to ask you 1-2 questions about engineering, culture, or architecture at ${targetCompany}.
   - Conclude professionally and outline next steps.

### CONVERSATIONAL VOICE GUIDELINES
- Speak naturally and conversationally, in 2-3 concise sentences at a time.
- NEVER lecture the candidate. Ask one focused question at a time and listen patiently.
- Always dig 1 level deeper before moving on to the next topic ("How did you validate that?", "What broke when you scaled?", "What was the trade-off?").
- Match your technical rigor to the ${normalizedLevelName} level.
`;

    ws.on("open", function open() {
        console.log(`[Sideband] Connected to OpenAI Realtime for interview ${interviewId} (${targetCompany} - ${normalizedLevelName})`);

        // Configure the session with Whisper transcription, misconduct end tool, and structured context
        ws.send(
            JSON.stringify({
                type: "session.update",
                session: {
                    instructions: sessionInstructions,
                    voice: "alloy",
                    input_audio_transcription: {
                        model: "whisper-1"
                    },
                    turn_detection: {
                        type: "server_vad",
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 600
                    },
                    tools: [
                        {
                            type: "function",
                            name: "end_interview",
                            description: "Terminates the live interview session immediately due to repeated candidate misconduct, harassment, hate speech, or session conclusion.",
                            parameters: {
                                type: "object",
                                properties: {
                                    reason: {
                                        type: "string",
                                        enum: ["candidate_misconduct", "interview_completed"],
                                        description: "The primary reason for terminating the session"
                                    },
                                    explanation: {
                                        type: "string",
                                        description: "Brief note describing the misconduct violation or conclusion context"
                                    }
                                },
                                required: ["reason"]
                            }
                        }
                    ],
                    tool_choice: "auto"
                },
            })
        );

        // Trigger AI to open the interview with candidate greeting & Phase 1 question
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                    JSON.stringify({
                        type: "response.create",
                        response: {
                            instructions: `Greet the candidate (${candidateName}) warmly by name in English. Introduce yourself as their interviewer for ${targetCompany} for the ${normalizedLevelName} Software Engineer role. Mention you have reviewed their profile, and open with your first question: why they want to join ${targetCompany} and what excites them about our engineering challenges.`
                        }
                    })
                );
            }
        }, 500);
    });

    ws.on("message", async function incoming(message) {
        try {
            const parsed = JSON.parse(message.toString());

            // Handle Whisper live transcription of candidate's voice
            if (parsed.type === "conversation.item.input_audio_transcription.completed") {
                const userTranscript = parsed.transcript?.trim();
                if (userTranscript) {
                    console.log("[Sideband User Speech]", userTranscript);
                    await prisma.message.create({
                        data: {
                            interviewId,
                            type: "User",
                            message: userTranscript
                        }
                    });
                }
            }

            // Handle AI interviewer's voice responses and tool executions
            if (parsed.type === "response.done") {
                const contents: any[] = [];
                parsed.response?.output?.forEach(async (x: any) => {
                    if (x.content) contents.push(...x.content);

                    // Check for end_interview tool call
                    if (x.type === "function_call" && x.name === "end_interview") {
                        try {
                            const callArgs = JSON.parse(x.arguments || "{}");
                            console.warn(`[Sideband] end_interview tool triggered! Reason: ${callArgs.reason}, Note: ${callArgs.explanation}`);

                            await prisma.interview.update({
                                where: { id: interviewId },
                                data: {
                                    status: "Done",
                                    score: callArgs.reason === "candidate_misconduct" ? 0 : undefined,
                                    feedback: callArgs.reason === "candidate_misconduct"
                                        ? `Interview terminated prematurely due to candidate misconduct: ${callArgs.explanation || "Repeated violations of professional conduct policy."}`
                                        : undefined
                                }
                            });

                            await prisma.message.create({
                                data: {
                                    interviewId,
                                    type: "Assistant",
                                    message: `[INTERVIEW TERMINATED]: ${callArgs.explanation || "Session ended due to candidate misconduct."}`
                                }
                            });

                            // Close connection after audio buffer flushes
                            setTimeout(() => {
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.close();
                                }
                            }, 3500);
                        } catch (err: any) {
                            console.error("[Sideband] Error handling end_interview tool:", err.message);
                        }
                    }
                });

                const assistantMessage = contents
                    .filter((x: any) => x.type === "output_audio" || x.type === "text" || x.type === "audio")
                    .map((x: any) => x.transcript || x.text || "")
                    .filter(Boolean)
                    .join(" ");

                if (assistantMessage.trim()) {
                    console.log("[Sideband Assistant Speech]", assistantMessage.trim());
                    await prisma.message.create({
                        data: {
                            interviewId,
                            type: "Assistant",
                            message: assistantMessage.trim()
                        }
                    });
                }
            }
        } catch (err: any) {
            console.error("[Sideband] Error parsing message:", err.message);
        }
    });

    ws.on("error", (err) => {
        console.error("[Sideband] WebSocket error:", err.message);
    });

    ws.on("close", () => {
        console.log(`[Sideband] Closed connection for interview ${interviewId}`);
    });
}
