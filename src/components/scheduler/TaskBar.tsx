"use client";

import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TaskBarProps {
  task: Task;
  partyColor?: string;
  workdayIndex: number;
  duration: number;
  hasConflict?: boolean;
  conflictMessages?: string[];
  isActive?: boolean;
}

/**
 * TaskBar — A horizontal bar representing a scheduled task on the timeline.
 *
 * Positioned absolutely within a task row using workdayIndex and duration.
 * Renders with the task's party color at 70% fill, full-opacity border.
 * Hover state: slight scale, soft shadow, grab cursor.
 * Resize handles visible on hover (left and right edges).
 * Accessible with role="button", tabIndex={0}, and aria-label.
 */
export function TaskBar({
  task,
  partyColor,
  workdayIndex,
  duration,
  hasConflict = false,
  conflictMessages = [],
  isActive = false,
}: TaskBarProps) {
  const isUnassigned = !partyColor;
  const barColor = isUnassigned ? undefined : partyColor;

  // Generate date range label for aria / tooltip
  const dateLabel = [task.start, task.end].filter(Boolean).join(" – ") ?? "unscheduled";

  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          data-role="button"
          tabIndex={0}
          aria-label={`${task.title}, ${dateLabel}${hasConflict ? ", has scheduling conflicts" : ""}`}
          className={cn(
            // Positioning
            "!absolute top-1/2 -translate-y-1/2",
            // Sizing & shape
            "!h-6 rounded-md overflow-hidden",
            // Reset button styles
            "appearance-none border-0 p-0 text-left",
            // Visual
            "transition-all duration-150 ease-standard",
            // Colors — unassigned gets neutral
            isUnassigned
              ? "bg-neutral-400/70 border border-neutral-400"
              : "border",
            // Active / hover states
            isActive
              ? "scale-102 shadow-md z-20"
              : "hover:scale-102 hover:shadow-md hover:z-20",
            // Focus visible ring
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            // Cursor
            "cursor-grab active:cursor-grabbing"
          )}
          style={{
            left: `${workdayIndex * 40}px`,
            width: `${Math.max(1, duration) * 40}px`,
            backgroundColor: barColor
              ? `color-mix(in srgb, ${barColor} 70%, transparent)`
              : undefined,
            borderColor: barColor ?? undefined,
          }}
        >
          {/* Inner highlight — slight white gradient at top for depth */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 rounded-t-md pointer-events-none"
            style={{
              background: barColor
                ? `linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)`
                : undefined,
            }}
          />

          {/* Task title — truncated with ellipsis */}
          <span
            className={cn(
              "absolute inset-x-1.5 inset-y-0 flex items-center",
              "text-[11px] leading-none font-medium truncate select-none",
              isUnassigned ? "text-neutral-50" : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"
            )}
          >
            {task.title}
          </span>

          {/* Conflict diagonal stripe overlay */}
          {hasConflict && (
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: `repeating-linear-gradient(-45deg, transparent, transparent 3px, #ef4444 3px, #ef4444 5px)`,
                opacity: 0.4,
                borderRadius: "inherit",
              }}
            />
          )}

          {/* Resize handles — visible on group hover */}
          <div className="absolute inset-y-0 left-0 w-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-col-resize bg-white/20 rounded-l-md pointer-events-auto" />
          <div className="absolute inset-y-0 right-0 w-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-col-resize bg-white/20 rounded-r-md pointer-events-auto" />
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="max-w-xs">
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-semibold">{task.title}</span>
            <span className="text-muted-foreground/80">{dateLabel}</span>
            {hasConflict && conflictMessages.length > 0 && (
              <span className="text-red-400 mt-0.5 text-[11px]">
                ⚠ {conflictMessages[0]}
                {conflictMessages.length > 1 && ` (+${conflictMessages.length - 1} more)`}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
