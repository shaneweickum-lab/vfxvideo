"use client";

import type { DisplayColorSpace, Viewport } from "@vfxvideo/gpu";
import { Maximize, Scan } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { startEngine, useEngineStatus } from "@/lib/engine";

const ZOOM_STEP = 1.25;

/**
 * The image viewer. The canvas is transferred to the engine worker, which
 * renders into it with WebGPU; this component only forwards input.
 *
 * Controls: drag to pan, scroll to pan, pinch or Ctrl/Cmd+scroll to zoom,
 * F = fit, 1 = 100%, +/- = zoom.
 */
export function ImageViewer() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const status = useEngineStatus();

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const engine = startEngine();

    // A fresh canvas per mount: a transferred canvas can never be reused.
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 size-full touch-none";
    box.prepend(canvas);
    const dpr = () => window.devicePixelRatio || 1;
    const colorSpace: DisplayColorSpace = window.matchMedia("(color-gamut: p3)").matches
      ? "display-p3"
      : "srgb";
    engine.attach(
      canvas.transferControlToOffscreen(),
      box.clientWidth * dpr(),
      box.clientHeight * dpr(),
      colorSpace,
    );

    const offView = engine.subscribe((m) => {
      if (m.type === "view") setViewport(m.viewport);
    });

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const exact = entry.devicePixelContentBoxSize?.[0];
      const width = exact ? exact.inlineSize : entry.contentRect.width * dpr();
      const height = exact ? exact.blockSize : entry.contentRect.height * dpr();
      engine.send({ type: "resize", width, height });
    });
    ro.observe(box);

    // Pointer: drag pans. Positions are converted to device pixels for the engine.
    let dragging: { id: number; x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || dragging.id !== e.pointerId) return;
      const k = dpr();
      engine.send({
        type: "view.pan",
        dx: (e.clientX - dragging.x) * k,
        dy: (e.clientY - dragging.y) * k,
      });
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (dragging?.id === e.pointerId) dragging = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = dpr();
      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch arrives as ctrl+wheel with small deltas.
        const rect = canvas.getBoundingClientRect();
        engine.send({
          type: "view.zoom",
          factor: Math.exp(-e.deltaY * 0.01),
          x: (e.clientX - rect.left) * k,
          y: (e.clientY - rect.top) * k,
        });
      } else {
        const line = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
        engine.send({ type: "view.pan", dx: -e.deltaX * line * k, dy: -e.deltaY * line * k });
      }
    };
    const onDoubleClick = () => engine.send({ type: "view.fit" });

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDoubleClick);

    return () => {
      ro.disconnect();
      offView();
      engine.send({ type: "detach" });
      canvas.remove();
    };
  }, []);

  // Keyboard shortcuts while the viewer is on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const engine = startEngine();
      const box = boxRef.current;
      const center = box
        ? {
            x: (box.clientWidth * window.devicePixelRatio) / 2,
            y: (box.clientHeight * window.devicePixelRatio) / 2,
          }
        : { x: 0, y: 0 };
      if (e.key === "f") engine.send({ type: "view.fit" });
      else if (e.key === "1") engine.send({ type: "view.set-zoom", zoom: 1 });
      else if (e.key === "+" || e.key === "=")
        engine.send({ type: "view.zoom", factor: ZOOM_STEP, ...center });
      else if (e.key === "-") engine.send({ type: "view.zoom", factor: 1 / ZOOM_STEP, ...center });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden bg-viewer">
      {status.state === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-sm font-medium">
              {status.noWebGpu ? "This browser cannot run the engine" : "The engine stopped"}
            </p>
            <p className="text-xs text-muted-foreground">
              {status.noWebGpu
                ? "VFXVideo needs WebGPU. Use a current Chrome, or Safari 26 or newer."
                : status.message}
            </p>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1">
        <span className="rounded bg-background/80 px-2 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur">
          {viewport ? `${(viewport.zoom * 100).toFixed(viewport.zoom < 0.1 ? 1 : 0)}%` : "–"}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          className="pointer-events-auto size-7"
          title="Fit (F)"
          onClick={() => startEngine().send({ type: "view.fit" })}
        >
          <Maximize />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          className="pointer-events-auto size-7"
          title="100% (1)"
          onClick={() => startEngine().send({ type: "view.set-zoom", zoom: 1 })}
        >
          <Scan />
        </Button>
      </div>
    </div>
  );
}
