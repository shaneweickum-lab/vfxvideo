"use client";

import type { LogEntry, LogLevel } from "@vfxvideo/devtools";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/devtools/copy-button";
import { Button } from "@/components/ui/button";
import { appLog } from "@/lib/devtools/app-log";
import { cn } from "@/lib/utils";

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const LEVEL_STYLE: Record<LogLevel, string> = {
  debug: "text-muted-foreground",
  info: "text-sky-300",
  warn: "text-amber-300",
  error: "text-red-300",
};

export function LogPanel() {
  const [entries, setEntries] = useState<readonly LogEntry[]>(() => appLog.list());
  const [minLevel, setMinLevel] = useState<LogLevel>("debug");

  useEffect(() => appLog.subscribe(() => setEntries(appLog.list())), []);

  const visible = entries.filter((e) => LEVELS.indexOf(e.level) >= LEVELS.indexOf(minLevel));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setMinLevel(l)}
              className={cn(
                "rounded px-2 py-1 font-mono text-xs",
                minLevel === l ? "bg-accent text-foreground" : "text-muted-foreground",
              )}
            >
              {l}+
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            appLog.clear();
            setEntries([]);
          }}
        >
          <Trash2 /> Clear
        </Button>
        <CopyButton label="Copy log" getText={() => JSON.stringify(appLog.list(), null, 2)} />
        <span className="text-xs text-muted-foreground">
          {visible.length} of {entries.length} entries (keeps last {appLog.capacity})
        </span>
      </div>
      <ol className="max-h-[65vh] overflow-auto rounded-lg border font-mono text-xs">
        {visible.length === 0 ? <li className="p-3 text-muted-foreground">No entries.</li> : null}
        {[...visible].reverse().map((e) => (
          <li key={e.seq} className="flex gap-3 border-b px-3 py-1.5 last:border-0">
            <span className="shrink-0 text-muted-foreground">
              {new Date(e.time).toLocaleTimeString()}
            </span>
            <span className={cn("w-12 shrink-0", LEVEL_STYLE[e.level])}>{e.level}</span>
            <span className="w-24 shrink-0 text-muted-foreground">{e.source}</span>
            <span className="min-w-0 break-words">
              {e.message}
              {e.data !== undefined ? (
                <span className="text-muted-foreground"> {JSON.stringify(e.data)}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
