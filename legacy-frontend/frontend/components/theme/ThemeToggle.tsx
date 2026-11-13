"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex size-11 items-center justify-center rounded-full border border-white/60 bg-white/40 text-navy-800 shadow-[0_8px_24px_-16px_rgba(0,18,25,0.3)] backdrop-blur-xl transition-colors hover:bg-white/70 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-200 dark:hover:bg-white/10 dark:hover:text-teal-100 dark:focus-visible:ring-teal-300/50"
    >
      {mounted && isDark ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}
