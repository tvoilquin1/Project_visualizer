"use client";

import { useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2 } from "lucide-react";

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
  onAddSubtask?: (parentTaskId: string) => void;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

/**
 * DescriptionColumn — Sticky left panel showing task/subtask labels
 * with indentation, expand/collapse chevrons, hierarchical numbering,
 * and an inline actions menu (⋯) on hover.
 */
export function DescriptionColumn({
  labels,
  collapsedIds,
  onToggleCollapse,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
}: DescriptionColumnProps) {
  return (
    <div
      className="sticky left-0 z-20 bg-background border-r border-border h-full overflow-hidden flex-shrink-0"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Column header — must match TimelineHeader height (52px: 20px month + 32px day) */}
      <div
        className="flex items-end px-3 pb-1.5 border-b border-border"
        style={{ height: 52 }}
      >
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Task
        </span>
      </div>

      {/* Task labels */}
      <div className="overflow-y-auto" style={{ height: "calc(100% - 52px)" }}>
        {labels.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground px-4 text-center">
            No tasks yet — click &quot;Add Task&quot; to get started
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
                className="group flex items-center gap-1 border-b border-border/50 hover:bg-muted/30 transition-colors"
                style={{
                  height: "var(--cell-height)",
                  paddingLeft: `${12 + item.depth * 16}px`,
                  paddingRight: 4,
                }}
              >
                {/* Collapse/expand toggle */}
                {hasChildren ? (
                  <button
                    className="flex-shrink-0 size-4 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-sm hover:bg-muted transition-colors"
                    onClick={() => onToggleCollapse(item.id)}
                    aria-label={
                      isCollapsed ? "Expand subtasks" : "Collapse subtasks"
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                ) : (
                  <span className="flex-shrink-0 w-4" />
                )}

                {/* Label + title */}
                <div
                  className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    if (hasChildren) onToggleCollapse(item.id);
                  }}
                  title={item.title}
                >
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap tabular-nums">
                    {item.label}
                  </span>
                  <span className="text-xs truncate text-foreground">
                    {item.title}
                  </span>
                </div>

                {/* Actions menu — visible on hover */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex-shrink-0 size-5 flex items-center justify-center text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-foreground rounded-sm hover:bg-muted transition-all"
                    aria-label={`Actions for ${item.title}`}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    <DropdownMenuItem
                      className="gap-2 text-xs"
                      onClick={() => onAddSubtask?.(item.id)}
                    >
                      <Plus className="size-3.5" />
                      Add Sub-task
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-xs"
                      onClick={() => onEditTask?.(item.id)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                      onClick={() => onDeleteTask?.(item.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
