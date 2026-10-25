"use client";

import type { EngineStats, FromEngine } from "@vfxvideo/engine";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/devtools/status-badge";
import { ImageViewer } from "@/components/studio/viewer";
import { startEngine, useEngineStatus } from "@/lib/engine";

type Ready = Extract<FromEngine, { type: "ready" }>;

const mb = (bytes: number) => `${(bytes / 2 ** 20).toFixed(1)} MB`;

export function EnginePanel() {
  const status = useEngineStatus();
  const [ready, setReady] = useState<Ready | undefined>(undefined);
  const [stats, setStats] = useState<EngineStats | undefined>(undefined);

  useEffect(() => {
    const engine = startEngine();
    return engine.subscribe((m) => {
      if (m.type === "ready") setReady(m);
      if (m.type === "stats") setStats(m.stats);
    });
  }, []);

  // Messages that arrived before this panel mounted.
  const shownReady = ready ?? startEngine().latest("ready");
  const shownStats = stats ?? startEngine().latest("stats")?.stats;

  return (
    <div className="grid gap-4 font-mono text-xs lg:grid-cols-2">
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 font-sans text-sm font-medium">Engine worker</h3>
        <div className="mb-3 flex items-center gap-2">
          <StatusBadge
            status={status.state === "ready" ? "yes" : status.state === "error" ? "no" : "unknown"}
          />
          <span>{status.state === "error" ? status.message : status.state}</span>
        </div>
        {shownReady ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <Row
              k="adapter"
              v={[shownReady.adapter.vendor, shownReady.adapter.architecture].join(" ")}
            />
            <Row k="max texture" v={`${shownReady.maxTextureDimension2D} px`} />
            <Row k="device features" v={shownReady.features.join(", ") || "(none)"} />
          </dl>
        ) : null}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-3 font-sans text-sm font-medium">Frame and memory</h3>
        {shownStats ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <Row k="frames" v={shownStats.framesRendered.toString()} />
            <Row k="encode (CPU)" v={`${shownStats.encodeMs.toFixed(2)} ms`} />
            <Row k="submit → GPU done" v={`${shownStats.gpuMs.toFixed(2)} ms`} />
            <Row
              k="canvas"
              v={
                shownStats.canvas
                  ? `${shownStats.canvas.width}x${shownStats.canvas.height} ${shownStats.canvas.format} ${shownStats.canvas.colorSpace}`
                  : "no viewer attached"
              }
            />
            <Row
              k="viewport"
              v={`zoom ${(shownStats.viewport.zoom * 100).toFixed(1)}%, center ${shownStats.viewport.center.x.toFixed(0)},${shownStats.viewport.center.y.toFixed(0)}`}
            />
            <Row
              k="pooled textures"
              v={`${shownStats.textures.liveTextures} live, ${shownStats.textures.freeTextures} free`}
            />
            <Row
              k="pooled memory"
              v={`${mb(shownStats.textures.liveBytes)} live, ${mb(shownStats.textures.freeBytes)} free, ${mb(shownStats.textures.peakBytes)} peak`}
            />
            <Row k="other textures" v={mb(shownStats.textures.otherBytes)} />
            <Row k="shader modules" v={shownStats.shaderModules.toString()} />
          </dl>
        ) : (
          <p className="text-muted-foreground">No frames yet.</p>
        )}
      </section>

      <section className="flex h-80 flex-col overflow-hidden rounded-lg border lg:col-span-2">
        <h3 className="border-b px-4 py-2 font-sans text-sm font-medium">
          Test viewer{" "}
          <span className="font-normal text-muted-foreground">
            (each browser tab runs its own engine; interact here to see live stats)
          </span>
        </h3>
        <ImageViewer />
      </section>
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
