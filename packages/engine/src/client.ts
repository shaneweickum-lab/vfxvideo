import type { DisplayColorSpace } from "@vfxvideo/gpu";

import type { FromEngine, ToEngine } from "./protocol";

/** The parts of a Worker the client needs (lets tests pass a fake). */
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<FromEngine>) => void): void;
  terminate(): void;
}

export type EngineListener = (message: FromEngine) => void;

/**
 * Main-thread handle to the engine worker. The UI creates the Worker (so the
 * bundler can resolve the worker file) and hands it to this client.
 */
export class EngineClient {
  private listeners = new Set<EngineListener>();
  private last = new Map<FromEngine["type"], FromEngine>();

  constructor(private readonly worker: WorkerLike) {
    worker.addEventListener("message", (event) => {
      const msg = event.data;
      this.last.set(msg.type, msg);
      for (const listener of this.listeners) listener(msg);
    });
  }

  /** Subscribe to every message. Returns an unsubscribe function. */
  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Most recent message of a given type, e.g. latest("ready"). */
  latest<T extends FromEngine["type"]>(type: T): Extract<FromEngine, { type: T }> | undefined {
    return this.last.get(type) as Extract<FromEngine, { type: T }> | undefined;
  }

  send(message: Exclude<ToEngine, { type: "attach" }>): void {
    this.worker.postMessage(message);
  }

  /** Hand a canvas to the engine. The canvas is transferred and unusable here afterwards. */
  attach(
    canvas: OffscreenCanvas,
    width: number,
    height: number,
    colorSpace: DisplayColorSpace,
  ): void {
    const message: ToEngine = { type: "attach", canvas, width, height, colorSpace };
    this.worker.postMessage(message, [canvas]);
  }

  terminate(): void {
    this.worker.terminate();
    this.listeners.clear();
  }
}
