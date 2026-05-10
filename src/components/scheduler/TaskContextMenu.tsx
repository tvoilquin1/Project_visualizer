"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { x: number; y: number };
  taskId: string;
  taskTitle: string;
  onAddSubtask: (parentTaskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

// ---------------------------------------------------------------------------
// TaskContextMenu
// ---------------------------------------------------------------------------

export function TaskContextMenu({
  open,
  onOpenChange,
  position,
  taskId,
  taskTitle,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
}: TaskContextMenuProps) {
  if (!open) return null;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <span
            style={{
              position: "fixed",
              left: position.x,
              top: position.y,
              width: 1,
              height: 1,
              pointerEvents: "none",
              opacity: 0,
            }}
          />
        }
      />
      <DropdownMenuContent
        align="start"
        side="bottom"
        className="min-w-[180px]"
      >
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">
            {taskTitle}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            onAddSubtask(taskId);
            onOpenChange(false);
          }}
          className="gap-2"
        >
          <Plus className="size-3.5" />
          Add Sub-task
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onEditTask(taskId);
            onOpenChange(false);
          }}
          className="gap-2"
        >
          <Pencil className="size-3.5" />
          Edit Task
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            onDeleteTask(taskId);
            onOpenChange(false);
          }}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
