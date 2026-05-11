"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Party, Task } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parties: Party[];
  tasks: Task[];
  /** Pre-set parent task ID (for "Add Sub-task") */
  parentTaskId?: string | null;
  /** Pre-set start/end dates (from drag-to-create) */
  defaultStart?: string | null;
  defaultEnd?: string | null;
  /** Parent task date boundaries (subtask dates must fall within) */
  parentBoundary?: { start: string | null; end: string | null } | null;
}

// ---------------------------------------------------------------------------
// AddTaskDialog
// ---------------------------------------------------------------------------

export function AddTaskDialog({
  open,
  onOpenChange,
  projectId,
  parties,
  tasks,
  parentTaskId: initialParentTaskId = null,
  defaultStart = null,
  defaultEnd = null,
  parentBoundary = null,
}: AddTaskDialogProps) {
  const createTask = useStore((s) => s.createTask);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(defaultStart ?? "");
  const [endDate, setEndDate] = useState(defaultEnd ?? "");
  const [partyId, setPartyId] = useState<string>("");
  const [parentTaskId, setParentTaskId] = useState<string>(
    initialParentTaskId ?? ""
  );
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build list of tasks that can be parents (top-level or existing parents)
  const parentCandidates = useMemo(() => {
    return tasks
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }, [tasks, projectId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setStartDate(defaultStart ?? "");
      setEndDate(defaultEnd ?? "");
      setPartyId("");
      setParentTaskId(initialParentTaskId ?? "");
      setTitleError("");
      setDateError("");
      setIsSubmitting(false);
    }
  }, [open, defaultStart, defaultEnd, initialParentTaskId]);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Title is required");
      return;
    }
    setTitleError("");

    // Validate dates if both provided
    if (startDate && endDate && startDate > endDate) {
      setDateError("Start date must be before end date");
      return;
    }
    // Validate against parent boundaries
    if (parentBoundary) {
      if (parentBoundary.start && startDate && startDate < parentBoundary.start) {
        setDateError(`Start can't be before parent boundary (${parentBoundary.start})`);
        return;
      }
      if (parentBoundary.end && endDate && endDate > parentBoundary.end) {
        setDateError(`End can't be after parent boundary (${parentBoundary.end})`);
        return;
      }
    }
    setDateError("");

    setIsSubmitting(true);
    try {
      // Calculate order: count existing sibling tasks
      const siblings = tasks.filter(
        (t) =>
          t.projectId === projectId &&
          (t.parentTaskId ?? null) === (parentTaskId || null)
      );
      const maxOrder = siblings.reduce(
        (max, t) => Math.max(max, t.order),
        -1
      );

      await createTask({
        projectId,
        title: trimmed,
        start: startDate || undefined,
        end: endDate || undefined,
        partyId: partyId || undefined,
        parentTaskId: parentTaskId || undefined,
        order: maxOrder + 1,
      });

      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    startDate,
    endDate,
    partyId,
    parentTaskId,
    projectId,
    tasks,
    createTask,
    onOpenChange,
  ]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialParentTaskId ? "Add Sub-task" : "Add Task"}
          </DialogTitle>
          <DialogDescription>
            {initialParentTaskId
              ? "Create a sub-task under the selected parent task."
              : "Create a new task with dates to display on the timeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" onKeyDown={handleKeyDown}>
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="add-task-title">Title</Label>
            <Input
              id="add-task-title"
              placeholder="Task name"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              aria-invalid={!!titleError}
              autoFocus
            />
            {titleError && (
              <p className="text-xs text-destructive">{titleError}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-task-start">Start Date</Label>
              <Input
                id="add-task-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (dateError) setDateError("");
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-task-end">End Date</Label>
              <Input
                id="add-task-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (dateError) setDateError("");
                }}
              />
            </div>
          </div>
          {dateError && (
            <p className="text-xs text-destructive">{dateError}</p>
          )}

          {/* Party Select */}
          <div className="space-y-1.5">
            <Label htmlFor="add-task-party">Assigned Party</Label>
            <Select value={partyId} onValueChange={(v) => setPartyId(v ?? "")}>
              <SelectTrigger id="add-task-party" className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Task Select (only if not already creating a subtask) */}
          {!initialParentTaskId && parentCandidates.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="add-task-parent">
                Parent Task{" "}
                <span className="text-muted-foreground font-normal">
                  (optional — makes this a sub-task)
                </span>
              </Label>
              <Select
                value={parentTaskId}
                onValueChange={(v) => setParentTaskId(v ?? "")}
              >
                <SelectTrigger id="add-task-parent" className="w-full">
                  <SelectValue placeholder="None (top-level task)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (top-level task)</SelectItem>
                  {parentCandidates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Creating..."
              : initialParentTaskId
                ? "Add Sub-task"
                : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
