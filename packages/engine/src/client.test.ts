import { describe, expect, it, vi } from "vitest";

import { EngineClient, type WorkerLike } from "./client";
import type { FromEngine } from "./protocol";

function fakeWorker() {
  let listener: ((e: MessageEvent<FromEngine>) => void) | null = null;
  const posted: { message: unknown; transfer?: Transferable[] }[] = [];
  const worker: WorkerLike = {
    postMessage: (message, transfer) => posted.push(transfer ? { message, transfer } : { message }),
    addEventListener: (_type, l) => {
      listener = l;
    },
    terminate: vi.fn(),
  };
  const emit = (data: FromEngine) => listener?.({ data } as MessageEvent<FromEngine>);
  return { worker, posted, emit };
}

describe("EngineClient", () => {
  it("forwards engine messages to subscribers and remembers the latest of each type", () => {
    const f = fakeWorker();
    const client = new EngineClient(f.worker);
    const seen: string[] = [];
    const off = client.subscribe((m) => seen.push(m.type));
    f.emit({ type: "view", viewport: { zoom: 1, center: { x: 0, y: 0 } } });
    f.emit({ type: "view", viewport: { zoom: 2, center: { x: 0, y: 0 } } });
    off();
    f.emit({ type: "error", code: "no-webgpu", message: "x", fatal: true });
    expect(seen).toEqual(["view", "view"]);
    expect(client.latest("view")?.viewport.zoom).toBe(2);
    expect(client.latest("error")?.code).toBe("no-webgpu");
    expect(client.latest("ready")).toBeUndefined();
  });

  it("transfers the canvas on attach", () => {
    const f = fakeWorker();
    const client = new EngineClient(f.worker);
    const canvas = {} as OffscreenCanvas;
    client.attach(canvas, 800, 600, "display-p3");
    expect(f.posted[0]).toEqual({
      message: { type: "attach", canvas, width: 800, height: 600, colorSpace: "display-p3" },
      transfer: [canvas],
    });
  });

  it("sends plain messages without transfer", () => {
    const f = fakeWorker();
    new EngineClient(f.worker).send({ type: "view.fit" });
    expect(f.posted).toEqual([{ message: { type: "view.fit" } }]);
  });
});
