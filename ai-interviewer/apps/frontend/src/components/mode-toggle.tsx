import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, Theme } from "./theme-provider";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (selected: Theme) => {
    setTheme(selected);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex items-center justify-center size-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800/90 text-foreground transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        title="Toggle theme (Light / Dark / System)"
      >
        <Sun className="size-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-zinc-100" />
        <span className="sr-only">Toggle theme</span>
      </button>

      {/* Floating Dropdown Menu */}
      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-36 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/20 p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect("light")}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              theme === "light"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="size-3.5 text-amber-500" />
              <span>Light</span>
            </div>
            {theme === "light" && <Check className="size-3 text-amber-500" />}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect("dark")}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              theme === "dark"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="size-3.5 text-zinc-400 dark:text-zinc-200" />
              <span>Dark</span>
            </div>
            {theme === "dark" && <Check className="size-3 text-amber-500" />}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect("system")}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              theme === "system"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Monitor className="size-3.5 text-zinc-400" />
              <span>System</span>
            </div>
            {theme === "system" && <Check className="size-3 text-amber-500" />}
          </button>
        </div>
      )}
    </div>
  );
}
