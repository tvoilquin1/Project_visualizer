"use client";

import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-muted p-6">
        <ClipboardList className="size-12 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          No projects yet
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Create your first project to start scheduling tasks and tracking
          progress on the timeline.
        </p>
      </div>
      <Button variant="default" size="sm" onClick={() => {/* placeholder */}}>
        + New Project
      </Button>
    </div>
  );
}
