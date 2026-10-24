"use client";

import {
  type Capability,
  type CapabilityGroup,
  type CapabilityReport,
  probeCapabilities,
} from "@vfxvideo/devtools";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CopyButton } from "@/components/devtools/copy-button";
import { StatusBadge } from "@/components/devtools/status-badge";
import { Button } from "@/components/ui/button";
import { BUILD_INFO } from "@/lib/build-info";
import { appLog } from "@/lib/devtools/app-log";
import { probeBrowserCapabilities } from "@/lib/devtools/browser-capabilities";

const GROUPS: { id: CapabilityGroup; label: string }[] = [
  { id: "gpu", label: "GPU" },
  { id: "media", label: "Video and audio" },
  { id: "storage", label: "Storage" },
  { id: "compute", label: "Compute" },
  { id: "display", label: "Display" },
  { id: "input", label: "Input" },
];

interface FullReport extends CapabilityReport {
  userAgent: string;
  build: typeof BUILD_INFO;
}

async function probeAll(): Promise<FullReport> {
  const started = performance.now();
  const engine = await probeCapabilities();
  const report: FullReport = {
    ...engine,
    capabilities: [...engine.capabilities, ...probeBrowserCapabilities()],
    userAgent: navigator.userAgent,
    build: BUILD_INFO,
  };
  const missing = report.capabilities.filter((c) => c.status === "no").map((c) => c.id);
  appLog.info("capabilities", `Probe finished in ${Math.round(performance.now() - started)} ms`, {
    missing,
  });
  return report;
}

export function CapabilitiesPanel() {
  const [report, setReport] = useState<FullReport | null>(null);

  const rerun = useCallback(() => {
    setReport(null);
    void probeAll().then(setReport);
  }, []);

  useEffect(() => {
    void probeAll().then(setReport);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={rerun}>
          <RefreshCw /> Re-run
        </Button>
        {report ? (
          <CopyButton label="Copy report" getText={() => JSON.stringify(report, null, 2)} />
        ) : null}
        <span className="text-xs text-muted-foreground">
          {report ? `Probed ${new Date(report.probedAt).toLocaleTimeString()}` : "Probing…"}
        </span>
      </div>

      {report?.gpu ? (
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">GPU adapter</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 font-mono text-xs">
            <Row k="vendor" v={report.gpu.vendor || "(hidden)"} />
            <Row k="architecture" v={report.gpu.architecture || "(hidden)"} />
            <Row k="canvas format" v={report.gpu.preferredCanvasFormat} />
            {Object.entries(report.gpu.limits).map(([k, v]) => (
              <Row key={k} k={k} v={v.toLocaleString()} />
            ))}
            <Row k="features" v={report.gpu.features.join(", ") || "(none)"} />
          </dl>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <CapabilityGroupCard
            key={g.id}
            label={g.label}
            items={report?.capabilities.filter((c) => c.group === g.id) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="break-all">{v}</dd>
    </>
  );
}

function CapabilityGroupCard({ label, items }: { label: string; items: Capability[] }) {
  return (
    <section className="rounded-lg border">
      <h3 className="border-b px-4 py-2 text-sm font-medium">{label}</h3>
      <ul className="divide-y">
        {items.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-4 py-2">
            <StatusBadge status={c.status} />
            <div className="min-w-0">
              <p className="text-sm">{c.label}</p>
              {c.detail ? <p className="text-xs text-muted-foreground">{c.detail}</p> : null}
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-2 text-xs text-muted-foreground">Waiting for probe…</li>
        ) : null}
      </ul>
    </section>
  );
}
