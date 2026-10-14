import "styles/globals.css";
import { Form } from "./components/Form";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result";
import { Navbar } from "./components/Navbar";
import { ThemeProvider, useTheme } from "./components/theme-provider";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route } from "react-router";

function AppShell() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground relative flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
        {/* Ambient Mesh Grid / Halo Glow */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-amber-500/[0.04] dark:bg-amber-500/[0.06] blur-[140px] rounded-full" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        <Navbar />

        <div className="flex-1 w-full">
          <Routes>
            <Route path="/" element={<Form />} />
            <Route path="/interview/:interviewId" element={<Interview />} />
            <Route path="/result/:interviewId" element={<Result />} />
          </Routes>
        </div>

        <Toaster position="bottom-right" theme={theme as any} />
      </div>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="valtrix-theme">
      <AppShell />
    </ThemeProvider>
  );
}

export default App;
