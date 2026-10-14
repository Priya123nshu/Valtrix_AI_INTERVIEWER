import { useNavigate, useLocation } from "react-router";
import { Sparkles, Code2, Radio } from "lucide-react";
import { ModeToggle } from "./mode-toggle";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isInterview = location.pathname.startsWith("/interview");
  const isResult = location.pathname.startsWith("/result");

  return (
    <header className="sticky top-0 z-40 w-full pt-3 px-4 sm:px-6 pointer-events-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-lg pointer-events-auto">
        {/* Brand Monogram */}
        <div 
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="size-9 rounded-xl bg-zinc-950 dark:bg-zinc-900 border border-amber-500/30 flex items-center justify-center shadow-xs group-hover:border-amber-400 transition-colors">
            <svg
              className="size-5 text-amber-400 group-hover:scale-105 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4l8 16 8-16" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-foreground">
              Valtrix
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-semibold">
              Interview
            </span>
          </div>
        </div>

        {/* Center Ecosystem Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          <button
            onClick={() => navigate("/")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              isHome
                ? "bg-zinc-100 dark:bg-zinc-850 text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Candidate Setup
          </button>

          {isInterview && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-xs">
              <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
              Live Voice Assessment
            </span>
          )}

          {isResult && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs">
              <Sparkles className="size-3" />
              Diagnostic Evaluation
            </span>
          )}
        </nav>

        {/* Right Controls: ModeToggle & Product Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ModeToggle />

          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/40 bg-zinc-50 dark:bg-zinc-900/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
            title="Switch to Valtrix Algorithmic Coding"
          >
            <Code2 className="size-3.5 text-amber-500" />
            <span>Valtrix Code</span>
          </a>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-500">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Engine</span> Online
          </div>
        </div>
      </div>
    </header>
  );
}
