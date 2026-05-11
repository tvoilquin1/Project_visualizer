"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/header";
import { ProjectSidebar } from "@/components/sidebar/ProjectSidebar";
import { Timeline } from "@/components/scheduler/Timeline";
import { AddTaskDialog } from "@/components/dialogs/AddTaskDialog";
import { EditTaskDialog } from "@/components/dialogs/EditTaskDialog";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { Button } from "@/components/ui/button";
import {
  useActiveProjectId,
  useTasks,
  useParties,
  useCollapsedTaskIds,
  useStore,
} from "@/lib/store";
import { generateLabels } from "@/lib/labels";
import type { TaskLabel } from "@/components/scheduler/DescriptionColumn";
import type { DateSegment } from "@/components/scheduler/Timeline";
import { nextWorkday } from "@/lib/workdays";

export default function Home() {
  const activeProjectId = useActiveProjectId();
  const tasks = useTasks(activeProjectId ?? "");
  const parties = useParties(activeProjectId ?? "");
  const collapsedIds = useCollapsedTaskIds();
  const toggleCollapse = useStore((s) => s.toggleCollapseTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const init = useStore((s) => s.init);
  const allTasks = useStore((s) => s.tasks);
  const hasActiveProject = activeProjectId !== null;

  // Dialog states
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addSubtaskParentId, setAddSubtaskParentId] = useState<string | null>(
    null
  );
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [dragCreateDates, setDragCreateDates] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  // Load data from IndexedDB on mount
  useEffect(() => {
    init();
  }, [init]);

  // Handlers
  const handleAddTask = useCallback(() => {
    setAddSubtaskParentId(null);
    setDragCreateDates(null);
    setAddTaskOpen(true);
  }, []);

  const handleAddSubtask = useCallback((parentTaskId: string) => {
    setAddSubtaskParentId(parentTaskId);
    setDragCreateDates(null);
    setAddTaskOpen(true);
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    setEditTaskId(taskId);
    setEditTaskOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      // Simple confirm before deleting
      const task = allTasks.find((t) => t.id === taskId);
      if (
        task &&
        window.confirm(`Delete "${task.title}" and all its sub-tasks?`)
      ) {
        await deleteTask(taskId);
      }
    },
    [allTasks, deleteTask]
  );

  const handleDragCreate = useCallback(
    (startDate: string, endDate: string) => {
      setAddSubtaskParentId(null);
      setDragCreateDates({ start: startDate, end: endDate });
      setAddTaskOpen(true);
    },
    []
  );

  // Get the task being edited
  const editingTask = useMemo(() => {
    if (!editTaskId) return null;
    return allTasks.find((t) => t.id === editTaskId) ?? null;
  }, [editTaskId, allTasks]);

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

    // --- Segment computation (bottom-up) ---
    // Merge overlapping/adjacent segments, keeping gaps for non-adjacent ones
    function mergeSegments(segs: DateSegment[]): DateSegment[] {
      if (segs.length === 0) return [];
      const sorted = [...segs].sort((a, b) => a.start.localeCompare(b.start));
      const merged: DateSegment[] = [{ ...sorted[0]! }];
      for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1]!;
        const curr = sorted[i]!;
        // Merge if overlapping or workday-adjacent (e.g. Fri → Mon)
        if (curr.start <= last.end || curr.start <= nextWorkday(last.end)) {
          if (curr.end > last.end) last.end = curr.end;
        } else {
          merged.push({ ...curr });
        }
      }
      return merged;
    }

    // Build a lookup: taskId → set of direct children ids
    const childrenOf = new Map<string, string[]>();
    for (const t of tasks) {
      const pid = t.parentTaskId ?? "__root__";
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(t.id);
    }

    // Process in reverse tree-order (leaves before parents)
    const segmentMap = new Map<string, DateSegment[]>();
    for (let i = taskLabels.length - 1; i >= 0; i--) {
      const label = taskLabels[i]!;
      const task = tasks.find((t) => t.id === label.id);
      const kids = childrenOf.get(label.id) ?? [];

      if (kids.length === 0) {
        // Leaf task — use own dates
        if (task?.start && task?.end) {
          segmentMap.set(label.id, [{ start: task.start, end: task.end }]);
        } else {
          segmentMap.set(label.id, []);
        }
      } else {
        // Parent task — aggregate children's segments
        const allSegs: DateSegment[] = [];
        for (const kidId of kids) {
          const kidSegs = segmentMap.get(kidId) ?? [];
          allSegs.push(...kidSegs);
        }
        let merged = mergeSegments(allSegs);

        // Clamp to parent's own date boundaries if specified
        if (task?.start || task?.end) {
          merged = merged
            .map((seg) => ({
              start: task?.start && seg.start < task.start ? task.start : seg.start,
              end: task?.end && seg.end > task.end ? task.end : seg.end,
            }))
            .filter((seg) => seg.start <= seg.end);
        }
        segmentMap.set(label.id, merged);
      }
    }

    // Build flat tasks with segments for Timeline
    const flatTasks = taskLabels.map((l) => {
      const task = tasks.find((t) => t.id === l.id);
      const kids = childrenOf.get(l.id) ?? [];
      return {
        id: l.id,
        title: l.title,
        parentTaskId: l.parentTaskId,
        depth: l.depth,
        start: task?.start ?? null,
        end: task?.end ?? null,
        segments: segmentMap.get(l.id) ?? [],
        isParent: kids.length > 0,
      };
    });

    return { labelMap, taskLabels, flatTasks };
  }, [tasks]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar — visible only when a project is active */}
          {hasActiveProject && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 text-xs"
                onClick={handleAddTask}
                aria-label="Add new task"
              >
                <Plus className="size-3.5" />
                Add Task
              </Button>
              <span className="text-xs text-muted-foreground">
                Right-click a task to add sub-tasks, edit, or delete
              </span>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <Timeline
              hasActiveProject={hasActiveProject}
              tasks={flatTasks}
              labels={taskLabels}
              collapsedIds={collapsedIds}
              onToggleCollapse={toggleCollapse}
              onAddSubtask={handleAddSubtask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onDragCreate={handleDragCreate}
              onCreateProject={() => setNewProjectOpen(true)}
            />
          </div>
        </main>
      </div>

      {/* Add Task / Sub-task Dialog */}
      {activeProjectId && (() => {
        // Compute parent boundary if adding a subtask under a dated parent
        const parentTask = addSubtaskParentId
          ? allTasks.find((t) => t.id === addSubtaskParentId)
          : null;
        const parentBoundary = parentTask?.start || parentTask?.end
          ? { start: parentTask.start ?? null, end: parentTask.end ?? null }
          : null;
        return (
          <AddTaskDialog
            open={addTaskOpen}
            onOpenChange={setAddTaskOpen}
            projectId={activeProjectId}
            parties={parties}
            tasks={allTasks}
            parentTaskId={addSubtaskParentId}
            defaultStart={dragCreateDates?.start}
            defaultEnd={dragCreateDates?.end}
            parentBoundary={parentBoundary}
          />
        );
      })()}

      {/* Edit Task Dialog */}
      {activeProjectId && (
        <EditTaskDialog
          open={editTaskOpen}
          onOpenChange={setEditTaskOpen}
          task={editingTask}
          parties={parties}
        />
      )}

      {/* New Project Dialog (from empty state) */}
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
      />
    </div>
  );
}
