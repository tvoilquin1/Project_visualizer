"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ProjectListItemProps {
  name: string;
  color: string;
  isActive?: boolean;
  defaultExpanded?: boolean;
}

export function ProjectListItem({
  name,
  color,
  isActive = false,
  defaultExpanded = true,
}: ProjectListItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "hover:bg-muted text-foreground"
      )}
      onClick={() => {/* placeholder: select project */}}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate flex-1">{name}</span>
      <span
        className="shrink-0 text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
      >
        {expanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
      </span>
    </button>
  );
}
