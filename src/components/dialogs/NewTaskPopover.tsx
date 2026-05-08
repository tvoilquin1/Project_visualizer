"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
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
import type { Party } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewTaskPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The anchor element the popover positions relative to */
  anchorEl: HTMLElement | null;
  startDate: string;
  endDate: string;
  projectId: string;
  parties: Party[];
  parentTaskId?: string | null;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// NewTaskPopover
// ---------------------------------------------------------------------------

export function NewTaskPopover({
  open,
  onOpenChange,
  anchorEl,
  startDate,
  endDate,
  projectId,
  parties,
  parentTaskId,
  onComplete,
}: NewTaskPopoverProps) {
  const [title, setTitle] = useState("");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when popover opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setPartyId(null);
      setTitleError("");
      setIsSubmitting(false);
    }
  }, [open]);

  // Import store dynamically to avoid circular issues — use lazy import
  // Actually the store can be imported directly
  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Title is required");
      return;
    }
    setTitleError("");
    setIsSubmitting(true);

    try {
      const { useStore } = await import("@/lib/store");
      // Calculate order: count existing tasks for this project and add 1
      const state = useStore.getState();
      const projectTasks = state.tasks.filter(
        (t) => t.projectId === projectId
      );
      const maxOrder = projectTasks.reduce(
        (max, t) => Math.max(max, t.order),
        -1
      );

      await useStore.getState().createTask({
        projectId,
        title: trimmed,
        start: startDate,
        end: endDate,
        partyId: partyId ?? undefined,
        order: maxOrder + 1,
        parentTaskId: parentTaskId ?? undefined,
      });

      onOpenChange(false);
      onComplete();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [title, partyId, projectId, startDate, endDate, parentTaskId, onOpenChange, onComplete]);

  if (!anchorEl) return null;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* We use the anchorEl to position via a portal-positioned popover;
          the popover primitives need a trigger in the DOM. We render a hidden
          trigger that is programmatically positioned. */}
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72"
        // Position relative to the anchor element
        style={{
          position: "fixed",
          top: anchorEl.getBoundingClientRect().bottom + 4,
          left: anchorEl.getBoundingClientRect().left,
        }}
      >
        <PopoverHeader>
          <PopoverTitle>New Task</PopoverTitle>
        </PopoverHeader>

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
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

        {/* Party Select */}
        <div className="space-y-1.5">
          <Label htmlFor="task-party">Party</Label>
          <Select
            value={partyId ?? ""}
            onValueChange={(v) => setPartyId(v || null)}
          >
            <SelectTrigger id="task-party" className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {parties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range (read-only) */}
        <div className="space-y-1.5">
          <Label>Date Range</Label>
          <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
            {startDate} → {endDate}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
