"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

export interface TaskLabel {
  id: string;
  label: string;
  title: string;
  depth: number;
  parentTaskId: string | null;
}

export interface DescriptionColumnProps {
  labels: TaskLabel[];
  collapsedIds: string[];
  onToggleCollapse: (taskId: string) => void;
}

/**
 * DescriptionColumn — Sticky left panel showing task/subtask labels
 * with indentation, expand/collapse chevrons, and hierarchical numbering.
 */
export function DescriptionColumn({
  labels,
  collapsedIds,
  onToggleCollapse,
}: DescriptionColumnProps) {
  return (
    <div
      className="sticky left-0 z-20 bg-background border-r border-border h-full overflow-hidden flex-shrink-0"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Column header */}
      <div className="h-12 flex items-center px-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Task
        </span>
      </div>

      {/* Task labels */}
      <div className="overflow-y-auto" style={{ height: "calc(100% - 48px)" }}>
        {labels.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground px-4 text-center">
            No tasks yet
          </div>
        ) : (
          labels.map((item) => {
            const isCollapsed = collapsedIds.includes(item.id);
            const hasChildren = labels.some(
              (l) => l.parentTaskId === item.id && l.depth > item.depth,
            );

            return (
              <div
                key={item.id}
                className="flex items-center gap-1.5 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                style={{
                  height: "var(--cell-height)",
                  paddingLeft: `${12 + item.depth * 16}px`,
                }}
                onClick={() => {
                  if (hasChildren) onToggleCollapse(item.id);
                }}
                title={item.title}
              >
                {hasChildren ? (
                  <span className="flex-shrink-0 size-4 flex items-center justify-center text-muted-foreground">
                    {isCollapsed ? (
                      <ChevronRight className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </span>
                ) : (
                  <span className="flex-shrink-0 w-4" />
                )}

                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap tabular-nums">
                    {item.label}
                  </span>
                  <span className="text-xs truncate text-foreground">
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
