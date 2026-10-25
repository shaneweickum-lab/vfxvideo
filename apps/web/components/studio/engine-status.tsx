"use client";

import { useEngineStatus } from "@/lib/engine";
import { cn } from "@/lib/utils";

export function EngineStatusLabel() {
  const s = useEngineStatus();
  const text =
    s.state === "ready"
      ? `engine: ${s.adapter}`
      : s.state === "error"
        ? `engine: ${s.noWebGpu ? "no WebGPU" : "error"}`
        : `engine: ${s.state === "starting" ? "starting…" : "not started"}`;
  return (
    <span
      className={cn(
        s.state === "error" && "text-destructive",
        s.state === "ready" && "text-foreground",
      )}
      title={s.state === "error" ? s.message : undefined}
    >
      {text}
    </span>
  );
}
