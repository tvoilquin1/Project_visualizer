"use client";

import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateProject?: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center px-8">
      <div className="rounded-2xl bg-gradient-to-b from-muted to-muted/50 p-5 ring-1 ring-border/50 shadow-sm">
        <ClipboardList className="size-14 text-muted-foreground/60" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">
          No projects yet
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Create your first project to start scheduling tasks and tracking
          progress on the timeline.
        </p>
      </div>
      <Button
        variant="default"
        size="default"
        onClick={onCreateProject}
        className="gap-1.5"
      >
        <Plus className="size-4" />
        New Project
      </Button>
    </div>
  );
}
