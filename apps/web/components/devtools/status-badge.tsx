import type { CapabilityStatus } from "@vfxvideo/devtools";

import { cn } from "@/lib/utils";

const STYLES: Record<CapabilityStatus, string> = {
  yes: "bg-emerald-500/15 text-emerald-300",
  partial: "bg-amber-500/15 text-amber-300",
  no: "bg-red-500/15 text-red-300",
  unknown: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: CapabilityStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-16 justify-center rounded px-1.5 py-0.5 font-mono text-[11px] uppercase",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
