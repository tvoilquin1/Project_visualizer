"use client";

import { CalendarDays, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const scrollToToday = () => {
    // Find the today button target — the timeline body
    const bodyEl = document.querySelector('[data-timeline-body="true"]');
    if (bodyEl) {
      const todayEl = bodyEl.querySelector('[data-today-col="true"]');
      if (todayEl) {
        const rect = todayEl.getBoundingClientRect();
        const parentRect = bodyEl.getBoundingClientRect();
        bodyEl.scrollLeft = bodyEl.scrollLeft + rect.left - parentRect.left - 8;
      }
    }
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-4 z-10 bg-background transition-colors">
      {/* Left: title */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-tight">
          Project Scheduler
        </h1>
      </div>

      {/* Center: Today button + zoom label */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={scrollToToday}
          className="gap-1.5"
        >
          <CalendarDays className="size-3.5" />
          Today
        </Button>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          Day
        </span>
      </div>

      {/* Right: Undo / Redo + ThemeToggle */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled aria-label="Undo">
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled aria-label="Redo">
          <Redo2 className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
