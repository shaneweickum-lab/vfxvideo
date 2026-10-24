"use client";

import { type PenSample, PenStats, type PenSummary } from "@vfxvideo/devtools";
import { Eraser } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CopyButton } from "@/components/devtools/copy-button";
import { StatusBadge } from "@/components/devtools/status-badge";
import { Button } from "@/components/ui/button";
import { BUILD_INFO } from "@/lib/build-info";
import { appLog } from "@/lib/devtools/app-log";

const HISTORY = 240;

// Debugger drawing only. The real brush engine is GPU-based (Stage 4).
const STROKE_COLOR: Record<string, string> = {
  pen: "rgb(240 160 80)",
  touch: "rgb(110 170 250)",
  mouse: "rgb(170 170 180)",
};

function toSample(e: PointerEvent): PenSample {
  return {
    t: e.timeStamp,
    x: e.offsetX,
    y: e.offsetY,
    pointerType: e.pointerType,
    pressure: e.pressure,
    tangentialPressure: e.tangentialPressure,
    tiltX: e.tiltX,
    tiltY: e.tiltY,
    twist: e.twist,
    buttons: e.buttons,
  };
}

function coalesced(e: PointerEvent): PointerEvent[] {
  const list = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
  return list.length > 0 ? list : [e];
}

interface Live {
  sample: PenSample | null;
  altitude: number | null;
  azimuth: number | null;
  summary: PenSummary;
}

