"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import type { ISODate } from "@/lib/types";
import { getMonthBoundaries } from "@/lib/workdays";

export interface TimelineHeaderProps {
  workdays: ISODate[];
  today: ISODate;
}

/**
 * TimelineHeader — Two-row sticky header showing weekday abbreviations
 * (Mon, Tue, Wed...) and date numbers (11, 12, 13...), with month boundary
 * labels and today highlight.
 */
export function TimelineHeader({ workdays, today }: TimelineHeaderProps) {
  const monthBoundaries = useMemo(
    () => getMonthBoundaries(workdays[0]!, workdays[workdays.length - 1]!),
    [workdays],
  );

  const boundaryDates = useMemo(() => {
    const set = new Set<string>();
    for (const b of monthBoundaries) set.add(b.date);
    return set;
  }, [monthBoundaries]);

  const monthLabels = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of monthBoundaries) {
      const idx = workdays.indexOf(b.date);
      if (idx !== -1) map.set(idx, b.label);
    }
    return map;
  }, [monthBoundaries, workdays]);

  return (
    <div
      className="sticky top-0 z-10 bg-background flex-shrink-0"
      style={{ minWidth: workdays.length * 40 }}
    >
      {/* Month boundary row */}
      <div className="flex h-5" style={{ width: workdays.length * 40 }}>
        {workdays.map((date, i) => {
          const label = monthLabels.get(i);
          const isBoundary = boundaryDates.has(date);
          return (
            <div key={date} className="relative flex-shrink-0" style={{ width: 40 }}>
              {isBoundary && label && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                  <span className="absolute left-1.5 top-0 text-[10px] font-medium text-muted-foreground leading-tight whitespace-nowrap">
                    {label}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Day name + date row */}
      <div className="flex h-8 border-b border-border" style={{ width: workdays.length * 40 }}>
        {workdays.map((date) => {
          const isToday = date === today;
          const dayName = format(new Date(date), "EEE");
          const dayNum = format(new Date(date), "d");
          return (
            <div
              key={date}
              className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50 ${isToday ? "bg-accent/20" : ""}`}
              style={{ width: 40, height: 32 }}
            >
              <span className={`text-[10px] leading-tight ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {dayName}
              </span>
              <span className={`text-xs leading-tight ${isToday ? "text-primary font-bold" : "text-foreground"}`}>
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
