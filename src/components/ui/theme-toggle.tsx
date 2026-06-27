"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Light/dark switch (React Bits "theme-toggle"), wired to the app ThemeProvider
 * and themed with design tokens so it reads well in both modes.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border border-border bg-secondary/80 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Faint track icons */}
      <Sun
        className={cn(
          "pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground transition-opacity duration-300",
          isDark ? "opacity-100" : "opacity-0",
        )}
        strokeWidth={1.75}
      />
      <Moon
        className={cn(
          "pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground transition-opacity duration-300",
          isDark ? "opacity-0" : "opacity-100",
        )}
        strokeWidth={1.75}
      />
      {/* Sliding knob */}
      <span
        className={cn(
          "absolute flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-transform duration-300 ease-out",
          isDark ? "translate-x-[2.125rem]" : "translate-x-1",
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" strokeWidth={2} /> : <Sun className="h-3.5 w-3.5" strokeWidth={2} />}
      </span>
    </button>
  );
}

export default ThemeToggle;
