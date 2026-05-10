"use client";

import { useState, useCallback, useEffect } from "react";
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

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  parties: Party[];
}

// ---------------------------------------------------------------------------
// EditTaskDialog
// ---------------------------------------------------------------------------

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  parties,
}: EditTaskDialogProps) {
  const updateTask = useStore((s) => s.updateTask);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partyId, setPartyId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate from task data when dialog opens
  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setStartDate(task.start ?? "");
      setEndDate(task.end ?? "");
      setPartyId(task.partyId ?? "");
      setNotes(task.notes ?? "");
      setTitleError("");
      setDateError("");
      setIsSubmitting(false);
    }
  }, [open, task]);

  const handleSubmit = useCallback(async () => {
    if (!task) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Title is required");
      return;
    }
    setTitleError("");

    if (startDate && endDate && startDate > endDate) {
      setDateError("Start date must be before end date");
      return;
    }
    setDateError("");

    setIsSubmitting(true);
    try {
      await updateTask(task.id, {
        title: trimmed,
        start: startDate || null,
        end: endDate || null,
        partyId: partyId || null,
        notes: notes || null,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [task, title, startDate, endDate, partyId, notes, updateTask, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" onKeyDown={handleKeyDown}>
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-title">Title</Label>
            <Input
              id="edit-task-title"
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
              <Label htmlFor="edit-task-start">Start Date</Label>
              <Input
                id="edit-task-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (dateError) setDateError("");
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-end">End Date</Label>
              <Input
                id="edit-task-end"
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
            <Label htmlFor="edit-task-party">Assigned Party</Label>
            <Select value={partyId} onValueChange={(v) => setPartyId(v ?? "")}>
              <SelectTrigger id="edit-task-party" className="w-full">
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

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-notes">Notes</Label>
            <textarea
              id="edit-task-notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
