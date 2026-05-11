"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { generateWeekWindow, prevWorkday, nextWorkday } from "@/lib/workdays";
import type { ISODate } from "@/lib/types";
import { TimelineHeader } from "@/components/scheduler/TimelineHeader";
import { DescriptionColumn } from "@/components/scheduler/DescriptionColumn";
import { EmptyState } from "@/components/empty-state";
import { TimelineSkeleton } from "@/components/skeleton";
import { TaskContextMenu } from "@/components/scheduler/TaskContextMenu";
import type { TaskLabel } from "@/components/scheduler/DescriptionColumn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateSegment {
  start: ISODate;
  end: ISODate;
}

export interface TimelineTask {
  id: string;
  title: string;
  parentTaskId: string | null;
  depth: number;
  start: ISODate | null;
  end: ISODate | null;
  /** Computed bar segments (leaf = own range; parent = aggregate of children) */
  segments: DateSegment[];
  /** Whether this task has children */
  isParent: boolean;
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
  /** Whether the data is still loading */
  loading?: boolean;
  /** Task interaction callbacks */
  onAddSubtask?: (parentTaskId: string) => void;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onDragCreate?: (startDate: string, endDate: string) => void;
  /** Called when the empty-state "New Project" button is clicked */
  onCreateProject?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKS_BACK = 1;
const WEEKS_FORWARD = 8;
const SCROLL_THRESHOLD = 100;
const COL_WIDTH = 40;
const HEADER_HEIGHT = 52;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): ISODate {
  return format(new Date(), "yyyy-MM-dd");
}

function getSegColStart(seg: DateSegment, workdays: ISODate[]): number {
  for (let i = 0; i < workdays.length; i++) {
    if (workdays[i]! >= seg.start) return i;
  }
  return workdays.length;
}

function getSegColEnd(seg: DateSegment, workdays: ISODate[]): number {
  for (let i = 0; i < workdays.length; i++) {
    if (workdays[i]! > seg.end) return i;
  }
  return workdays.length;
}

// Depth-based colors for task bars
const DEPTH_COLORS = [
  { bg: "rgba(99, 102, 241, 0.25)", border: "rgba(99, 102, 241, 0.5)", text: "rgb(99, 102, 241)" },
  { bg: "rgba(34, 197, 94, 0.25)", border: "rgba(34, 197, 94, 0.5)", text: "rgb(34, 197, 94)" },
  { bg: "rgba(234, 179, 8, 0.25)", border: "rgba(234, 179, 8, 0.5)", text: "rgb(180, 140, 10)" },
  { bg: "rgba(168, 85, 247, 0.25)", border: "rgba(168, 85, 247, 0.5)", text: "rgb(168, 85, 247)" },
  { bg: "rgba(236, 72, 153, 0.25)", border: "rgba(236, 72, 153, 0.5)", text: "rgb(236, 72, 153)" },
];

