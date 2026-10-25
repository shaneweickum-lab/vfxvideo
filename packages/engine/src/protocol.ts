import type {
  DisplayColorSpace,
  GpuAdapterSummary,
  TexturePoolStats,
  Viewport,
} from "@vfxvideo/gpu";
import type { LogEntry } from "@vfxvideo/devtools";

/**
 * The message protocol between the UI (main thread) and the engine worker.
 * This is the ONLY way apps/web talks to the engine (AGENTS.md).
 * All messages are structured-clone safe; OffscreenCanvas is transferred.
 */
export type ToEngine =
  | {
      type: "attach";
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      colorSpace: DisplayColorSpace;
    }
  | { type: "detach" }
  | { type: "resize"; width: number; height: number }
  | { type: "view.pan"; dx: number; dy: number }
  | { type: "view.zoom"; factor: number; x: number; y: number }
  | { type: "view.set-zoom"; zoom: number }
  | { type: "view.fit" };

export interface EngineStats {
  /** CPU time to encode and submit the last frame, in ms. */
  encodeMs: number;
  /** Submit to GPU-done for the last measured frame, in ms. */
  gpuMs: number;
  framesRendered: number;
  textures: TexturePoolStats & { otherBytes: number };
  shaderModules: number;
  viewport: Viewport;
  canvas: { width: number; height: number; format: string; colorSpace: DisplayColorSpace } | null;
}

export type EngineErrorCode = "no-webgpu" | "device-lost" | "gpu-error" | "internal";

export type FromEngine =
  | {
      type: "ready";
      adapter: GpuAdapterSummary;
      features: string[];
      maxTextureDimension2D: number;
    }
  | { type: "error"; code: EngineErrorCode; message: string; fatal: boolean }
  | { type: "view"; viewport: Viewport }
  | { type: "stats"; stats: EngineStats }
  | { type: "log"; entry: LogEntry };
