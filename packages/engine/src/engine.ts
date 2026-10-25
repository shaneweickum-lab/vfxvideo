import { LogBuffer } from "@vfxvideo/devtools";
import {
  acquireDevice,
  createTestPattern,
  fitViewport,
  GpuUnavailableError,
  panViewport,
  setViewportZoom,
  ShaderRegistry,
  TexturePool,
  textureBytes,
  Viewer,
  type GpuContext,
  type Viewport,
  zoomViewportAt,
} from "@vfxvideo/gpu";

import type { EngineStats, FromEngine, ToEngine } from "./protocol";

const STATS_INTERVAL_MS = 250;

type Post = (message: FromEngine) => void;
type Schedule = (callback: () => void) => void;

/**
 * The engine: owns the GPU device and renders the viewer. Runs inside the
 * engine worker; `post` sends messages back to the UI.
 */
export class Engine {
  private gpu: GpuContext | null = null;
  private shaders: ShaderRegistry | null = null;
  private pool: TexturePool | null = null;
  private viewer: Viewer | null = null;
  private image: GPUTexture | null = null;
  private viewport: Viewport = { zoom: 1, center: { x: 0, y: 0 } };
  private needsFit = true;
  private dirty = false;
  private frameScheduled = false;
  private framesRendered = 0;
  private encodeMs = 0;
  private gpuMs = 0;
  private lastStatsAt = 0;
  private ready: Promise<void>;
  readonly log = new LogBuffer(200);

  constructor(
    private readonly post: Post,
    private readonly schedule: Schedule,
    gpu: GPU | undefined,
  ) {
    this.log.subscribe((entry) => this.post({ type: "log", entry }));
    this.ready = this.init(gpu);
  }

  private async init(gpu: GPU | undefined): Promise<void> {
    try {
      this.gpu = await acquireDevice(gpu, {
        onLost: (info) => {
          // destroy() during shutdown reports "destroyed"; anything else is a real loss.
          if (info.reason === "destroyed") return;
          this.log.error("gpu", `Device lost: ${info.message}`);
          this.post({ type: "error", code: "device-lost", message: info.message, fatal: true });
        },
        onError: (error) => {
          this.log.error("gpu", error.message);
          this.post({ type: "error", code: "gpu-error", message: error.message, fatal: false });
        },
      });
    } catch (err) {
      const code = err instanceof GpuUnavailableError ? "no-webgpu" : "internal";
      const message = err instanceof Error ? err.message : String(err);
      this.log.error("gpu", message);
      this.post({ type: "error", code, message, fatal: true });
      return;
    }

    const { device } = this.gpu;
    this.shaders = new ShaderRegistry(device, (m) =>
      this.log.log(
        m.type === "error" ? "error" : "warn",
        "shader",
        `${m.shader}:${m.line}:${m.column} ${m.message}`,
      ),
    );
    this.pool = new TexturePool(device);
    this.image = createTestPattern(device, this.shaders);
    this.log.info("engine", "GPU ready", this.gpu.adapter);
    this.post({
      type: "ready",
      adapter: this.gpu.adapter,
      features: [...this.gpu.features],
      maxTextureDimension2D: this.gpu.limits.maxTextureDimension2D,
    });
  }

  async handle(msg: ToEngine): Promise<void> {
    await this.ready;
    if (!this.gpu || !this.shaders) return;
    switch (msg.type) {
      case "attach": {
        this.viewer?.detach();
        this.viewer = new Viewer(this.gpu.device, this.shaders, msg.canvas, {
          colorSpace: msg.colorSpace,
        });
        this.viewer.resize(msg.width, msg.height);
        this.log.info(
          "viewer",
          `Attached ${msg.width}x${msg.height} ${this.viewer.format} ${msg.colorSpace}`,
        );
        this.needsFit = true;
        break;
      }
      case "detach":
        this.viewer?.detach();
        this.viewer = null;
        return;
      case "resize":
        this.viewer?.resize(msg.width, msg.height);
        break;
      case "view.pan":
        this.setViewport(panViewport(this.viewport, msg.dx, msg.dy));
        break;
      case "view.zoom":
        if (this.viewer) {
          this.setViewport(
            zoomViewportAt(this.viewport, this.viewer.size, msg.factor, { x: msg.x, y: msg.y }),
          );
        }
        break;
      case "view.set-zoom":
        this.setViewport(setViewportZoom(this.viewport, msg.zoom));
        break;
      case "view.fit":
        this.needsFit = true;
        break;
    }
    this.requestFrame();
  }

  private setViewport(v: Viewport): void {
    this.viewport = v;
    this.needsFit = false;
  }

  private requestFrame(): void {
    this.dirty = true;
    if (this.frameScheduled) return;
    this.frameScheduled = true;
    this.schedule(() => {
      this.frameScheduled = false;
      if (this.dirty) this.frame();
    });
  }

  private frame(): void {
    this.dirty = false;
    const { viewer, image, gpu } = this;
    if (!viewer || !image || !gpu) return;
    if (this.needsFit) {
      this.viewport = fitViewport({ width: image.width, height: image.height }, viewer.size);
      this.needsFit = false;
    }
    const t0 = performance.now();
    viewer.render(image, this.viewport);
    this.encodeMs = performance.now() - t0;
    this.framesRendered++;
    this.post({ type: "view", viewport: this.viewport });

    if (t0 - this.lastStatsAt >= STATS_INTERVAL_MS) {
      this.lastStatsAt = t0;
      void gpu.device.queue.onSubmittedWorkDone().then(() => {
        this.gpuMs = performance.now() - t0;
        this.post({ type: "stats", stats: this.stats() });
      });
    }
  }

  stats(): EngineStats {
    const poolStats = this.pool?.stats() ?? {
      liveTextures: 0,
      liveBytes: 0,
      freeTextures: 0,
      freeBytes: 0,
      peakBytes: 0,
    };
    const imageBytes = this.image
      ? textureBytes(this.image.width, this.image.height, this.image.format)
      : 0;
    return {
      encodeMs: this.encodeMs,
      gpuMs: this.gpuMs,
      framesRendered: this.framesRendered,
      textures: { ...poolStats, otherBytes: imageBytes },
      shaderModules: this.shaders?.size ?? 0,
      viewport: this.viewport,
      canvas: this.viewer
        ? { ...this.viewer.size, format: this.viewer.format, colorSpace: this.viewer.colorSpace }
        : null,
    };
  }
}
