"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { addWorkdays, getWorkdaysBetween } from "@/lib/workdays";
import type { ISODate } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DragMode = "idle" | "creating" | "resizing" | "moving";

export interface DragState {
  mode: DragMode;
  /** Task ID being resized/moved (null for create) */
  taskId: string | null;
  /** Whether resizing left edge (true) or right edge (false) */
  resizeLeft: boolean;
  /** Offset between pointer X and bar left edge during move (px) */
  moveOffsetX: number;
  /** Original start date before gesture */
  originalStart: ISODate | null;
  /** Original end date before gesture */
  originalEnd: ISODate | null;
  /** Column index where drag started (for create) */
  createStartCol: number;
  /** Current column index during drag (for create) */
  createCurrentCol: number;
  /** Current pixel position during resize/move */
  currentPx: number;
  /** Row index (0-based) for creation */
  createRowIndex: number;
}

export interface UseDragInteractionOptions {
  /** Array of workday date strings */
  workdays: ISODate[];
  /** Pixel width per column */
  columnWidth: number;
  /** Container element ref for coordinate mapping */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Called when resize gesture completes */
  onResizeEnd?: (taskId: string, newStart: ISODate, newEnd: ISODate) => void;
  /** Called when move gesture completes */
  onMoveEnd?: (taskId: string, newStart: ISODate, newEnd: ISODate) => void;
  /** Called when drag-to-create starts -> provides selected range */
  onCreateStart?: (startCol: number, endCol: number, rowIndex: number) => void;
  /** Minimum duration in workdays */
  minDuration?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a pixel X position (relative to container) to a workday column index.
 * Clamped to [0, workdays.length].
 */
function pxToCol(px: number, columnWidth: number, workdaysCount: number): number {
  const col = Math.round(px / columnWidth);
  return Math.max(0, Math.min(workdaysCount, col));
}

/**
 * Snap a column index to a workday date.
 * Returns the date at that column index, or null if out of range.
 */
function colToDate(col: number, workdays: ISODate[]): ISODate | null {
  if (col < 0 || col >= workdays.length) return null;
  return workdays[col]!;
}

/**
 * Returns a snapped pair of dates from start/end columns.
 * Preserves order: startCol <= endCol. Minimum duration enforced.
 */
function snapColumns(
  startCol: number,
  endCol: number,
  workdays: ISODate[],
  minDuration: number,
): { start: ISODate; end: ISODate } | null {
  let s = Math.min(startCol, endCol);
  let e = Math.max(startCol, endCol);

  // Enforce minimum duration
  if (e - s < minDuration) {
    e = s + minDuration;
  }

  // Clamp to workday bounds
  s = Math.max(0, Math.min(s, workdays.length));
  e = Math.max(0, Math.min(e, workdays.length));

  if (s >= workdays.length || e > workdays.length) return null;

  const start = workdays[s];
  const end = workdays[e - 1]; // e is exclusive column index

  if (!start || !end) return null;

  return { start, end };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDragInteraction({
  workdays,
  columnWidth = 40,
  containerRef,
  onResizeEnd,
  onMoveEnd,
  onCreateStart,
  minDuration = 1,
}: UseDragInteractionOptions) {
  const [dragState, setDragState] = useState<DragState>({
    mode: "idle",
    taskId: null,
    resizeLeft: false,
    moveOffsetX: 0,
    originalStart: null,
    originalEnd: null,
    createStartCol: 0,
    createCurrentCol: 0,
    currentPx: 0,
    createRowIndex: 0,
  });

  // Refs for drag to avoid stale closures
  const dragRef = useRef<DragState>(dragState);
  dragRef.current = dragState;

  const callbacksRef = useRef({ onResizeEnd, onMoveEnd, onCreateStart });
  callbacksRef.current = { onResizeEnd, onMoveEnd, onCreateStart };

  // ----- Pointer event handlers -----

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const state = dragRef.current;
      if (state.mode === "idle") return;

      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left + container.scrollLeft;

      if (state.mode === "creating") {
        const col = pxToCol(px, columnWidth, workdays.length);
        setDragState((prev) => ({
          ...prev,
          createCurrentCol: col,
          currentPx: px,
        }));
      } else if (state.mode === "resizing") {
        setDragState((prev) => ({
          ...prev,
          currentPx: px,
        }));
      } else if (state.mode === "moving") {
        setDragState((prev) => ({
          ...prev,
          currentPx: px,
        }));
      }
    },
    [columnWidth, workdays.length, containerRef],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const state = dragRef.current;
      if (state.mode === "idle") return;

      e.preventDefault();
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);

