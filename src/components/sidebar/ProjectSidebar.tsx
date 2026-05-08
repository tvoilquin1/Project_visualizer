"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartyLegend } from "@/components/sidebar/PartyLegend";
import { ProjectListItem } from "@/components/sidebar/ProjectListItem";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { useStore } from "@/lib/store";

export function ProjectSidebar() {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Store data
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const tasks = useStore((s) => s.tasks);
  const parties = useStore((s) => s.parties);
  const switchProject = useStore((s) => s.switchProject);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const otherProjects = projects.filter((p) => p.id !== activeProjectId);
  const activeParties = parties.filter(
    (p) => p.projectId === activeProjectId
  );

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
  }, []);

  return (
    <>
      <aside
        role="navigation"
        aria-label="Project sidebar"
        className="flex flex-col border-r border-border bg-sidebar text-sidebar-foreground overflow-y-auto"
        style={{
          width: "var(--sidebar-width, 260px)",
          minWidth: "var(--sidebar-width, 260px)",
        }}
      >
        {/* Active Project Section */}
        <div className="px-3 pt-4 pb-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Active Project
          </h2>
          {activeProject ? (
            <ProjectListItem
              name={activeProject.name}
              color={activeProject.parties[0]?.color ?? "#6366f1"}
              isActive
            />
          ) : (
            <p className="text-xs text-muted-foreground px-3 py-2 italic">
              {projects.length === 0
                ? "No projects yet"
                : "Select a project"}
            </p>
          )}
        </div>

        {/* Other Projects Section */}
        <div className="px-3 pb-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Other Projects
          </h2>
          {otherProjects.length > 0 ? (
            <div className="space-y-0.5" role="list" aria-label="Other projects">
              {otherProjects.map((p) => (
                <div key={p.id} role="listitem">
                  <button
                    className="w-full text-left"
                    onClick={() => switchProject(p.id)}
                    aria-label={`Switch to project: ${p.name}`}
                  >
                    <ProjectListItem
                      name={p.name}
                      color={p.parties[0]?.color ?? "#6366f1"}
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-3 py-2 italic">
              {projects.length === 0
                ? "Create your first project"
                : "No other projects"}
            </p>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Party Legend */}
        {activeProject && activeParties.length > 0 && (
          <PartyLegend parties={activeParties} />
        )}

        {/* New Project Button */}
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => setDialogOpen(true)}
            aria-label="Create new project"
          >
            <Plus className="size-3.5" />
            New Project
          </Button>
        </div>
      </aside>

      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
      />
    </>
  );
}
