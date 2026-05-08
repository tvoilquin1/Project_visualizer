"use client";

import { TimelineHeader } from "@/components/scheduler/TimelineHeader";
import { EmptyState } from "@/components/empty-state";

/**
 * Timeline — The main Gantt-style scheduler area.
 * This is a placeholder shell that will be fully implemented in Phase 3.
 * Currently shows the calendar header stub and an empty state message.
 */
export function Timeline() {
  return (
    <div className="flex flex-col h-full">
      <TimelineHeader />
      <div className="flex-1 flex items-center justify-center">
        <EmptyState />
      </div>
    </div>
  );
}
