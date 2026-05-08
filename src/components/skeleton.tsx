import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md",
        className
      )}
    />
  );
}

/**
 * TimelineSkeleton — A full-width skeleton placeholder for the timeline area.
 */
export function TimelineSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-12 items-center border-b border-border px-4">
        <Skeleton className="h-3.5 w-20" />
      </div>
      <div className="flex flex-1 gap-0 p-4">
        <div className="w-[260px] flex-shrink-0 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-5/6" />
          <Skeleton className="h-8 w-2/3" />
        </div>
        <div className="flex-1 space-y-3 pl-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * SidebarSkeleton — A skeleton placeholder for the project sidebar.
 */
export function SidebarSkeleton() {
  return (
    <aside
      className="flex flex-col border-r border-border bg-sidebar text-sidebar-foreground overflow-y-auto p-4 gap-4"
      style={{
        width: "var(--sidebar-width, 260px)",
        minWidth: "var(--sidebar-width, 260px)",
      }}
    >
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
      <div className="flex-1" />
      <Skeleton className="h-8 w-full" />
    </aside>
  );
}
