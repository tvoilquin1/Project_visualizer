"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartyLegend } from "@/components/sidebar/PartyLegend";
import { ProjectListItem } from "@/components/sidebar/ProjectListItem";
import { EmptyState } from "@/components/empty-state";

// --- Mock data for placeholder rendering ---

// Use a nullable typed variable so TS narrows correctly
const MOCK_ACTIVE_PROJECT: { name: string; color: string } | null = null;

const MOCK_OTHER_PROJECTS: { id: string; name: string; color: string }[] = [
  // Empty for now — will populate from store later
];

// Example parties for the PartyLegend preview when a project is active
const MOCK_PARTIES = [
  { id: "p1", name: "Dev", color: "#3b82f6" },
  { id: "p2", name: "Design", color: "#ec4899" },
  { id: "p3", name: "PM", color: "#f59e0b" },
];

export function ProjectSidebar() {
  return (
    <aside
      className="flex flex-col border-r border-border bg-sidebar text-sidebar-foreground overflow-y-auto"
      style={{ width: "var(--sidebar-width, 260px)", minWidth: "var(--sidebar-width, 260px)" }}
    >
      {/* Active Project Section */}
      <div className="px-3 pt-4 pb-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Active Project
        </h2>
        {MOCK_ACTIVE_PROJECT ? (
          <ProjectListItem
            name={MOCK_ACTIVE_PROJECT.name}
            color={MOCK_ACTIVE_PROJECT.color}
            isActive
          />
        ) : (
          <p className="text-xs text-muted-foreground px-3 py-2 italic">
            Select a project
          </p>
        )}
      </div>

      {/* Other Projects Section */}
      <div className="px-3 pb-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Other Projects
        </h2>
        {MOCK_OTHER_PROJECTS.length > 0 ? (
          <div className="space-y-0.5">
            {MOCK_OTHER_PROJECTS.map((p) => (
              <ProjectListItem key={p.id} name={p.name} color={p.color} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground px-3 py-2 italic">
            No other projects
          </p>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Party Legend — shown when active project exists */}
      {MOCK_ACTIVE_PROJECT && <PartyLegend parties={MOCK_PARTIES} />}

      {/* New Project Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={() => {/* placeholder */}}
        >
          <Plus className="size-3.5" />
          New Project
        </Button>
      </div>
    </aside>
  );
}
