"use client";

import { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
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
import { useStore } from "@/lib/store";

// ---------------------------------------------------------------------------
// Predefined color swatches
// ---------------------------------------------------------------------------

const PARTY_COLORS = [
  "#22c55e", // green
  "#eab308", // yellow
  "#3b82f6", // blue
  "#ef4444", // red
  "#a855f7", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartyEntry {
  id: string;
  name: string;
  color: string;
}

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let partyIdCounter = 0;
const freshPartyId = () => `party-entry-${++partyIdCounter}`;

function makeEmptyParty(): PartyEntry {
  return {
    id: freshPartyId(),
    name: "",
    color: PARTY_COLORS[partyIdCounter % PARTY_COLORS.length] ?? "#22c55e",
  };
}

// ---------------------------------------------------------------------------
// ColorPicker sub-component
// ---------------------------------------------------------------------------

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {PARTY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className="size-5 rounded-full border-2 border-transparent transition-all hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          style={{
            backgroundColor: c,
            borderColor: c === value ? "var(--color-ring)" : "transparent",
            outline: c === value ? "2px solid oklch(0.708 0 0 / 0.4)" : undefined,
          }}
          onClick={() => onChange(c)}
          aria-label={`Select color ${c}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewProjectDialog
// ---------------------------------------------------------------------------

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const createProject = useStore((s) => s.createProject);

  const [projectName, setProjectName] = useState("");
  const [parties, setParties] = useState<PartyEntry[]>([makeEmptyParty()]);
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        // Reset state on close
        setProjectName("");
        setParties([makeEmptyParty()]);
        setNameError("");
        setIsSubmitting(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  // Add another party row
  const addParty = useCallback(() => {
    setParties((prev) => [...prev, makeEmptyParty()]);
  }, []);

  // Remove a party row
  const removeParty = useCallback((id: string) => {
    setParties((prev) => {
      // Always keep at least one
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  // Update a party field
  const updateParty = useCallback(
    (id: string, field: "name" | "color", value: string) => {
      setParties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  // Submit
  const handleSubmit = useCallback(async () => {
    // Validate project name
    const trimmed = projectName.trim();
    if (!trimmed) {
      setNameError("Project name is required");
      return;
    }
    setNameError("");

    setIsSubmitting(true);
    try {
      // Filter out parties with empty names (they're optional)
      const initialParties = parties
        .filter((p) => p.name.trim().length > 0)
        .map((p) => ({ name: p.name.trim(), color: p.color }));

      await createProject(trimmed, initialParties);

      // Close dialog — reset happens in handleOpenChange
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [projectName, parties, createProject, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a new project with optional party / stakeholder colours.
          </DialogDescription>
        </DialogHeader>

        {/* Project Name */}
        <div className="space-y-1.5">
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            placeholder="e.g. Website Redesign"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              if (nameError) setNameError("");
            }}
            aria-invalid={!!nameError}
          />
          {nameError && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
        </div>

        {/* Parties Section */}
        <div className="space-y-3">
          <Label>Initial Parties</Label>

          {parties.map((party, index) => (
            <div
              key={party.id}
              className="flex items-start gap-2 rounded-lg border border-border p-2.5 shadow-sm"
            >
              {/* Party name */}
              <div className="flex-1 space-y-1.5">
                <Input
                  placeholder={`Party ${index + 1} name`}
                  value={party.name}
                  onChange={(e) =>
                    updateParty(party.id, "name", e.target.value)
                  }
                  className="h-7 text-xs"
                />
                {/* Color picker */}
                <ColorPicker
                  value={party.color}
                  onChange={(c) => updateParty(party.id, "color", c)}
                />
              </div>

              {/* Color chip preview */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <span
                  className="size-6 rounded-md border border-border"
                  style={{ backgroundColor: party.color }}
                />
                <span className="text-[10px] text-muted-foreground font-mono">
                  {party.color}
                </span>
              </div>

              {/* Remove button */}
              {parties.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 -mt-0.5"
                  onClick={() => removeParty(party.id)}
                  aria-label="Remove party"
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}

          {/* Add another party */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1 text-xs"
            onClick={addParty}
          >
            <Plus className="size-3" />
            Add another party
          </Button>
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
