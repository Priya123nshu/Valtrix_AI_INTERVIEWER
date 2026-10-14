import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Bot, Loader2, Sparkles, User } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ResultData {
    transcript: { type: "Assistant" | "User"; content: string; createdAt: string }[];
    score: number;
    feedback: string;
    status: "Done" | "InProgress" | "Pre";
    targetCompany?: string;
    seniorityLevel?: string;
}

export function Result() {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState<ResultData>({
        score: 0,
        feedback: "",
        transcript: [],
        status: "Pre",
        targetCompany: "Tech Company",
        seniorityLevel: "Mid",
    });

    useEffect(() => {
        let isCancelled = false;
        let intervalId: any;

        const fetchResult = async () => {
            try {
                const response = await axios.get(`${BACKEND_URL}/api/v1/result/${interviewId}`);
                if (!isCancelled) {
                    setResult(response.data);
                    if (response.data.status === "Done" && intervalId) {
                        clearInterval(intervalId);
                    }
                }
            } catch (err: any) {
                console.error("Failed to fetch result:", err);
                if (intervalId) clearInterval(intervalId);
            }
        };

        fetchResult();
        intervalId = setInterval(fetchResult, 4000);

        return () => {
            isCancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [interviewId]);


    const ready = result.status === "Done";

    const getScoreTier = (score: number) => {
        if (score >= 8) return { label: "Strong Candidate", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" };
        if (score >= 6) return { label: "Qualified Candidate", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" };
        return { label: "Requires Review", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30" };
    };

    const tier = getScoreTier(result.score);

    return (
        <main className="mx-auto min-h-[calc(100vh-80px)] w-full max-w-4xl px-4 sm:px-6 py-10 pb-20">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 font-semibold">
                            Diagnostic Assessment Report
                        </span>
                        {result.targetCompany && (
                            <span className="text-[11px] font-mono font-semibold text-foreground px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                {result.targetCompany}
                            </span>
                        )}
                        {result.seniorityLevel && (
                            <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                                {result.seniorityLevel} Level
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Technical Evaluation & Scorecard
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                        Objective code intellect, architectural depth & behavioral analysis for {result.targetCompany || "the target company"}.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button 
                        onClick={() => navigate("/")}
                        className="h-9 px-4 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-sm cursor-pointer"
                    >
                        Assess New Candidate
                    </Button>
                </div>
            </div>

            {!ready ? (
                <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 py-28 text-center backdrop-blur-xl shadow-lg">
                    <div className="relative">
                        <Loader2 className="size-12 animate-spin text-amber-500" />
                        <div className="absolute inset-0 size-12 bg-amber-500/20 blur-xl rounded-full" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            Synthesizing Evaluation Scorecard...
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground font-mono">
                            Whisper STT transcript compiled. Generating rubrics & qualitative feedback.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* Score + Feedback Card */}
                    <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-md space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-zinc-200/60 dark:border-zinc-800/60">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-500">
                                    <Sparkles className="size-4" />
                                    <span>Composite Performance Rating</span>
                                </div>
                                <h2 className="text-xl font-bold text-foreground">
                                    Candidate Assessment Verdict
                                </h2>
                                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-mono font-bold border ${tier.bg} ${tier.color}`}>
                                    {tier.label}
                                </span>
                            </div>

                            {/* Prominent Score Gauge */}
                            <div className="flex items-baseline gap-1.5 p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-500">
                                    {result.score}
                                </span>
                                <span className="text-base font-mono text-muted-foreground font-semibold">
                                    / 10
                                </span>
                            </div>
                        </div>

                        {/* Qualitative Feedback */}
                        <div className="space-y-2">
                            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                                Qualitative Breakdown
                            </span>
                            <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-5 sm:p-6 text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
                                {result.feedback || "Evaluation complete. Feedback summary generated by the Valtrix assessment engine."}
                            </div>
                        </div>
                    </div>

                    {/* Transcript Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-muted-foreground">
                                Recorded Dialogue Audit ({result.transcript.length} turns)
                            </h3>
                            <span className="text-[11px] font-mono text-zinc-500">
                                Valtrix Realtime STT
                            </span>
                        </div>

                        <div className="space-y-3">
                            {result.transcript.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center text-xs text-muted-foreground font-mono">
                                    No transcript turns were logged for this session.
                                </div>
                            )}
                            {result.transcript.map((m, i) => {
                                const isAi = m.type === "Assistant";
                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex gap-3 text-xs leading-relaxed",
                                            isAi ? "justify-start" : "flex-row-reverse"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "size-8 shrink-0 grid place-items-center rounded-xl font-bold shadow-xs",
                                                isAi
                                                    ? "bg-amber-400 text-zinc-950"
                                                    : "bg-emerald-400 text-zinc-950"
                                            )}
                                        >
                                            {isAi ? <Bot className="size-4" /> : <User className="size-4" />}
                                        </div>
                                        <div
                                            className={cn(
                                                "max-w-[80%] rounded-2xl p-4 shadow-xs",
                                                isAi
                                                    ? "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-foreground"
                                                    : "bg-amber-400 text-zinc-950 font-medium"
                                            )}
                                        >
                                            <p className="font-mono text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                                                {isAi ? "Valtrix AI Technical Interviewer" : "Candidate Response"}
                                            </p>
                                            <p className="text-xs sm:text-sm leading-relaxed">
                                                {m.content || (m as any).message}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
