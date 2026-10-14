import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { 
    ArrowLeft, 
    BookOpen, 
    Bot, 
    Building2, 
    Calendar, 
    ExternalLink, 
    GitFork, 
    Github, 
    Globe, 
    Loader2, 
    MapPin, 
    Mic, 
    MicOff, 
    PhoneOff, 
    Radio, 
    Search, 
    Sparkles, 
    Star, 
    User, 
    Users, 
    Volume2,
    FileText,
    CheckCircle2,
    Award,
    Briefcase,
    GraduationCap,
    Clock,
    AlertCircle,
    UserCheck,
    Layers,
    ShieldCheck,
    Compass,
    Zap,
    Flame
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { VoiceOrb } from "./VoiceOrb";
import { toast } from "sonner";

interface GitHubUserProfile {
    username: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    blog: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    profileUrl: string;
}

interface GitHubRepo {
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    starCount: number;
    forkCount: number;
    topics: string[];
    url: string;
    updatedAt: string;
    isFork: boolean;
}

interface GitHubData {
    profile: GitHubUserProfile;
    repos: GitHubRepo[];
    topLanguages: { language: string; count: number }[];
    totalStars: number;
}

interface ExtractedResume {
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

interface ScrapedQuestionItem {
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

interface CompanyIntelPackage {
    companyName: string;
    normalizedLevel: string;
    archetype: "Product" | "Fintech" | "ITServices" | "CloudSaaS";
    cultureValues: string[];
    techStack: string[];
    interviewRoundsOverview: string[];
    questions: ScrapedQuestionItem[];
}

interface TranscriptMessage {
    type: "Assistant" | "User";
    content?: string;
    message?: string;
    createdAt?: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-yellow-400",
    Python: "bg-emerald-500",
    Go: "bg-cyan-500",
    Rust: "bg-orange-500",
    Java: "bg-amber-600",
    "C++": "bg-pink-500",
    C: "bg-gray-400",
    HTML: "bg-red-500",
    CSS: "bg-indigo-500",
    PHP: "bg-purple-500",
    Ruby: "bg-rose-500",
    Swift: "bg-orange-600",
    Kotlin: "bg-violet-500",
};

/** Measures audio volume level (0..1) from a Web Audio stream */
function createLevelMeter(ctx: AudioContext, stream: MediaStream) {
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    return () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const v = (data[i]! - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        return Math.min(1, rms * 3.5);
    };
}

export function Interview() {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Data states
    const [githubData, setGithubData] = useState<GitHubData | null>(
        location.state?.githubData || null
    );
    const [resumeData, setResumeData] = useState<ExtractedResume | null>(
        location.state?.resumeData || null
    );
    const [companyIntel, setCompanyIntel] = useState<CompanyIntelPackage | null>(
        location.state?.companyIntel || null
    );
    const [targetCompany, setTargetCompany] = useState<string>(
        location.state?.targetCompany || "Tech Company"
    );
    const [seniorityLevel, setSeniorityLevel] = useState<string>(
        location.state?.seniorityLevel || "Mid"
    );
    const [durationMinutes, setDurationMinutes] = useState<number>(30);

    const [loading, setLoading] = useState(!githubData && !resumeData);
    const [error, setError] = useState<string | null>(null);

    // View state: "briefing" (looking at repos/resume) vs "live" (in the voice room)
    const [viewMode, setViewMode] = useState<"briefing" | "live">("briefing");

    // Voice session states
    const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "live" | "ending">("idle");
    const [aiLevel, setAiLevel] = useState(0);
    const [userLevel, setUserLevel] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [liveMessages, setLiveMessages] = useState<TranscriptMessage[]>([]);

    // Search and filter for repository explorer
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

    // WebRTC & Audio refs
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const userStreamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const speechRecRef = useRef<any>(null);

    // Fetch interview data if not passed in route state
    useEffect(() => {
        if ((!githubData && !resumeData) && interviewId) {
            setLoading(true);
            axios
                .get(`${BACKEND_URL}/api/v1/interview/${interviewId}`)
                .then((res) => {
                    setGithubData(res.data.githubData);
                    setResumeData(res.data.resumeData);
                    setCompanyIntel(res.data.companyIntel || null);
                    setTargetCompany(res.data.targetCompany || "Tech Company");
                    setSeniorityLevel(res.data.seniorityLevel || "Mid");
                    setDurationMinutes(res.data.durationMinutes || 30);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err.response?.data?.message || "Failed to load candidate interview data.");
                    setLoading(false);
                });
        }
    }, [interviewId, githubData, resumeData]);

    // Timer during live interview
    useEffect(() => {
        let timer: any;
        if (voiceStatus === "live") {
            timer = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [voiceStatus]);

    // Poll live transcript from backend every 2.5s while live
    useEffect(() => {
        let interval: any;
        if (voiceStatus === "live" && interviewId) {
            const fetchTranscript = () => {
                axios
                    .get(`${BACKEND_URL}/api/v1/session/transcript/${interviewId}`)
                    .then((res) => {
                        if (Array.isArray(res.data?.messages)) {
                            setLiveMessages(res.data.messages);
                        }
                    })
                    .catch(() => {});
            };

            fetchTranscript();
            interval = setInterval(fetchTranscript, 2500);
        }
        return () => clearInterval(interval);
    }, [voiceStatus, interviewId]);

    // Start Live WebRTC Voice Interview
    async function startVoiceInterview() {
        setViewMode("live");
        setVoiceStatus("connecting");
        setElapsedSeconds(0);

        try {
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;

            let aiMeter: (() => number) | null = null;
            let userMeter: (() => number) | null = null;

            // 1. Play incoming audio from OpenAI Realtime
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            pc.ontrack = (e) => {
                const stream = e.streams[0]!;
                audioEl.srcObject = stream;
                aiMeter = createLevelMeter(audioCtx, stream);
            };

            // 2. Capture local user microphone
            const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            userStreamRef.current = ms;
            userMeter = createLevelMeter(audioCtx, ms);
            pc.addTrack(ms.getTracks()[0]!);

            // Web Speech API for candidate transcription backup
            try {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const sr = new SpeechRecognition();
                    sr.continuous = true;
                    sr.interimResults = false;
                    sr.lang = "en-US";
                    sr.onresult = (ev: any) => {
                        const transcript = ev.results[ev.results.length - 1][0].transcript;
                        if (transcript && transcript.trim()) {
                            axios.post(`${BACKEND_URL}/api/v1/session/user/response/${interviewId}`, {
                                message: transcript.trim(),
                            }).catch(() => {});
                        }
                    };
                    sr.start();
                    speechRecRef.current = sr;
                }
            } catch (srErr) {
                console.log("Web Speech API not available, relying on OpenAI Whisper STT.");
            }

            // 3. WebRTC SDP Offer Handshake with Backend
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const res = await fetch(`${BACKEND_URL}/api/v1/session/${interviewId}`, {
                method: "POST",
                headers: { "Content-Type": "application/sdp" },
                body: offer.sdp,
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Realtime session failed: ${errText}`);
            }

            const answerSdp = await res.text();
            await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

            setVoiceStatus("live");
            toast.success("Voice round connected! Interviewer will speak momentarily.");

            // 4. Animation loop for audio visualizer orbs
            function updateMeters() {
                if (aiMeter) setAiLevel(aiMeter());
                if (userMeter) setUserLevel(userMeter());
                rafRef.current = requestAnimationFrame(updateMeters);
            }
            updateMeters();
        } catch (err: any) {
            console.error("Voice interview connection error:", err);
            toast.error(err.message || "Failed to establish WebRTC connection.");
            setVoiceStatus("idle");
            setViewMode("briefing");
        }
    }

    // Toggle Microphone Mute
    function toggleMute() {
        if (userStreamRef.current) {
            userStreamRef.current.getAudioTracks().forEach((t) => {
                t.enabled = isMuted;
            });
            setIsMuted(!isMuted);
            toast.info(isMuted ? "Microphone active" : "Microphone muted");
        }
    }

    // End Live Interview & Navigate to Result
    function endInterview(force = false) {
        if (!force && elapsedSeconds < 1800) {
            const minutesDone = Math.floor(elapsedSeconds / 60);
            if (!confirm(`You have completed ${minutesDone} minutes of this 30-minute interview. Are you sure you want to conclude now?`)) {
                return;
            }
        }

        setVoiceStatus("ending");
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (speechRecRef.current) {
            try { speechRecRef.current.stop(); } catch {}
        }
        if (userStreamRef.current) {
            userStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }

        toast.info("Concluding round and compiling executive evaluation...");
        navigate(`/result/${interviewId}`);
    }

    // Helper: format seconds to MM:SS
    function formatTimer(sec: number) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    // 30-Minute Pacing Phase Calculation
    const targetSeconds = (durationMinutes || 30) * 60;
    const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
    const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

    const currentPhase = useMemo(() => {
        if (elapsedSeconds < 240) {
            return {
                number: 1,
                name: "Warmup & Role Motivation",
                detail: `Greeting, candidate background, and why ${targetCompany}`,
                timeRange: "0:00 - 4:00"
            };
        } else if (elapsedSeconds < 720) {
            return {
                number: 2,
                name: "Resume & Architecture Deep Dive",
                detail: "Challenging production claims, metrics & system scale",
                timeRange: "4:00 - 12:00"
            };
        } else if (elapsedSeconds < 1200) {
            return {
                number: 3,
                name: "GitHub Code & Systems Verification",
                detail: "Real code patterns, concurrency, algorithms & dependencies",
                timeRange: "12:00 - 20:00"
            };
        } else if (elapsedSeconds < 1620) {
            return {
                number: 4,
                name: "Behavioral & Engineering Leadership",
                detail: `STAR methodology calibrated for ${seniorityLevel} level`,
                timeRange: "20:00 - 27:00"
            };
        } else {
            return {
                number: 5,
                name: "Candidate Q&A & Interview Wrap-Up",
                detail: `Candidate questions about ${targetCompany} and closing`,
                timeRange: "27:00 - 30:00+"
            };
        }
    }, [elapsedSeconds, targetCompany, seniorityLevel]);

    // Filter Repositories by search & language
    const filteredRepos = useMemo(() => {
        if (!githubData?.repos) return [];
        return githubData.repos.filter((repo) => {
            const matchesSearch =
                repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesLang =
                selectedLanguage === "All" || repo.language === selectedLanguage;
            return matchesSearch && matchesLang;
        });
    }, [githubData, searchQuery, selectedLanguage]);

    if (loading) {
        return (
            <main className="flex min-h-screen w-screen flex-col items-center justify-center bg-background px-6 text-center">
                <Loader2 className="size-10 animate-spin text-amber-500" />
                <h2 className="mt-4 text-xl font-bold">Synchronizing Candidate Intelligence...</h2>
                <p className="mt-2 text-sm text-muted-foreground font-mono">
                    Digesting resume metrics, GitHub repositories & calibrating questions for {targetCompany}
                </p>
            </main>
        );
    }

    if (error || (!githubData && !resumeData)) {
        return (
            <main className="flex min-h-screen w-screen flex-col items-center justify-center bg-background px-6 text-center">
                <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                    <AlertCircle className="size-8" />
                </div>
                <h2 className="mt-4 text-xl font-bold">Could not load candidate briefing</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {error || "No candidate data found for this interview ID."}
                </p>
                <Button onClick={() => navigate("/")} className="mt-6 gap-2">
                    <ArrowLeft className="size-4" />
                    Back to Setup
                </Button>
            </main>
        );
    }

    const candidateDisplayName = resumeData?.fullName || githubData?.profile.name || githubData?.profile.username || "Candidate";
    const aiSpeaking = aiLevel > 0.05 && aiLevel >= userLevel;
    const userSpeaking = userLevel > 0.05 && userLevel > aiLevel;

    return (
        <main className="min-h-screen w-full pb-20">
            {/* Session Sub-header / Status Bar */}
            <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-18 z-30">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (voiceStatus === "live") {
                                    endInterview(false);
                                } else {
                                    navigate("/");
                                }
                            }}
                            className="h-8 gap-1.5 text-xs font-medium border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <ArrowLeft className="size-3.5" />
                            {voiceStatus === "live" ? "Conclude Session" : "New Setup"}
                        </Button>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        
                        {/* Target Company & Level Badges */}
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-500">
                                <Building2 className="size-3" />
                                {targetCompany}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                                <UserCheck className="size-3" />
                                {seniorityLevel} Level
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {voiceStatus === "live" ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-2.5 py-1">
                                    <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                                    <span className="text-xs font-mono font-bold text-rose-500">
                                        ROUND: {formatTimer(elapsedSeconds)}
                                    </span>
                                    <span className="text-zinc-400 font-mono text-[11px]">
                                        ({formatTimer(remainingSeconds)} left)
                                    </span>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewMode(viewMode === "live" ? "briefing" : "live")}
                                    className="h-8 text-xs cursor-pointer gap-1.5 border-zinc-200 dark:border-zinc-800"
                                >
                                    <BookOpen className="size-3.5 text-amber-500" />
                                    {viewMode === "live" ? "View Candidate Intel" : "Return to Voice Room"}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                <Clock className="size-3.5 text-amber-500" />
                                <span>30-Min Planned Round</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LIVE VOICE ROOM VIEW */}
            {viewMode === "live" ? (
                <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
                    {/* 30-Minute Timeline HUD Progress Bar */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 p-4 backdrop-blur-xl mb-6 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                            <span className="flex items-center gap-2 font-bold text-foreground">
                                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                                Phase {currentPhase.number} of 5: {currentPhase.name}
                            </span>
                            <span className="text-muted-foreground">
                                {currentPhase.timeRange} &bull; {progressPercent}% elapsed
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        {/* Phase markers */}
                        <div className="mt-2.5 grid grid-cols-5 gap-1 text-[10px] text-muted-foreground font-mono text-center">
                            <span className={currentPhase.number === 1 ? "text-amber-500 font-bold" : ""}>1. Motivation</span>
                            <span className={currentPhase.number === 2 ? "text-amber-500 font-bold" : ""}>2. Resume Claims</span>
                            <span className={currentPhase.number === 3 ? "text-amber-500 font-bold" : ""}>3. GitHub Architecture</span>
                            <span className={currentPhase.number === 4 ? "text-amber-500 font-bold" : ""}>4. Behavioral</span>
                            <span className={currentPhase.number === 5 ? "text-amber-500 font-bold" : ""}>5. Q&A / Wrap</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Technical Assessment with <span className="text-amber-500">{candidateDisplayName}</span>
                        </h2>
                        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-lg leading-relaxed">
                            {currentPhase.detail}. Speak naturally and answer with concrete technical reasoning.
                        </p>
                    </div>

                    {/* Dual Voice Orbs Stage */}
                    <div className="mt-8 flex w-full flex-col items-center justify-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 p-8 sm:p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

                        {voiceStatus === "connecting" ? (
                            <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                                <Loader2 className="size-10 animate-spin text-amber-500" />
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-foreground">
                                        Connecting to Valtrix Realtime Voice Engine...
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                                        Calibrating instructions for {targetCompany} ({seniorityLevel} level)
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex w-full max-w-3xl flex-col items-center justify-around gap-12 sm:flex-row sm:gap-20 z-10">
                                <VoiceOrb
                                    level={aiLevel}
                                    speaking={aiSpeaking}
                                    label={`${targetCompany} Interviewer`}
                                    sublabel={`${seniorityLevel} Bar Raiser`}
                                    icon={Bot}
                                    accent="amber"
                                />

                                <VoiceOrb
                                    level={userLevel}
                                    speaking={userSpeaking}
                                    label={candidateDisplayName}
                                    sublabel={isMuted ? "Microphone Muted" : "Audio Active"}
                                    icon={User}
                                    accent="emerald"
                                />
                            </div>
                        )}

                        {/* Controls */}
                        <div className="mt-12 flex items-center gap-3.5 z-10">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={toggleMute}
                                className={`gap-2 rounded-xl px-5 h-11 text-xs font-semibold cursor-pointer border transition-all ${
                                    isMuted
                                        ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                                        : "border-zinc-300 dark:border-zinc-700 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-850 text-foreground"
                                }`}
                            >
                                {isMuted ? (
                                    <>
                                        <MicOff className="size-4 text-rose-500" />
                                        <span>Unmute Mic</span>
                                    </>
                                ) : (
                                    <>
                                        <Mic className="size-4 text-emerald-500" />
                                        <span>Mute Mic</span>
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="destructive"
                                size="lg"
                                onClick={() => endInterview(false)}
                                className="gap-2 rounded-xl px-6 h-11 text-xs font-bold cursor-pointer bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20"
                            >
                                <PhoneOff className="size-4" />
                                <span>Conclude & Evaluate</span>
                            </Button>
                        </div>
                    </div>

                    {/* Live Transcript Stream */}
                    <div className="mt-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-5 shadow-sm backdrop-blur-xl">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
                            <div className="flex items-center gap-2">
                                <Volume2 className="size-4 text-amber-500" />
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    Realtime Speech Transcript
                                </span>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                                Whisper STT Live Stream
                            </span>
                        </div>

                        <div className="mt-4 flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                            {liveMessages.length === 0 ? (
                                <p className="py-6 text-center text-xs text-muted-foreground font-mono">
                                    Listening... Candidate and interviewer turns will appear here in real-time.
                                </p>
                            ) : (
                                liveMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex flex-col gap-1 rounded-xl p-3 text-xs leading-relaxed ${
                                            msg.type === "Assistant"
                                                ? "bg-amber-500/10 border border-amber-500/20 text-foreground"
                                                : "bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-foreground"
                                        }`}
                                    >
                                        <span className="font-bold text-[11px] font-mono flex items-center gap-1.5">
                                            {msg.type === "Assistant" ? (
                                                <>
                                                    <Bot className="size-3 text-amber-500" />
                                                    <span className="text-amber-500">{targetCompany} Interviewer</span>
                                                </>
                                            ) : (
                                                <>
                                                    <User className="size-3 text-emerald-500" />
                                                    <span className="text-emerald-500">{candidateDisplayName}</span>
                                                </>
                                            )}
                                        </span>
                                        <p className="mt-0.5">{msg.content || msg.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* REPOSITORY & RESUME CANDIDATE BRIEFING VIEW */
                <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
                    {/* Candidate Profile Header Card */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                                {githubData?.profile.avatarUrl ? (
                                    <img
                                        src={githubData.profile.avatarUrl}
                                        alt={candidateDisplayName}
                                        className="size-20 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 object-cover shadow-md shrink-0"
                                    />
                                ) : (
                                    <div className="size-20 rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-md shrink-0">
                                        <User className="size-10" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                            {candidateDisplayName}
                                        </h1>
                                        {githubData?.profile.username && (
                                            <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                                                @{githubData.profile.username}
                                            </span>
                                        )}
                                        <span className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                                            {resumeData?.targetRole || `${seniorityLevel} Software Engineer`}
                                        </span>
                                    </div>

                                    {resumeData?.summary ? (
                                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                            {resumeData.summary}
                                        </p>
                                    ) : githubData?.profile.bio ? (
                                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                                            {githubData.profile.bio}
                                        </p>
                                    ) : null}

                                    {/* Company & Role Target */}
                                    <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                                            <Building2 className="size-3.5 text-amber-500" />
                                            <span>Interview Target: <strong>{targetCompany}</strong></span>
                                        </span>
                                        <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                                        <span className="flex items-center gap-1.5">
                                            <Award className="size-3.5 text-amber-500" />
                                            <span>Level: <strong>{seniorityLevel}</strong></span>
                                        </span>
                                        <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="size-3.5 text-amber-500" />
                                            <span>Duration: <strong>30 Minutes</strong></span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Start Voice Round Button */}
                            <Button
                                size="lg"
                                onClick={startVoiceInterview}
                                className="h-11 shrink-0 gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs sm:text-sm px-6 shadow-md cursor-pointer transition-all"
                            >
                                <Mic className="size-4" />
                                <span>Start 30-Min Round</span>
                            </Button>
                        </div>
                    </div>

                    {/* Company Intelligence Radar (Live Scraped from Context.dev) */}
                    {companyIntel && (
                        <div className="mt-6 rounded-2xl border border-amber-500/30 dark:border-amber-500/20 bg-linear-to-b from-amber-500/[0.04] to-transparent dark:from-amber-500/[0.02] p-6 backdrop-blur-xl shadow-xs">
                            {/* Header with Company, Archetype & Level */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-500 font-bold">
                                        <Compass className="size-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-foreground">
                                                {companyIntel.companyName || targetCompany} Intelligence Radar
                                            </h3>
                                            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                                                {companyIntel.archetype} Archetype
                                            </span>
                                            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                                                Target Level: {companyIntel.normalizedLevel || seniorityLevel}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Live scraped interview pattern, calibrated rounds & genuine LeetCode/interview reports via Context.dev
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 3-column Grid for Roadmap, Cultural Values, & Tech Stack */}
                            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                {/* Round Roadmap */}
                                <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/40 p-4">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                                        <Layers className="size-3.5 text-amber-500" />
                                        <span>Interview Loop Roadmap</span>
                                    </div>
                                    <div className="space-y-2">
                                        {companyIntel.interviewRoundsOverview?.map((round, rIdx) => (
                                            <div key={rIdx} className="flex items-start gap-2 text-xs">
                                                <span className="size-4 shrink-0 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center mt-0.5">
                                                    {rIdx + 1}
                                                </span>
                                                <span className="text-muted-foreground leading-tight">{round}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Core Cultural Signals / Principles */}
                                <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/40 p-4">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                                        <ShieldCheck className="size-3.5 text-amber-500" />
                                        <span>Core Values & Signals</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {companyIntel.cultureValues?.map((val, vIdx) => (
                                            <span
                                                key={vIdx}
                                                className="rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 px-2 py-1 text-[11px] font-medium text-foreground"
                                            >
                                                {val}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Tech Stack & Ecosystem */}
                                <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/40 p-4">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                                        <Zap className="size-3.5 text-amber-500" />
                                        <span>Expected Tech Stack</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {companyIntel.techStack?.map((tech, tIdx) => (
                                            <span
                                                key={tIdx}
                                                className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[11px] font-mono text-amber-700 dark:text-amber-300"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Scraped Genuine Questions Bank */}
                            {companyIntel.questions && companyIntel.questions.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-zinc-200/60 dark:border-zinc-800/60 text-left">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Flame className="size-4 text-amber-500" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                Recent Verified Questions & Evaluation Rubrics ({companyIntel.questions.length})
                                            </h4>
                                        </div>
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                            Calibrated for {companyIntel.normalizedLevel || seniorityLevel}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {companyIntel.questions.map((q, qIdx) => {
                                            const diffBadge =
                                                q.difficulty === "hard"
                                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                                    : q.difficulty === "medium"
                                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

                                            return (
                                                <div
                                                    key={qIdx}
                                                    className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-950/60 p-4 flex flex-col justify-between"
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${diffBadge}`}>
                                                                    {q.difficulty}
                                                                </span>
                                                                <span className="text-[11px] font-mono text-muted-foreground">
                                                                    Round {q.round_number}: {q.round_type.replace(/_/g, " ")} ({q.duration_min}m)
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">
                                                                {q.date}
                                                            </span>
                                                        </div>

                                                        <h5 className="text-xs font-semibold text-foreground leading-snug">
                                                            {q.question_summary}
                                                        </h5>

                                                        {/* Topics */}
                                                        {q.topics?.length > 0 && (
                                                            <div className="mt-2.5 flex flex-wrap gap-1">
                                                                {q.topics.map((top, tIdx) => (
                                                                    <span
                                                                        key={tIdx}
                                                                        className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                                                                    >
                                                                        #{top}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Follow-ups */}
                                                        {q.followups?.length > 0 && (
                                                            <div className="mt-3 space-y-1 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                                                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                                                                    Expected Deep-Dive Follow-ups:
                                                                </span>
                                                                {q.followups.map((f, fIdx) => (
                                                                    <div key={fIdx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                                                        <span className="text-amber-500 font-bold">&rsaquo;</span>
                                                                        <span>{f}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Evaluation Signals */}
                                                    {q.evaluation_signals?.length > 0 && (
                                                        <div className="mt-3 pt-2.5 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[10px] font-mono text-zinc-400">Signals:</span>
                                                            {q.evaluation_signals.map((sig, sIdx) => (
                                                                <span
                                                                    key={sig}
                                                                    className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.2"
                                                                >
                                                                    {sig}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Resume Intel Section (if available) */}
                    {resumeData && (
                        <div className="mt-6 space-y-6">
                            {/* Top Skills */}
                            {resumeData.topSkills?.length > 0 && (
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-5 backdrop-blur-xl shadow-xs">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="size-4 text-amber-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            Core Skills & Stack Identified (GPT-4o)
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {resumeData.topSkills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-mono font-medium text-foreground"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Work Experience with Technical Claims */}
                            {resumeData.workExperience?.length > 0 && (
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xs">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="size-4 text-amber-500" />
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                Work Experience & Technical Claims to Probe
                                            </h3>
                                        </div>
                                        <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                                            *Will be challenged in Phase 2
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {resumeData.workExperience.map((exp, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 text-left"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                    <h4 className="text-sm font-bold text-foreground">
                                                        {exp.role} &bull; <span className="text-amber-500">{exp.company}</span>
                                                    </h4>
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        {exp.duration}
                                                    </span>
                                                </div>

                                                {/* Technical Claims */}
                                                {exp.technicalClaims?.length > 0 && (
                                                    <div className="mt-3 space-y-1.5">
                                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                                                            High-Impact Claims to be Examined:
                                                        </span>
                                                        {exp.technicalClaims.map((claim, cIdx) => (
                                                            <div
                                                                key={cIdx}
                                                                className="flex items-start gap-2 text-xs text-foreground bg-amber-500/[0.06] border border-amber-500/20 rounded-lg p-2 font-medium"
                                                            >
                                                                <span className="text-amber-500 font-bold shrink-0">&bull;</span>
                                                                <span>{claim}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Key Achievements */}
                                                {exp.keyAchievements?.length > 0 && (
                                                    <ul className="mt-2.5 list-disc list-inside text-xs text-muted-foreground space-y-1">
                                                        {exp.keyAchievements.map((ach, aIdx) => (
                                                            <li key={aIdx}>{ach}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resume Standalone Projects */}
                            {resumeData.projects?.length > 0 && (
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xs">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Layers className="size-4 text-amber-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            Projects Extracted from Resume
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {resumeData.projects.map((proj, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-4"
                                            >
                                                <h4 className="text-sm font-bold text-foreground">{proj.name}</h4>
                                                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                                    {proj.description}
                                                </p>
                                                {proj.technologies?.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-1">
                                                        {proj.technologies.map((t) => (
                                                            <span
                                                                key={t}
                                                                className="rounded bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-foreground"
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {proj.architectureHighlights && (
                                                    <p className="mt-2 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                                                        Arch: {proj.architectureHighlights}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* GitHub Public Repositories Section (if available) */}
                    {githubData && (
                        <div className="mt-8 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Github className="size-4 text-amber-500" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Public GitHub Repositories ({filteredRepos.length})
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Search repos..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-8 pl-8 text-xs w-48 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Repos Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRepos.slice(0, 12).map((repo) => (
                                    <div
                                        key={repo.name}
                                        className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/40 p-4 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <a
                                                    href={repo.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm font-bold font-mono text-foreground hover:text-amber-500 flex items-center gap-1 truncate"
                                                >
                                                    <span className="truncate">{repo.name}</span>
                                                    <ExternalLink className="size-3 shrink-0 opacity-60" />
                                                </a>
                                                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0">
                                                    <span className="flex items-center gap-0.5">
                                                        <Star className="size-3 text-amber-500 fill-amber-500/20" />
                                                        {repo.starCount}
                                                    </span>
                                                    <span className="flex items-center gap-0.5">
                                                        <GitFork className="size-3" />
                                                        {repo.forkCount}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {repo.description || "No description provided."}
                                            </p>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between text-xs font-mono pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40">
                                            {repo.language ? (
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <span
                                                        className={`size-2 rounded-full ${
                                                            LANGUAGE_COLORS[repo.language] || "bg-amber-500"
                                                        }`}
                                                    />
                                                    {repo.language}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">Unknown</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
