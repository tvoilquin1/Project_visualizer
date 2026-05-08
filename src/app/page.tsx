"use client";

import { useMemo, useEffect } from "react";
import { Header } from "@/components/header";
import { ProjectSidebar } from "@/components/sidebar/ProjectSidebar";
import { Timeline } from "@/components/scheduler/Timeline";
import { useActiveProjectId, useTasks, useCollapsedTaskIds, useStore } from "@/lib/store";
import { generateLabels } from "@/lib/labels";
import type { TaskLabel } from "@/components/scheduler/DescriptionColumn";

export default function Home() {
  const activeProjectId = useActiveProjectId();
  const tasks = useTasks(activeProjectId ?? "");
  const collapsedIds = useCollapsedTaskIds();
  const toggleCollapse = useStore((s) => s.toggleCollapseTask);
  const init = useStore((s) => s.init);
  const hasActiveProject = activeProjectId !== null;

  // Load data from IndexedDB on mount
  useEffect(() => {
    init();
  }, [init]);

  // Build label map and task tree info for display
  const { labelMap, taskLabels, flatTasks } = useMemo(() => {
    const labelMap = generateLabels(tasks);

    // Build a depth map by walking the tree
    const parentMap = new Map<string, string | null>();
    for (const t of tasks) {
      parentMap.set(t.id, t.parentTaskId ?? null);
    }

    function getDepth(taskId: string): number {
      let depth = 0;
      let current: string | null = taskId;
      while (current) {
        const parent = parentMap.get(current);
        if (parent) {
          depth++;
          current = parent;
        } else {
          current = null;
        }
      }
      return depth;
    }

    // Sort tasks by order within each level for correct display order
    const sortedTasks = [...tasks].sort((a, b) => {
      // Group by parent first, then sort by order within each group
      if ((a.parentTaskId ?? null) !== (b.parentTaskId ?? null)) {
        // For display, we need the tree order — preserve from sorted tasks
        // Build a tree ordering: walk the tree in-order
        return 0; // We'll rebuild correctly below
      }
      return a.order - b.order;
    });

    // Build task labels flat list in tree order
    const taskLabels: TaskLabel[] = [];
    const visited = new Set<string>();

    function walkTree(parentId: string | null) {
      const children = tasks
        .filter((t) => (t.parentTaskId ?? null) === parentId)
        .sort((a, b) => a.order - b.order);

      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        const depth = getDepth(child.id);
        taskLabels.push({
          id: child.id,
          label: labelMap.get(child.id) ?? "",
          title: child.title,
          depth,
          parentTaskId: child.parentTaskId ?? null,
        });
        walkTree(child.id);
      }
    }

    walkTree(null);

    // Also build flat tasks in the same order for timeline bars
    const flatTasks = taskLabels.map((l) => ({
      id: l.id,
      title: l.title,
      parentTaskId: l.parentTaskId,
      depth: l.depth,
      start: tasks.find((t) => t.id === l.id)?.start ?? null,
      end: tasks.find((t) => t.id === l.id)?.end ?? null,
    }));

    return { labelMap, taskLabels, flatTasks };
  }, [tasks]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <main className="flex-1 overflow-auto">
          <Timeline
            hasActiveProject={hasActiveProject}
            tasks={flatTasks}
            labels={taskLabels}
            collapsedIds={collapsedIds}
            onToggleCollapse={toggleCollapse}
          />
        </main>
      </div>
    </div>
  );
}
