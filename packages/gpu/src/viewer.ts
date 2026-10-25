import type { ShaderRegistry } from "./shaders";
import type { Size, Viewport } from "./viewport";

export type DisplayColorSpace = "srgb" | "display-p3";

// Draws a linear-light image into the canvas with pan/zoom.
// Display transform (temporary, replaced by the color package in B0.5):
// linear sRGB primaries -> (optionally) Display P3 primaries -> sRGB transfer
// curve, which both sRGB and Display P3 use.
const VIEWER_WGSL = /* wgsl */ `
struct View {
  canvasSize: vec2f,
  imageSize: vec2f,
  center: vec2f,
  zoom: f32,
  toP3: f32,
  background: vec4f,
}

@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var img: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0;
  return vec4f(xy, 0.0, 1.0);
}

const SRGB_TO_P3 = mat3x3f(
  vec3f(0.8224621, 0.0331941, 0.0170827),
  vec3f(0.1775380, 0.9668058, 0.0723974),
  vec3f(0.0,       0.0,       0.9105199));

fn encode(x: f32) -> f32 {
  let a = abs(x);
  let e = select(1.055 * pow(a, 1.0 / 2.4) - 0.055, 12.92 * a, a <= 0.0031308);
  return sign(x) * e;
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let px = (pos.xy - view.canvasSize * 0.5) / view.zoom + view.center;
  if (any(px < vec2f(0.0)) || any(px >= view.imageSize)) {
    return view.background;
  }
  var rgb = textureSampleLevel(img, samp, px / view.imageSize, 0.0).rgb;
  if (view.toP3 > 0.5) {
    rgb = SRGB_TO_P3 * rgb;
  }
  return vec4f(encode(rgb.r), encode(rgb.g), encode(rgb.b), 1.0);
}
`;

const UNIFORM_BYTES = 48;
/** Above this zoom, show hard pixel edges instead of interpolating. */
const NEAREST_ZOOM = 2;

export interface ViewerOptions {
  colorSpace: DisplayColorSpace;
  /** Background outside the image, already display-encoded (0..1). */
  background?: [number, number, number];
}

/**
 * Presents an image texture on an (Offscreen)Canvas. Owns the canvas context
 * configuration and the draw pipeline; knows nothing about documents.
 */
export class Viewer {
  readonly format: GPUTextureFormat;
  private readonly context: GPUCanvasContext;
  private readonly pipeline: GPURenderPipeline;
  private readonly uniforms: GPUBuffer;
  private readonly samplers: { linear: GPUSampler; nearest: GPUSampler };
  private bindGroups = new WeakMap<GPUTexture, { linear: GPUBindGroup; nearest: GPUBindGroup }>();
  private readonly uniformData = new Float32Array(UNIFORM_BYTES / 4);

  constructor(
    private readonly device: GPUDevice,
    shaders: ShaderRegistry,
    private readonly canvas: OffscreenCanvas,
    private readonly options: ViewerOptions,
  ) {
    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("Could not get a WebGPU context for the viewer canvas.");
    this.context = context;
    this.format = this.configure();

    const module = shaders.get("viewer", VIEWER_WGSL);
    this.pipeline = device.createRenderPipeline({
      label: "viewer",
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" },
    });
    this.uniforms = device.createBuffer({
      label: "viewer uniforms",
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.samplers = {
      linear: device.createSampler({ magFilter: "linear", minFilter: "linear" }),
      nearest: device.createSampler({ magFilter: "nearest", minFilter: "nearest" }),
    };
  }

  /**
   * Prefer a 16-bit float canvas (smooth gradients, values beyond sRGB in
   * Display P3); fall back to the platform's preferred 8-bit format.
   */
  private configure(): GPUTextureFormat {
    const base = {
      device: this.device,
      alphaMode: "opaque" as const,
      colorSpace: this.options.colorSpace,
    };
    try {
      this.context.configure({ ...base, format: "rgba16float", toneMapping: { mode: "standard" } });
      return "rgba16float";
    } catch {
      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({ ...base, format });
      return format;
    }
  }

  get colorSpace(): DisplayColorSpace {
    return this.options.colorSpace;
  }

  get size(): Size {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  resize(width: number, height: number): void {
    this.canvas.width = Math.max(1, Math.round(width));
    this.canvas.height = Math.max(1, Math.round(height));
  }

  render(image: GPUTexture, viewport: Viewport): void {
    const u = this.uniformData;
    const bg = this.options.background ?? [0.04, 0.04, 0.047];
    u.set([this.canvas.width, this.canvas.height, image.width, image.height]);
    u.set(
      [
        viewport.center.x,
        viewport.center.y,
        viewport.zoom,
        this.options.colorSpace === "display-p3" ? 1 : 0,
      ],
      4,
    );
    u.set([bg[0], bg[1], bg[2], 1], 8);
    this.device.queue.writeBuffer(this.uniforms, 0, u);

    const encoder = this.device.createCommandEncoder({ label: "viewer" });
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: bg[0], g: bg[1], b: bg[2], a: 1 },
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(
      0,
      this.bindGroupFor(image, viewport.zoom >= NEAREST_ZOOM ? "nearest" : "linear"),
    );
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private bindGroupFor(image: GPUTexture, filter: "linear" | "nearest"): GPUBindGroup {
    let groups = this.bindGroups.get(image);
    if (!groups) {
      const make = (sampler: GPUSampler) =>
        this.device.createBindGroup({
          layout: this.pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.uniforms } },
            { binding: 1, resource: image.createView() },
            { binding: 2, resource: sampler },
          ],
        });
      groups = { linear: make(this.samplers.linear), nearest: make(this.samplers.nearest) };
      this.bindGroups.set(image, groups);
    }
    return groups[filter];
  }

  /** Release the canvas so it can be garbage collected. */
  detach(): void {
    this.context.unconfigure();
    this.uniforms.destroy();
  }
}