export function PenTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef(new PenStats());
  const historyRef = useRef<number[]>([]);
  const lastPointRef = useRef<PenSample | null>(null);
  const latestRef = useRef<Omit<Live, "summary">>({ sample: null, altitude: null, azimuth: null });
  const dirtyRef = useRef(false);
  const seenTypesRef = useRef(new Set<string>());
  const [live, setLive] = useState<Live>(() => ({
    sample: null,
    altitude: null,
    azimuth: null,
    summary: new PenStats().summary(),
  }));

  // Keep the drawing canvas sized to its box at device resolution.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Pointer handling, attached natively so we get every event without React overhead.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const record = (e: PointerEvent) => {
      const evs = coalesced(e);
      const samples = evs.map(toSample);
      statsRef.current.addEvent(samples);
      const last = evs[evs.length - 1] ?? e;
      latestRef.current = {
        sample: toSample(last),
        altitude: "altitudeAngle" in last ? (last.altitudeAngle as number) : null,
        azimuth: "azimuthAngle" in last ? (last.azimuthAngle as number) : null,
      };
      if (!seenTypesRef.current.has(e.pointerType)) {
        seenTypesRef.current.add(e.pointerType);
        appLog.info("pen", `First ${e.pointerType} input`, { pressure: e.pressure });
      }
      dirtyRef.current = true;
      return samples;
    };

    const draw = (samples: PenSample[]) => {
      for (const s of samples) {
        if (s.buttons === 0) continue;
        const prev = lastPointRef.current;
        historyRef.current.push(s.pressure);
        if (historyRef.current.length > HISTORY) historyRef.current.shift();
        if (prev) {
          ctx.strokeStyle = STROKE_COLOR[s.pointerType] ?? "white";
          ctx.lineWidth = 1 + s.pressure * 24;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
        lastPointRef.current = s;
      }
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      statsRef.current.beginStroke();
      lastPointRef.current = null;
      draw(record(e));
    };
    const onMove = (e: PointerEvent) => draw(record(e));
    const onUp = (e: PointerEvent) => {
      record(e);
      lastPointRef.current = null;
    };
    const noMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("contextmenu", noMenu);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("contextmenu", noMenu);
    };
  }, []);

  // Push readouts to React and redraw the pressure graph at most once per frame.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setLive({ ...latestRef.current, summary: statsRef.current.summary() });
        drawGraph(graphRef.current, historyRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    statsRef.current = new PenStats();
    historyRef.current = [];
    latestRef.current = { sample: null, altitude: null, azimuth: null };
    dirtyRef.current = true;
  }, []);

  const { sample, summary } = live;
  const verdictStatus =
    summary.pressure.verdict === "real"
      ? "yes"
      : summary.pressure.verdict === "untested"
        ? "unknown"
        : summary.pressure.verdict === "limited"
          ? "partial"
          : "no";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clear}>
            <Eraser /> Clear
          </Button>
          <CopyButton
            label="Copy pen report"
            getText={() =>
              JSON.stringify(
                {
                  summary: statsRef.current.summary(),
                  userAgent: navigator.userAgent,
                  build: BUILD_INFO,
                },
                null,
                2,
              )
            }
          />
          <span className="text-xs text-muted-foreground">
            Draw light to heavy, then tilt the pen. Orange = pen, blue = touch, grey = mouse.
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="h-[60vh] min-h-80 w-full touch-none rounded-lg border bg-viewer select-none"
        />
        <canvas ref={graphRef} width={HISTORY} height={48} className="h-12 w-full rounded border" />
      </div>

      <aside className="space-y-4 font-mono text-xs">
        <section className="rounded-lg border p-3">
          <h3 className="mb-2 font-sans text-sm font-medium">Verdict</h3>
          <div className="flex items-center gap-2">
            <StatusBadge status={verdictStatus} />
            <span>pressure: {summary.pressure.verdict}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge
              status={summary.samples ? (summary.tilt.seen ? "yes" : "no") : "unknown"}
            />
            <span>tilt</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge
              status={summary.samples ? (summary.twistSeen ? "yes" : "no") : "unknown"}
            />
            <span>twist / barrel rotation</span>
          </div>
        </section>

        <section className="rounded-lg border p-3">
          <h3 className="mb-2 font-sans text-sm font-medium">Live sample</h3>
          <Readout k="pointerType" v={sample?.pointerType} />
          <Readout k="pressure" v={sample?.pressure.toFixed(4)} />
          <Readout
            k="tiltX / tiltY"
            v={sample ? `${sample.tiltX}° / ${sample.tiltY}°` : undefined}
          />
          <Readout k="altitude" v={fmtAngle(live.altitude)} />
          <Readout k="azimuth" v={fmtAngle(live.azimuth)} />
          <Readout k="twist" v={sample ? `${sample.twist}°` : undefined} />
          <Readout k="tangential" v={sample?.tangentialPressure.toFixed(3)} />
          <Readout k="buttons" v={sample?.buttons.toString()} />
        </section>

        <section className="rounded-lg border p-3">
          <h3 className="mb-2 font-sans text-sm font-medium">Session</h3>
          <Readout k="types seen" v={summary.pointerTypes.join(", ") || undefined} />
          <Readout k="strokes" v={summary.strokes.toString()} />
          <Readout
            k="pressure range"
            v={
              summary.pressure.distinctLevels
                ? `${summary.pressure.min.toFixed(3)} – ${summary.pressure.max.toFixed(3)}`
                : undefined
            }
          />
          <Readout k="pressure levels" v={summary.pressure.distinctLevels.toString()} />
          <Readout k="event rate" v={`${summary.eventRateHz.toFixed(0)} Hz`} />
          <Readout k="sample rate" v={`${summary.sampleRateHz.toFixed(0)} Hz`} />
          <Readout k="coalesced/event" v={summary.coalescedPerEvent.toFixed(2)} />
        </section>
      </aside>
    </div>
  );
}

function Readout({ k, v }: { k: string; v: string | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-muted-foreground">{k}</span>
      <span>{v ?? "–"}</span>
    </div>
  );
}

function fmtAngle(rad: number | null): string | undefined {
  return rad === null ? undefined : `${((rad * 180) / Math.PI).toFixed(1)}°`;
}

function drawGraph(canvas: HTMLCanvasElement | null, values: number[]) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgb(240 160 80)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  values.forEach((p, i) => {
    const x = w - values.length + i;
    const y = h - 2 - p * (h - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
