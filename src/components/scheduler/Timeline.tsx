"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { generateWeekWindow, prevWorkday, nextWorkday } from "@/lib/workdays";
import type { ISODate } from "@/lib/types";
import { TimelineHeader } from "@/components/scheduler/TimelineHeader";
import { DescriptionColumn } from "@/components/scheduler/DescriptionColumn";
import { EmptyState } from "@/components/empty-state";
import type { TaskLabel } from "@/components/scheduler/DescriptionColumn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineTask {
  id: string;
  title: string;
  parentTaskId: string | null;
  depth: number;
  start: ISODate | null;
  end: ISODate | null;
}

export interface TimelineProps {
  /** Whether an active project exists */
  hasActiveProject?: boolean;
  /** The tasks to display (flat list, already processed) */
  tasks?: TimelineTask[];
  /** Generated labels, e.g. [(id, "1", "Project Name"), (id, "1.1", "Task")] */
  labels?: TaskLabel[];
  /** IDs of collapsed tasks */
  collapsedIds?: string[];
  /** Toggle collapse callback */
  onToggleCollapse?: (taskId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKS_BACK = 6;
const WEEKS_FORWARD = 6;
const SCROLL_THRESHOLD = 100; // px from edge to trigger load more

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): ISODate {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Compute the start column index for a task bar (0-based, within the workday window).
 * Returns -1 if the task has no start date.
 */
function getTaskStartCol(task: TimelineTask, workdays: ISODate[]): number {
  if (!task.start) return -1;
  for (let i = 0; i < workdays.length; i++) {
    if (workdays[i]! >= task.start) return i;
  }
  return workdays.length;
}

/**
 * Compute the end column index for a task bar (exclusive end).
 */
function getTaskEndCol(task: TimelineTask, workdays: ISODate[]): number {
  if (!task.end) return -1;
  for (let i = 0; i < workdays.length; i++) {
    if (workdays[i]! > task.end) return i;
  }
  return workdays.length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Timeline({
  hasActiveProject = false,
  tasks = [],
  labels = [],
  collapsedIds = [],
  onToggleCollapse,
}: TimelineProps) {
  const today = useMemo(() => todayISO(), []);

  // Workday window state
  const [workdays, setWorkdays] = useState<ISODate[]>(() =>
    generateWeekWindow(today, WEEKS_BACK, WEEKS_FORWARD),
  );

  // Refs
  const bodyRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);

  // Scroll to today on mount
  useEffect(() => {
    const idx = workdays.indexOf(today);
    if (idx !== -1 && bodyRef.current) {
      bodyRef.current.scrollLeft = Math.max(0, idx * 40 - 8);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Infinite scroll: load more workdays near edges ---
  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

    // Near left edge — load more backward
    if (scrollLeft < SCROLL_THRESHOLD && workdays.length > 0) {
      const earliest = workdays[0]!;
      const newDays: ISODate[] = [];
      let day: ISODate = prevWorkday(earliest);
      for (let i = 0; i < 20; i++) {
        newDays.unshift(day);
        day = prevWorkday(day);
      }
      setWorkdays((prev) => [...newDays, ...prev]);
      requestAnimationFrame(() => {
        if (el) el.scrollLeft = scrollLeft + newDays.length * 40;
      });
    }

    // Near right edge — load more forward
    if (scrollLeft + clientWidth > scrollWidth - SCROLL_THRESHOLD && workdays.length > 0) {
      const latest = workdays[workdays.length - 1]!;
      const newDays: ISODate[] = [];
      let day: ISODate = nextWorkday(latest);
      for (let i = 0; i < 20; i++) {
        newDays.push(day);
        day = nextWorkday(day);
      }
      setWorkdays((prev) => [...prev, ...newDays]);
    }
  }, [workdays]);

  // Debounced scroll handler
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(handleScroll, 200);
  }, [handleScroll]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Today column index
  const todayColIndex = useMemo(() => workdays.indexOf(today), [workdays, today]);

  // Month boundaries for vertical lines
  const monthBoundarySet = useMemo(() => {
    const boundaries = new Set<number>();
    if (workdays.length === 0) return boundaries;
    let lastMonth = "";
    for (let i = 0; i < workdays.length; i++) {
      const month = workdays[i]!.slice(0, 7);
      if (month !== lastMonth) {
        if (i > 0) boundaries.add(i);
        lastMonth = month;
      }
    }
    return boundaries;
  }, [workdays]);

  // --- Render helpers ---

  const renderGridLines = () => (
    <div className="flex" style={{ width: workdays.length * 40, height: "100%" }}>
      {workdays.map((date, i) => {
        const isBoundary = monthBoundarySet.has(i);
        return (
          <div
            key={date}
            className={`flex-shrink-0 border-r border-border/30 ${isBoundary ? "border-l border-l-border" : ""}`}
            style={{ width: 40 }}
          />
        );
      })}
    </div>
  );

  const renderTodayLine = () => {
    if (todayColIndex === -1) return null;
    return (
      <div
        className="absolute top-0 bottom-0 w-px bg-accent/60 pointer-events-none z-5"
        style={{ left: todayColIndex * 40 }}
      />
    );
  };

  const renderTaskRows = () => {
    if (tasks.length === 0) {
      return (
        <div
          className="flex items-center justify-center text-xs text-muted-foreground h-20"
          style={{ width: workdays.length * 40 }}
        >
          No tasks scheduled yet
        </div>
      );
    }

    return tasks.map((task) => {
      const startCol = getTaskStartCol(task, workdays);
      const endCol = getTaskEndCol(task, workdays);

      let barStart = 0;
      let barWidth = 0;
      if (startCol !== -1 && endCol !== -1 && startCol < workdays.length && endCol > 0) {
        const clampedStart = Math.max(0, startCol);
        const clampedEnd = Math.min(workdays.length, endCol);
        barStart = clampedStart * 40;
        barWidth = Math.max(4, (clampedEnd - clampedStart) * 40);
      }

      return (
        <div
          key={task.id}
          className="flex items-center border-b border-border/50 relative"
          style={{
            height: "var(--cell-height)",
            width: workdays.length * 40,
          }}
        >
          {barWidth > 0 && (
            <div
              className="absolute h-5 rounded-sm bg-primary/10 border border-primary/20"
              style={{
                left: barStart,
                width: barWidth,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <span className="px-1.5 text-[10px] leading-5 text-primary truncate block">
                {task.title}
              </span>
            </div>
          )}
        </div>
      );
    });
  };

  // --- Empty state ---

  if (!hasActiveProject) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center h-12 border-b border-border px-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Timeline
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      </div>
    );
  }

  // --- Main render ---

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header row: corner square + TimelineHeader */}
      <div className="flex sticky top-0 z-30 flex-shrink-0">
        <div
          className="sticky left-0 z-20 bg-background border-r border-b border-border flex-shrink-0"
          style={{ width: "var(--sidebar-width)", height: 0 }}
        />
        <div className="flex-1 overflow-hidden">
          <TimelineHeader workdays={workdays} today={today} />
        </div>
      </div>

      {/* Body: sticky left column + scrollable grid */}
      <div className="flex flex-1 overflow-hidden">
        <DescriptionColumn
          labels={labels}
          collapsedIds={collapsedIds}
          onToggleCollapse={(id) => onToggleCollapse?.(id)}
        />

        <div ref={bodyRef} className="overflow-auto flex-1" onScroll={onScroll}>
          <div
            ref={timelineGridRef}
            className="relative"
            style={{ minWidth: workdays.length * 40 }}
          >
            {/* Spacer to push rows below the sticky header */}
            <div style={{ height: 37 }} />

            {/* Today vertical line */}
            {renderTodayLine()}

            {/* Month boundary + grid lines */}
            {renderGridLines()}

            {/* Task rows */}
            <div className="relative">{renderTaskRows()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
