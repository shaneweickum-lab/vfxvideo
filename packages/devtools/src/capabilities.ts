export type CapabilityStatus = "yes" | "no" | "partial" | "unknown";
export type CapabilityGroup = "gpu" | "media" | "storage" | "compute" | "display" | "input";

export interface Capability {
  id: string;
  group: CapabilityGroup;
  label: string;
  status: CapabilityStatus;
  detail?: string;
}

export interface GpuInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  preferredCanvasFormat: string;
  features: string[];
  limits: Record<string, number>;
}

export interface CapabilityReport {
  probedAt: number;
  gpu: GpuInfo | null;
  capabilities: Capability[];
}

/**
 * Everything the probe reads from the environment. Injected so the probe can
 * run in a window or a worker, and so tests can supply fakes.
 */
export interface ProbeEnv {
  gpu?: GPU | undefined;
  storage?: StorageManager | undefined;
  VideoDecoder?: Pick<typeof VideoDecoder, "isConfigSupported"> | undefined;
  VideoEncoder?: Pick<typeof VideoEncoder, "isConfigSupported"> | undefined;
  AudioDecoder?: unknown;
  WebAssembly?: Pick<typeof WebAssembly, "validate"> | undefined;
  OffscreenCanvas?: unknown;
  SharedArrayBuffer?: unknown;
  crossOriginIsolated?: boolean | undefined;
}

export function defaultProbeEnv(): ProbeEnv {
  const g = globalThis as typeof globalThis & { crossOriginIsolated?: boolean };
  return {
    gpu: g.navigator?.gpu,
    storage: g.navigator?.storage,
    VideoDecoder: g.VideoDecoder,
    VideoEncoder: g.VideoEncoder,
    AudioDecoder: g.AudioDecoder,
    WebAssembly: g.WebAssembly,
    OffscreenCanvas: g.OffscreenCanvas,
    SharedArrayBuffer: g.SharedArrayBuffer,
    crossOriginIsolated: g.crossOriginIsolated,
  };
}

/** WebGPU features that matter to the engine, with why. */
export const GPU_FEATURES_OF_INTEREST: Record<string, string> = {
  "shader-f16": "half-float math in shaders (faster, less memory)",
  "float32-filterable": "smooth sampling of 32-bit float textures",
  "float32-blendable": "blending into 32-bit float render targets",
  "timestamp-query": "precise GPU timing for the profiler",
};

const GPU_LIMITS_OF_INTEREST = [
  "maxTextureDimension2D",
  "maxBufferSize",
  "maxStorageBufferBindingSize",
  "maxComputeWorkgroupStorageSize",
  "maxComputeInvocationsPerWorkgroup",
] as const;

/** Codecs probed at 4K. Strings follow the WebCodecs codec registry. */
export const VIDEO_CODECS = [
  { id: "h264", label: "H.264", codec: "avc1.640033" },
  { id: "hevc", label: "HEVC / H.265", codec: "hvc1.1.6.L153.B0" },
  { id: "vp9", label: "VP9", codec: "vp09.00.51.08" },
  { id: "av1", label: "AV1", codec: "av01.0.12M.08" },
] as const;

// Smallest valid modules that use a feature. WebAssembly.validate() returns
// false when the engine does not support it.
const WASM_MEMORY64 = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x05, 0x03, 0x01, 0x04, 0x00,
]);
const WASM_SIMD = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
  0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00, 0x41, 0x00, 0xfd, 0x0f, 0xfd, 0x62, 0x0b,
]);

const yesNo = (ok: boolean): CapabilityStatus => (ok ? "yes" : "no");

function formatBytes(n: number): string {
  if (n >= 2 ** 30) return `${(n / 2 ** 30).toFixed(1)} GB`;
  if (n >= 2 ** 20) return `${(n / 2 ** 20).toFixed(0)} MB`;
  return `${n} B`;
}

async function probeGpu(env: ProbeEnv): Promise<{ info: GpuInfo | null; caps: Capability[] }> {
  if (!env.gpu) {
    return {
      info: null,
      caps: [
        {
          id: "webgpu",
          group: "gpu",
          label: "WebGPU",
          status: "no",
          detail: "navigator.gpu missing",
        },
      ],
    };
  }
  let adapter: GPUAdapter | null = null;
  try {
    adapter = await env.gpu.requestAdapter({ powerPreference: "high-performance" });
  } catch (err) {
    return {
      info: null,
      caps: [{ id: "webgpu", group: "gpu", label: "WebGPU", status: "no", detail: String(err) }],
    };
  }
  if (!adapter) {
    return {
      info: null,
      caps: [
        {
          id: "webgpu",
          group: "gpu",
          label: "WebGPU",
          status: "no",
          detail: "no adapter available",
        },
      ],
    };
  }

  const features = [...adapter.features].map(String).sort();
  const limits: Record<string, number> = {};
  for (const name of GPU_LIMITS_OF_INTEREST) limits[name] = Number(adapter.limits[name]);
  const info: GpuInfo = {
    vendor: adapter.info?.vendor ?? "",
    architecture: adapter.info?.architecture ?? "",
    device: adapter.info?.device ?? "",
    description: adapter.info?.description ?? "",
    preferredCanvasFormat: env.gpu.getPreferredCanvasFormat(),
    features,
    limits,
  };

  const caps: Capability[] = [
    {
      id: "webgpu",
      group: "gpu",
      label: "WebGPU",
      status: "yes",
      detail: [info.vendor, info.architecture].filter(Boolean).join(" ") || "adapter available",
    },
    ...Object.entries(GPU_FEATURES_OF_INTEREST).map(([feature, why]): Capability => ({
      id: `gpu.${feature}`,
      group: "gpu",
      label: feature,
      status: yesNo(adapter.features.has(feature)),
      detail: why,
    })),
  ];
  return { info, caps };
}

