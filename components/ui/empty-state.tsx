import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Optional call-to-action rendered below the description, e.g. an "Add team" button. */
  action?: ReactNode;
  className?: string;
}

/**
 * Shared "no data yet" state for admin tables/lists. Used wherever a page
 * would otherwise render an empty table, a blank space, or a single bare
 * sentence for a first-run/zero-data moment (Students' Teams/Categories
 * tabs, Events/Stages lists, Results scoreboard) — see audit 3.2.
 *
 * Usage:
 *   {teams.length === 0 ? (
 *     <EmptyState
 *       icon={<svg .../>}
 *       title="No teams yet"
 *       description="Add your first team above to start assigning students and tracking points."
 *     />
 *   ) : (
 *     <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">...</div>
 *   )}
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02]",
        className
      )}
    >
      <div className="h-11 w-11 rounded-full bg-white/5 flex items-center justify-center mb-3 text-slate-500">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
