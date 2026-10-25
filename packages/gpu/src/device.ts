/** Optional WebGPU features the engine uses when the adapter offers them. */
export const OPTIONAL_FEATURES: GPUFeatureName[] = [
  "shader-f16",
  "float32-filterable",
  "float32-blendable",
  "timestamp-query",
];

export interface GpuAdapterSummary {
  vendor: string;
  architecture: string;
  description: string;
}

export interface GpuContext {
  device: GPUDevice;
  features: ReadonlySet<string>;
  adapter: GpuAdapterSummary;
  limits: { maxTextureDimension2D: number; maxBufferSize: number };
}

export interface AcquireDeviceOptions {
  /** Called once if the device is lost (driver reset, GPU removed, destroy()). */
  onLost?: (info: GPUDeviceLostInfo) => void;
  /** Called for validation and out-of-memory errors nothing else caught. */
  onError?: (error: GPUError) => void;
}

export class GpuUnavailableError extends Error {
  override readonly name = "GpuUnavailableError";
}

/**
 * Request a high-performance adapter and a device with the largest texture
 * and buffer limits the adapter allows (an image editor needs big textures).
 */
export async function acquireDevice(
  gpu: GPU | undefined,
  options: AcquireDeviceOptions = {},
): Promise<GpuContext> {
  if (!gpu) throw new GpuUnavailableError("WebGPU is not available in this browser.");
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new GpuUnavailableError("No WebGPU adapter is available.");

  const requiredFeatures = OPTIONAL_FEATURES.filter((f) => adapter.features.has(f));
  const device = await adapter.requestDevice({
    label: "vfxvideo engine",
    requiredFeatures,
    requiredLimits: {
      maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    },
  });

  void device.lost.then((info) => options.onLost?.(info));
  device.addEventListener("uncapturederror", (e) => {
    options.onError?.((e as GPUUncapturedErrorEvent).error);
  });

  return {
    device,
    features: new Set(requiredFeatures),
    adapter: {
      vendor: adapter.info?.vendor ?? "",
      architecture: adapter.info?.architecture ?? "",
      description: adapter.info?.description ?? "",
    },
    limits: {
      maxTextureDimension2D: device.limits.maxTextureDimension2D,
      maxBufferSize: device.limits.maxBufferSize,
    },
  };
}
