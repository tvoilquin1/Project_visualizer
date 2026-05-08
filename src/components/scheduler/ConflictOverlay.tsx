"use client";

import { cn } from "@/lib/utils";
import { getConflictCSS, findConflicts } from "@/lib/conflicts";
import type { Task, CalendarEvent, ISODate } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ConflictOverlayProps {
  task: Task;
  calendarEvents: CalendarEvent[];
  workdayWindow: ISODate[];
  visible: boolean;
}

/**
 * ConflictOverlay — Diagonal red stripes overlay for conflicting task portions.
 * Rendered as an absolutely-positioned overlay on top of task bars.
 * Pointer-events: none so it doesn't interfere with click/drag on the bar.
 */
export function ConflictOverlay({
  task,
  calendarEvents,
  workdayWindow,
  visible,
}: ConflictOverlayProps) {
  if (!visible || !task.start || !task.end) return null;

  const conflicts = findConflicts(task, calendarEvents);
  if (conflicts.length === 0) return null;

  const conflictStyle = getConflictCSS();

  return (
    <TooltipProvider delay={300}>
      {conflicts.map((conflict, idx) => {
        const event = calendarEvents.find((e) => e.id === conflict.eventId);
        const conflictStart = conflict.date;
        const conflictEnd = event?.end ?? task.end!;

        // Find workday indices for positioning
        const startIdx = workdayWindow.indexOf(conflictStart);
        const endIdx = workdayWindow.indexOf(conflictEnd);

        // If dates are not in the visible window, clamp
        const left = Math.max(0, startIdx);
        const right = endIdx >= 0 ? endIdx : workdayWindow.length - 1;
        const width = Math.max(1, right - left + 1);

        if (startIdx === -1 && endIdx === -1) return null;

        return (
          <Tooltip key={`${conflict.eventId}-${idx}`}>
            <TooltipTrigger
              className={cn(
                "!absolute inset-y-0 pointer-events-none z-10",
                "appearance-none border-0 p-0"
              )}
              style={{
                left: `${left * 40}px`,
                width: `${width * 40}px`,
                background: `repeating-linear-gradient(-45deg, transparent, transparent 3px, #ef4444 3px, #ef4444 5px)`,
                opacity: 0.45,
                borderRadius: "inherit",
                boxShadow: "inset 0 0 8px rgba(239,68,68,0.2)",
              }}
            />
            <TooltipContent side="top" align="center">
              <span className="text-xs">
                Conflicts with{" "}
                <strong>{event?.title ?? "unknown event"}</strong>
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </TooltipProvider>
  );
}