function getDepthColor(depth: number) {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length]!;
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
  loading = false,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
  onDragCreate,
  onCreateProject,
}: TimelineProps) {
  const today = useMemo(() => todayISO(), []);

  // Workday window state
  const [workdays, setWorkdays] = useState<ISODate[]>(() =>
    generateWeekWindow(today, WEEKS_BACK, WEEKS_FORWARD),
  );

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    taskId: string;
    taskTitle: string;
    position: { x: number; y: number };
  }>({
    open: false,
    taskId: "",
    taskTitle: "",
    position: { x: 0, y: 0 },
  });

  // Drag-to-create state
  const [dragState, setDragState] = useState<{
    active: boolean;
    startCol: number;
    currentCol: number;
  }>({
    active: false,
    startCol: 0,
    currentCol: 0,
  });

  // Refs
  const bodyRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);

  // Scroll to previous workday (yesterday) on mount — left edge of viewport
  useEffect(() => {
    const yesterday = prevWorkday(today);
    const idx = workdays.indexOf(yesterday);
    if (idx !== -1 && bodyRef.current) {
      bodyRef.current.scrollTo({
        left: idx * COL_WIDTH,
        behavior: "instant",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Infinite scroll: load more workdays near edges ---
  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

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
        if (el) el.scrollLeft = scrollLeft + newDays.length * COL_WIDTH;
      });
    }

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

  const todayColIndex = useMemo(() => workdays.indexOf(today), [workdays, today]);

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

  const contentHeight = Math.max(200, HEADER_HEIGHT + tasks.length * 32);

  // --- Context menu handlers ---
  const handleTaskContextMenu = useCallback(
    (e: React.MouseEvent, taskId: string, taskTitle: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        open: true,
        taskId,
        taskTitle,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    []
  );

  const handleTaskDoubleClick = useCallback(
    (taskId: string) => {
      onEditTask?.(taskId);
    },
    [onEditTask]
  );

  // --- Drag-to-create handlers ---
  const handleGridPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-task-bar]")) return;

      const container = timelineGridRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left + container.scrollLeft;
      const col = Math.max(0, Math.min(Math.floor(px / COL_WIDTH), workdays.length - 1));

      setDragState({ active: true, startCol: col, currentCol: col });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [workdays.length]
  );

  const handleGridPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.active) return;
      const container = timelineGridRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left + container.scrollLeft;
      const col = Math.max(0, Math.min(Math.floor(px / COL_WIDTH), workdays.length - 1));
      setDragState((prev) => ({ ...prev, currentCol: col }));
    },
    [dragState.active, workdays.length]
  );

  const handleGridPointerUp = useCallback(
    () => {
      if (!dragState.active) return;

      const startCol = Math.min(dragState.startCol, dragState.currentCol);
      const endCol = Math.max(dragState.startCol, dragState.currentCol);

      if (endCol > startCol && workdays[startCol] && workdays[endCol]) {
        onDragCreate?.(workdays[startCol]!, workdays[endCol]!);
      }

      setDragState({ active: false, startCol: 0, currentCol: 0 });
    },
    [dragState, workdays, onDragCreate]
  );

  // --- Loading state ---
  if (loading) {
    return <TimelineSkeleton />;
  }

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
          <EmptyState onCreateProject={onCreateProject} />
        </div>
      </div>
    );
  }

  const gridWidth = workdays.length * COL_WIDTH;

  // --- Render a single bar segment ---
  function renderBarSegment(
    task: TimelineTask,
    seg: DateSegment,
    segIdx: number,
    depthColor: ReturnType<typeof getDepthColor>,
  ) {
    const startCol = getSegColStart(seg, workdays);
    const endCol = getSegColEnd(seg, workdays);

    if (startCol >= workdays.length || endCol <= 0) return null;

    const clampedStart = Math.max(0, startCol);
    const clampedEnd = Math.min(workdays.length, endCol);
    const barLeft = clampedStart * COL_WIDTH;
    const barW = Math.max(4, (clampedEnd - clampedStart) * COL_WIDTH);

    return (
      <div
        key={`${task.id}-seg-${segIdx}`}
        data-task-bar="true"
        className="absolute h-6 rounded-md cursor-pointer transition-all duration-100 hover:brightness-110 hover:shadow-md hover:z-10"
        style={{
          left: barLeft,
          width: barW,
          top: "50%",
          transform: "translateY(-50%)",
          backgroundColor: depthColor.bg,
          borderWidth: 1,
          borderStyle: task.isParent ? "dashed" : "solid",
          borderColor: depthColor.border,
        }}
        onContextMenu={(e) => handleTaskContextMenu(e, task.id, task.title)}
        onDoubleClick={() => handleTaskDoubleClick(task.id)}
        title={`${task.title}\n${seg.start} → ${seg.end}${task.isParent ? " (aggregate)" : ""}\nDouble-click to edit · Right-click for options`}
      >
        <div
          className="absolute inset-x-0 top-0 h-1/2 rounded-t-md pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)",
          }}
        />
        {/* Show title only on first segment */}
        {segIdx === 0 && (
          <span
            className="px-1.5 text-[10px] leading-6 font-medium truncate block select-none"
            style={{ color: depthColor.text }}
          >
            {task.title}
          </span>
        )}
      </div>
    );
  }

  // --- Main render ---
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Body: sticky left column + scrollable grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Description column */}
        <DescriptionColumn
          labels={labels}
          collapsedIds={collapsedIds}
          onToggleCollapse={(id) => onToggleCollapse?.(id)}
          onAddSubtask={onAddSubtask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />

        {/* Scrollable timeline area */}
        <div
          ref={bodyRef}
          className="overflow-auto flex-1"
          onScroll={onScroll}
          data-timeline-body="true"
        >
          <div
            ref={timelineGridRef}
            className="relative select-none"
            style={{ width: gridWidth, minHeight: contentHeight }}
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={handleGridPointerUp}
          >
            {/* === Sticky header === */}
            <div className="sticky top-0 z-30">
              <TimelineHeader workdays={workdays} today={today} />
            </div>

            {/* === Grid lines (absolute, full height, behind everything) === */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ top: HEADER_HEIGHT }}
            >
              {workdays.map((date, i) => {
                const isBoundary = monthBoundarySet.has(i);
                return (
                  <div
                    key={date}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: i * COL_WIDTH + COL_WIDTH - 1,
                      width: 1,
                      backgroundColor: isBoundary
                        ? "var(--border)"
                        : "color-mix(in srgb, var(--border) 30%, transparent)",
                    }}
                  />
                );
              })}
            </div>

            {/* === Today vertical line === */}
            {todayColIndex !== -1 && (
              <div
                data-today-col="true"
                className="absolute bottom-0 w-0.5 pointer-events-none z-[5]"
                style={{
                  left: todayColIndex * COL_WIDTH + COL_WIDTH / 2,
                  top: HEADER_HEIGHT,
                  background: "var(--accent)",
                  opacity: 0.6,
                  boxShadow: "0 0 6px rgba(59, 130, 246, 0.3)",
                }}
              />
            )}

            {/* === Drag selection rectangle === */}
            {dragState.active && (() => {
              const s = Math.min(dragState.startCol, dragState.currentCol);
              const e = Math.max(dragState.startCol, dragState.currentCol);
              const w = (e - s + 1) * COL_WIDTH;
              if (w <= COL_WIDTH) return null;
              return (
                <div
                  className="absolute pointer-events-none z-10 rounded-sm"
                  style={{
                    left: s * COL_WIDTH,
                    width: w,
                    top: HEADER_HEIGHT,
                    bottom: 0,
                    background: "rgba(99, 102, 241, 0.08)",
                    border: "1px dashed rgba(99, 102, 241, 0.4)",
                  }}
                />
              );
            })()}

            {/* === Task rows === */}
            <div style={{ position: "relative", zIndex: 1 }}>
              {tasks.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center text-xs text-muted-foreground py-12 gap-2"
                  style={{ width: gridWidth }}
                >
                  <span className="text-sm font-medium">No tasks scheduled yet</span>
                  <span className="text-muted-foreground/70">
                    Click &quot;Add Task&quot; above or drag across the timeline to create one
                  </span>
                </div>
              ) : (
                tasks.map((task) => {
                  const depthColor = getDepthColor(task.depth);

                  return (
                    <div
                      key={task.id}
                      className="relative border-b border-border/40"
                      style={{
                        height: "var(--cell-height)",
                        width: gridWidth,
                      }}
                    >
                      {task.segments.map((seg, segIdx) =>
                        renderBarSegment(task, seg, segIdx, depthColor)
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task context menu */}
      <TaskContextMenu
        open={contextMenu.open}
        onOpenChange={(open) =>
          setContextMenu((prev) => ({ ...prev, open }))
        }
        position={contextMenu.position}
        taskId={contextMenu.taskId}
        taskTitle={contextMenu.taskTitle}
        onAddSubtask={(id) => onAddSubtask?.(id)}
        onEditTask={(id) => onEditTask?.(id)}
        onDeleteTask={(id) => onDeleteTask?.(id)}
      />
    </div>
  );
}
