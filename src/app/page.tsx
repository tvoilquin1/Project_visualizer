"use client";

import { Header } from "@/components/header";
import { ProjectSidebar } from "@/components/sidebar/ProjectSidebar";
import { Timeline } from "@/components/scheduler/Timeline";
import { useActiveProjectId, useTasks, useCollapsedTaskIds, useStore } from "@/lib/store";

export default function Home() {
  const activeProjectId = useActiveProjectId();
  const tasks = useTasks(activeProjectId ?? "");
  const collapsedIds = useCollapsedTaskIds();
  const toggleCollapse = useStore((s) => s.toggleCollapseTask);
  const hasActiveProject = activeProjectId !== null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <main className="flex-1 overflow-auto">
          <Timeline
            hasActiveProject={hasActiveProject}
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              parentTaskId: t.parentTaskId ?? null,
              depth: 0,
              start: t.start ?? null,
              end: t.end ?? null,
            }))}
            collapsedIds={collapsedIds}
            onToggleCollapse={toggleCollapse}
          />
        </main>
      </div>
    </div>
  );
}