      if (state.mode === "creating") {
        const startCol = Math.min(state.createStartCol, state.createCurrentCol);
        const endCol = Math.max(state.createStartCol, state.createCurrentCol);

        // Only create if dragged at least minDuration
        if (endCol - startCol >= minDuration) {
          callbacksRef.current.onCreateStart?.(
            startCol,
            endCol,
            state.createRowIndex,
          );
        }

        setDragState({
          mode: "idle",
          taskId: null,
          resizeLeft: false,
          moveOffsetX: 0,
          originalStart: null,
          originalEnd: null,
          createStartCol: 0,
          createCurrentCol: 0,
          currentPx: 0,
          createRowIndex: 0,
        });
      } else if (
        state.mode === "resizing" &&
        state.taskId &&
        state.originalStart !== null &&
        state.originalEnd !== null
      ) {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const px = e.clientX - rect.left + container.scrollLeft;
        const col = pxToCol(px, columnWidth, workdays.length);

        if (state.resizeLeft) {
          // Resizing left edge: new start = col, end stays same
          const snapped = snapColumns(
            col,
            workdays.indexOf(state.originalEnd),
            workdays,
            minDuration,
          );
          if (snapped) {
            callbacksRef.current.onResizeEnd?.(state.taskId, snapped.start, snapped.end);
          }
        } else {
          // Resizing right edge: start stays same, new end = col
          const snapped = snapColumns(
            workdays.indexOf(state.originalStart),
            col,
            workdays,
            minDuration,
          );
          if (snapped) {
            callbacksRef.current.onResizeEnd?.(state.taskId, snapped.start, snapped.end);
          }
        }

        setDragState({
          mode: "idle",
          taskId: null,
          resizeLeft: false,
          moveOffsetX: 0,
          originalStart: null,
          originalEnd: null,
          createStartCol: 0,
          createCurrentCol: 0,
          currentPx: 0,
          createRowIndex: 0,
        });
      } else if (
        state.mode === "moving" &&
        state.taskId &&
        state.originalStart !== null &&
        state.originalEnd !== null
      ) {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const px = e.clientX - rect.left + container.scrollLeft;
        const centerPx = px - state.moveOffsetX + (columnWidth * (workdays.indexOf(state.originalEnd) - workdays.indexOf(state.originalStart))) / 2;
        const col = pxToCol(centerPx, columnWidth, workdays.length);

        const origStartIdx = workdays.indexOf(state.originalStart);
        const origEndIdx = workdays.indexOf(state.originalEnd);
        const duration = Math.max(minDuration, origEndIdx - origStartIdx);

        let newStartCol = col - Math.round((origEndIdx - origStartIdx) / 2);
        if (newStartCol < 0) newStartCol = 0;

        let newEndCol = newStartCol + duration;
        if (newEndCol > workdays.length) {
          newEndCol = workdays.length;
          newStartCol = Math.max(0, newEndCol - duration);
        }

        // Snap the full bar
        const snapped = snapColumns(
          newStartCol,
          newEndCol,
          workdays,
          minDuration,
        );
        if (snapped) {
          callbacksRef.current.onMoveEnd?.(state.taskId, snapped.start, snapped.end);
        }

        setDragState({
          mode: "idle",
          taskId: null,
          resizeLeft: false,
          moveOffsetX: 0,
          originalStart: null,
          originalEnd: null,
          createStartCol: 0,
          createCurrentCol: 0,
          currentPx: 0,
          createRowIndex: 0,
        });
      }
    },
    [columnWidth, workdays, containerRef, minDuration, handlePointerMove],
  );

  // ----- Public API -----

  /** Start drag-to-create on an empty row */
  const startCreate = useCallback(
    (clientX: number, clientY: number, rowIndex: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const px = clientX - rect.left + container.scrollLeft;
      const col = pxToCol(px, columnWidth, workdays.length);

      setDragState({
        mode: "creating",
        taskId: null,
        resizeLeft: false,
        moveOffsetX: 0,
        originalStart: null,
        originalEnd: null,
        createStartCol: col,
        createCurrentCol: col,
        currentPx: px,
        createRowIndex: rowIndex,
      });

      document.addEventListener("pointermove", handlePointerMove, {
        passive: false,
      });
      document.addEventListener("pointerup", handlePointerUp);
    },
    [columnWidth, workdays.length, containerRef, handlePointerMove, handlePointerUp],
  );

  /** Start resizing a task bar */
  const startResize = useCallback(
    (
      taskId: string,
      resizeLeft: boolean,
      clientX: number,
      originalStart: ISODate,
      originalEnd: ISODate,
    ) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const px = clientX - rect.left + container.scrollLeft;

      setDragState({
        mode: "resizing",
        taskId,
        resizeLeft,
        moveOffsetX: 0,
        originalStart,
        originalEnd,
        createStartCol: 0,
        createCurrentCol: 0,
        currentPx: px,
        createRowIndex: 0,
      });

      document.addEventListener("pointermove", handlePointerMove, {
        passive: false,
      });
      document.addEventListener("pointerup", handlePointerUp);
    },
    [containerRef, handlePointerMove, handlePointerUp],
  );

  /** Start moving a task bar */
  const startMove = useCallback(
    (
      taskId: string,
      clientX: number,
      offsetX: number,
      originalStart: ISODate,
      originalEnd: ISODate,
    ) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const px = clientX - rect.left + container.scrollLeft;

      setDragState({
        mode: "moving",
        taskId,
        resizeLeft: false,
        moveOffsetX: offsetX,
        originalStart,
        originalEnd,
        createStartCol: 0,
        createCurrentCol: 0,
        currentPx: px,
        createRowIndex: 0,
      });

      document.addEventListener("pointermove", handlePointerMove, {
        passive: false,
      });
      document.addEventListener("pointerup", handlePointerUp);
    },
    [containerRef, handlePointerMove, handlePointerUp],
  );

  /** Cancel current drag */
  const cancelDrag = useCallback(() => {
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    setDragState({
      mode: "idle",
      taskId: null,
      resizeLeft: false,
      moveOffsetX: 0,
      originalStart: null,
      originalEnd: null,
      createStartCol: 0,
      createCurrentCol: 0,
      currentPx: 0,
      createRowIndex: 0,
    });
  }, [handlePointerMove, handlePointerUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // ----- Selection rect for drag-to-create -----

  const getSelectionRect = useCallback(() => {
    if (dragState.mode !== "creating") return null;

    const left = Math.min(dragState.createStartCol, dragState.createCurrentCol) * columnWidth;
    const width =
      Math.abs(dragState.createCurrentCol - dragState.createStartCol) * columnWidth;

    return { left, width };
  }, [dragState, columnWidth]);

  return {
    dragState,
    startCreate,
    startResize,
    startMove,
    cancelDrag,
    getSelectionRect,
  };
}
