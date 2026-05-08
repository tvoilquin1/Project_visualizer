"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // On first visit, honour prefers-color-scheme or localStorage
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      // No stored preference – respect system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
        setIsDark(true);
      }
    }
    setMounted(true);
  }, []);

  function toggle() {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  }

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Loading theme">
        <div className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative size-4">
        <Sun
          className={`absolute inset-0 size-4 transition-all duration-[var(--duration-medium)] ease-[var(--ease-standard)] ${
            isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-75 opacity-0"
          }`}
        />
        <Moon
          className={`absolute inset-0 size-4 transition-all duration-[var(--duration-medium)] ease-[var(--ease-standard)] ${
            isDark ? "-rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
      </div>
    </Button>
  );
}