async function probeCodec(
  api:
    Pick<typeof VideoDecoder, "isConfigSupported"> | Pick<typeof VideoEncoder, "isConfigSupported">,
  config: VideoDecoderConfig | VideoEncoderConfig,
): Promise<boolean> {
  try {
    // Both APIs share this shape; the config type is checked by the callers.
    const result = await (
      api.isConfigSupported as (c: typeof config) => Promise<{ supported?: boolean }>
    )(config);
    return result.supported === true;
  } catch {
    return false;
  }
}

async function probeMedia(env: ProbeEnv): Promise<Capability[]> {
  const caps: Capability[] = [];
  const { VideoDecoder: dec, VideoEncoder: enc } = env;
  const webcodecs: Capability = {
    id: "webcodecs",
    group: "media",
    label: "WebCodecs",
    status: dec && enc ? (env.AudioDecoder ? "yes" : "partial") : "no",
  };
  if (dec && enc && !env.AudioDecoder) webcodecs.detail = "video only, no audio decoder";
  caps.push(webcodecs);

  for (const c of VIDEO_CODECS) {
    const decodes = dec
      ? await probeCodec(dec, { codec: c.codec, codedWidth: 3840, codedHeight: 2160 })
      : false;
    const encodes = enc
      ? await probeCodec(enc, {
          codec: c.codec,
          width: 3840,
          height: 2160,
          bitrate: 40_000_000,
          framerate: 30,
        })
      : false;
    caps.push({
      id: `codec.${c.id}`,
      group: "media",
      label: `${c.label} 4K`,
      status: decodes && encodes ? "yes" : decodes || encodes ? "partial" : "no",
      detail: `decode ${decodes ? "yes" : "no"}, encode ${encodes ? "yes" : "no"}`,
    });
  }
  return caps;
}

async function probeStorage(env: ProbeEnv): Promise<Capability[]> {
  const caps: Capability[] = [];
  const storage = env.storage;

  let opfs = false;
  if (storage && typeof storage.getDirectory === "function") {
    try {
      await storage.getDirectory();
      opfs = true;
    } catch {
      opfs = false;
    }
  }
  caps.push({
    id: "opfs",
    group: "storage",
    label: "Origin private file system",
    status: yesNo(opfs),
  });

  if (storage && typeof storage.persisted === "function") {
    const persisted = await storage.persisted().catch(() => false);
    caps.push({
      id: "storage.persisted",
      group: "storage",
      label: "Persistent storage",
      status: persisted ? "yes" : "partial",
      detail: persisted ? "granted" : "not yet granted (requested on first save)",
    });
  } else {
    caps.push({
      id: "storage.persisted",
      group: "storage",
      label: "Persistent storage",
      status: "no",
    });
  }

  if (storage && typeof storage.estimate === "function") {
    const est = await storage.estimate().catch(() => null);
    if (est?.quota !== undefined) {
      caps.push({
        id: "storage.quota",
        group: "storage",
        label: "Storage quota",
        status: "yes",
        detail: `${formatBytes(est.usage ?? 0)} used of ${formatBytes(est.quota)}`,
      });
    }
  }
  return caps;
}

function probeCompute(env: ProbeEnv): Capability[] {
  const wasm = env.WebAssembly;
  const validate = (bytes: Uint8Array) => {
    try {
      return wasm ? wasm.validate(bytes as BufferSource) : false;
    } catch {
      return false;
    }
  };
  return [
    { id: "wasm", group: "compute", label: "WebAssembly", status: yesNo(!!wasm) },
    {
      id: "wasm.simd",
      group: "compute",
      label: "WebAssembly SIMD",
      status: yesNo(validate(WASM_SIMD)),
    },
    {
      id: "wasm.memory64",
      group: "compute",
      label: "WebAssembly 64-bit memory",
      status: yesNo(validate(WASM_MEMORY64)),
      detail: "lifts the 4 GB wasm heap limit",
    },
    {
      id: "threads",
      group: "compute",
      label: "Shared memory threads",
      status: env.SharedArrayBuffer && env.crossOriginIsolated ? "yes" : "no",
      detail: env.crossOriginIsolated
        ? "cross-origin isolated"
        : "needs COOP/COEP headers (not required until later stages)",
    },
    {
      id: "offscreencanvas",
      group: "compute",
      label: "OffscreenCanvas",
      status: yesNo(typeof env.OffscreenCanvas === "function"),
      detail: "lets the engine worker draw the viewer",
    },
  ];
}

/**
 * Probe the GPU, media, storage and compute features the engine depends on.
 * Safe to call from a window or a worker. Never throws.
 */
export async function probeCapabilities(
  env: ProbeEnv = defaultProbeEnv(),
): Promise<CapabilityReport> {
  const [gpu, media, storage] = await Promise.all([
    probeGpu(env),
    probeMedia(env),
    probeStorage(env),
  ]);
  return {
    probedAt: Date.now(),
    gpu: gpu.info,
    capabilities: [...gpu.caps, ...media, ...storage, ...probeCompute(env)],
  };
}
