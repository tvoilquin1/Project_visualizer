"use client";

import { cn } from "@/lib/utils";
import type { Task, Party, ISODate } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface BubbleRowProps {
  tasks: Task[];
  parties: Party[];
  workdayWindow: ISODate[];
}

/** Get a party's color by id, or return undefined for unassigned */
function getPartyColor(partyId: string | null | undefined, parties: Party[]): string | undefined {
  if (!partyId) return undefined;
  return parties.find((p) => p.id === partyId)?.color;
}

/** Extract initials from title (first 1-2 chars) */
function getInitials(title: string): string {
  return title.slice(0, 2).toUpperCase();
}

/**
 * BubbleRow — Small rounded pills shown on collapsed parent rows,
 * representing scheduled subtasks.
 *
 * Each bubble is a ~12px × 12px pill positioned at the start of the
 * subtask's date range, colored by the subtask's party.
 * Hover shows a tooltip with task title + date range.
 */
export function BubbleRow({
  tasks,
  parties,
  workdayWindow,
}: BubbleRowProps) {
  // Only show bubbles for scheduled tasks
  const scheduledTasks = tasks.filter((t) => t.start && t.end);

  if (scheduledTasks.length === 0) return null;

  return (
    <TooltipProvider delay={300}>
      <div className="absolute inset-0 flex items-center pointer-events-none">
        {scheduledTasks.map((subtask) => {
          const startIdx = workdayWindow.indexOf(subtask.start!);
          const endIdx = workdayWindow.indexOf(subtask.end!);
          if (startIdx === -1) return null;

          const partyColor = getPartyColor(subtask.partyId, parties);
          const isUnassigned = !partyColor;

          // Date range label
          const dateLabel = [subtask.start, subtask.end].filter(Boolean).join(" – ");

          return (
            <Tooltip key={subtask.id}>
              <TooltipTrigger
                className={cn(
                  // Positioning
                  "!absolute",
                  // Bubble pill shape
                  "!size-3 !rounded-pill flex items-center justify-center",
                  // Reset button styles
                  "appearance-none border-0 p-0",
                  // Pointer events re-enabled on the bubble itself
                  "pointer-events-auto",
                  // Transition
                  "transition-transform duration-150 hover:scale-125 hover:z-30",
                  // Focus ring
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  // Color
                  isUnassigned
                    ? "bg-neutral-400"
                    : ""
                )}
                style={{
                  left: `${startIdx * 40 + 2}px`,
                  backgroundColor: partyColor ?? undefined,
                }}
                aria-label={`${subtask.title}, ${dateLabel}`}
              >
                {/* Tiny initials */}
                <span
                  className={cn(
                    "text-[6px] leading-none font-bold select-none",
                    isUnassigned ? "text-neutral-50" : "text-white"
                  )}
                >
                  {getInitials(subtask.title)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="max-w-xs">
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-semibold">{subtask.title}</span>
                  <span className="text-muted-foreground/80">{dateLabel}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
