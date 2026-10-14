import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useNavigate } from "react-router";
import { COMPANY_CATEGORIES, ALL_COMPANIES } from "../lib/companies";
import { 
  ArrowRight, 
  Github, 
  Loader2, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Building2, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  Cpu, 
  Terminal 
} from "lucide-react";

export function Form() {
  const [github, setGithub] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("Google / Alphabet");
  const [customCompany, setCustomCompany] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState<"Fresher" | "Mid" | "Senior">("Mid");
  
  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeBase64, setResumeBase64] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const effectiveCompany = selectedCompany === "Custom" 
    ? (customCompany.trim() || "Tech Company") 
    : selectedCompany;

  const sampleProfiles = ["torvalds", "shadcn", "gaearon", "sindresorhus"];

  function handleFileSelect(file: File) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Resume file size must be under 20MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setResumeBase64(result);
      setResumeFile(file);
      toast.success(`Resume loaded: ${file.name}`);
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function removeFile() {
    setResumeFile(null);
    setResumeBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(urlOrUser?: string) {
    const targetGithub = (urlOrUser || github).trim();

    if (!targetGithub && !resumeBase64) {
      toast.error("Please provide either a GitHub username or upload your Resume.");
      return;
    }

    setLoading(true);
    setLoadingStep(resumeBase64 ? "Parsing resume with GPT-4o & indexing GitHub..." : "Analyzing GitHub profile...");

    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, {
        github: targetGithub,
        resumeBase64: resumeBase64 || undefined,
        resumeFileName: resumeFile?.name || undefined,
        targetCompany: effectiveCompany,
        seniorityLevel,
        durationMinutes: 30,
      });

      toast.success("Candidate intelligence prepared!");
      navigate(`/interview/${response.data.id}`, {
        state: { 
          githubData: response.data.githubData,
          resumeData: response.data.resumeData,
          targetCompany: response.data.targetCompany,
          seniorityLevel: response.data.seniorityLevel,
          companyIntel: response.data.companyIntel,
        },
      });
    } catch (e: any) {
      const errMsg = e.response?.data?.message || "Failed to prepare interview session. Check backend connection.";
      toast.error(errMsg);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center px-4 sm:px-6 py-10">
      <div className="w-full max-w-3xl flex flex-col items-center text-center">
        {/* Category Pill */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-500 backdrop-blur-md shadow-xs">
          <Sparkles className="size-3.5" />
          <span>Valtrix 30-Minute Rigorous Technical Interview Runtime</span>
        </div>

        {/* Title & Headline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Interview for <span className="text-amber-500">{effectiveCompany}</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
          Calibrate the AI interviewer to your target company, seniority level, GitHub architecture, and resume achievements for a live 30-minute voice simulation.
        </p>

        {/* Configuration Card */}
        <div className="mt-8 w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/80 p-5 sm:p-7 shadow-xl backdrop-blur-xl text-left">
          
          {/* Row 1: Company & Seniority Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-zinc-200/60 dark:border-zinc-800/60">
            {/* Target Company Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <Building2 className="size-3.5 text-amber-500" />
                Target Company
              </label>
              <select
                disabled={loading}
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium text-foreground focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all cursor-pointer"
              >
                <option value="Custom">-- Custom / Other Company --</option>
                {COMPANY_CATEGORIES.map((cat) => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.companies.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {selectedCompany === "Custom" && (
                <div className="mt-2">
                  <Input
                    placeholder="Enter company name (e.g. Stripe, Databricks)"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="h-9 text-xs font-medium"
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            {/* Seniority Level */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <UserCheck className="size-3.5 text-amber-500" />
                Seniority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Fresher", "Mid", "Senior"] as const).map((level) => {
                  const isSelected = seniorityLevel === level;
                  const label = level === "Fresher" ? "Fresher (0-1y)" : level === "Mid" ? "Mid (2-4y)" : "Senior (5y+)";
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={loading}
                      onClick={() => setSeniorityLevel(level)}
                      className={`h-10 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-amber-400 text-zinc-950 border-amber-400 shadow-sm"
                          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-muted-foreground hover:text-foreground hover:border-zinc-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Resume PDF Upload Zone */}
          <div className="py-5 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-amber-500" />
                Upload Resume (PDF, DOCX, TXT)
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono lowercase">
                *parsed with GPT-4o
              </span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {!resumeFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-amber-500/60 bg-zinc-50/50 dark:bg-zinc-900/50"
                }`}
              >
                <UploadCloud className="mx-auto size-7 text-amber-500/80 mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  Click to upload or drag & drop candidate resume
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  PDF, DOCX, or TXT up to 20MB. Work experience, tech stack, and claims will be verified in the interview.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-500">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md font-mono">
                      {resumeFile.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {(resumeFile.size / 1024).toFixed(1)} KB &bull; Ready for GPT-4o analysis
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={removeFile}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-foreground cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* Row 3: GitHub Profile Input */}
          <div className="pt-5">
            <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <span className="flex items-center gap-1.5">
                <Github className="size-3.5 text-amber-500" />
                Candidate GitHub Profile
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                optional if resume uploaded
              </span>
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={github}
                  placeholder="github.com/username or 'torvalds'"
                  onChange={(e) => setGithub(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
                  disabled={loading}
                  className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                Presets:
              </span>
              {sampleProfiles.map((user) => (
                <button
                  key={user}
                  type="button"
                  disabled={loading}
                  onClick={() => setGithub(user)}
                  className="cursor-pointer rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-amber-400 hover:border-amber-500/40 transition-all"
                >
                  @{user}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button & Runtime Meta */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-4 text-amber-500" />
              <span>Full 30-Minute Live Voice Round with Realtime STT</span>
            </div>

            <Button
              disabled={loading || (!github.trim() && !resumeBase64)}
              onClick={() => onSubmit()}
              size="lg"
              className="w-full sm:w-auto h-11 shrink-0 gap-2 font-bold text-xs sm:text-sm px-6 bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-md cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{loadingStep || "Preparing Session..."}</span>
                </>
              ) : (
                <>
                  <span>Begin Briefing & Interview</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tri-spec capability tags */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <FileText className="size-3.5 text-amber-500" />
              <span>Resume & Code Verification</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Extracts claims, architectural decisions, and production metrics with GPT-4o.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Cpu className="size-3.5 text-emerald-500" />
              <span>Calibrated Behavioral Round</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Seniority-tuned leadership scenarios, STAR evaluation, and company culture fit.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <ShieldCheck className="size-3.5 text-blue-500" />
              <span>30-Min Realtime Voice Pacing</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Structured 5-phase timeline with deep technical follow-ups and live timer.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
