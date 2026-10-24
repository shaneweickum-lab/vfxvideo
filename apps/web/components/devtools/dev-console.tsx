"use client";

import Link from "next/link";
import { Tabs } from "radix-ui";
import { useEffect } from "react";

import { CapabilitiesPanel } from "@/components/devtools/capabilities-panel";
import { LogPanel } from "@/components/devtools/log-panel";
import { PenTester } from "@/components/devtools/pen-tester";
import { BUILD_INFO } from "@/lib/build-info";
import { installGlobalLogCapture } from "@/lib/devtools/app-log";

const TABS = [
  { id: "capabilities", label: "Capabilities" },
  { id: "pen", label: "Pen tester" },
  { id: "logs", label: "Logs" },
] as const;

export function DevConsole() {
  useEffect(() => installGlobalLogCapture(), []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300">
            Development debugger · not part of production builds
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">VFXVideo Debugger</h1>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 font-mono text-xs text-muted-foreground">
          <dt>batch</dt>
          <dd className="text-foreground">
            Stage {BUILD_INFO.stage} · {BUILD_INFO.batch}
          </dd>
          <dt>commit</dt>
          <dd className="text-foreground">{BUILD_INFO.gitSha.slice(0, 7)}</dd>
          <dt>env</dt>
          <dd className="text-foreground">{BUILD_INFO.deployEnv}</dd>
        </dl>
      </header>

      <Tabs.Root defaultValue="capabilities" className="space-y-4">
        <Tabs.List className="flex items-center gap-1 border-b">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
            >
              {t.label}
            </Tabs.Trigger>
          ))}
          <Link
            href="/"
            className="ml-auto px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to studio
          </Link>
        </Tabs.List>
        <Tabs.Content value="capabilities">
          <CapabilitiesPanel />
        </Tabs.Content>
        <Tabs.Content value="pen" forceMount className="data-[state=inactive]:hidden">
          <PenTester />
        </Tabs.Content>
        <Tabs.Content value="logs">
          <LogPanel />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
