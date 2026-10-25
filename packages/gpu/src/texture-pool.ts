/** Bytes per pixel for the formats the engine uses. */
const BYTES_PER_PIXEL: Partial<Record<GPUTextureFormat, number>> = {
  r8unorm: 1,
  rgba8unorm: 4,
  "rgba8unorm-srgb": 4,
  bgra8unorm: 4,
  r16float: 2,
  rgba16float: 8,
  r32float: 4,
  rgba32float: 16,
};

export function textureBytes(width: number, height: number, format: GPUTextureFormat): number {
  const bpp = BYTES_PER_PIXEL[format];
  if (bpp === undefined) throw new Error(`textureBytes: unsupported format ${format}`);
  return width * height * bpp;
}

export interface PooledTextureSpec {
  width: number;
  height: number;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
  label?: string;
}

export interface TexturePoolStats {
  liveTextures: number;
  liveBytes: number;
  freeTextures: number;
  freeBytes: number;
  peakBytes: number;
}

interface Entry {
  texture: GPUTexture;
  key: string;
  bytes: number;
}

const keyOf = (s: PooledTextureSpec) => `${s.width}x${s.height}:${s.format}:${s.usage}`;

/**
 * Reuses GPU textures of identical size/format/usage. Graph evaluation
 * allocates many short-lived intermediates; recycling them avoids GPU
 * allocation stalls and lets the debugger report exact GPU memory use.
 */
export class TexturePool {
  private live = new Map<GPUTexture, Entry>();
  private free = new Map<string, Entry[]>();
  private freeBytes = 0;
  private liveBytes = 0;
  private peakBytes = 0;

  /** `maxFreeBytes` caps memory kept for reuse; extra released textures are destroyed. */
  constructor(
    private readonly device: Pick<GPUDevice, "createTexture">,
    private readonly maxFreeBytes = 256 * 2 ** 20,
  ) {}

  acquire(spec: PooledTextureSpec): GPUTexture {
    const key = keyOf(spec);
    const reuse = this.free.get(key)?.pop();
    let entry: Entry;
    if (reuse) {
      this.freeBytes -= reuse.bytes;
      entry = reuse;
    } else {
      const texture = this.device.createTexture({
        size: { width: spec.width, height: spec.height },
        format: spec.format,
        usage: spec.usage,
        label: spec.label ?? `pool ${key}`,
      });
      entry = { texture, key, bytes: textureBytes(spec.width, spec.height, spec.format) };
    }
    this.live.set(entry.texture, entry);
    this.liveBytes += entry.bytes;
    this.peakBytes = Math.max(this.peakBytes, this.liveBytes + this.freeBytes);
    return entry.texture;
  }

  release(texture: GPUTexture): void {
    const entry = this.live.get(texture);
    if (!entry) throw new Error("TexturePool.release: texture is not live in this pool");
    this.live.delete(texture);
    this.liveBytes -= entry.bytes;
    if (this.freeBytes + entry.bytes > this.maxFreeBytes) {
      texture.destroy();
      return;
    }
    const list = this.free.get(entry.key) ?? [];
    list.push(entry);
    this.free.set(entry.key, list);
    this.freeBytes += entry.bytes;
  }

  /** Destroy all textures waiting for reuse. */
  trim(): void {
    for (const list of this.free.values()) for (const e of list) e.texture.destroy();
    this.free.clear();
    this.freeBytes = 0;
  }

  /** Destroy everything, live textures included. */
  destroy(): void {
    this.trim();
    for (const e of this.live.values()) e.texture.destroy();
    this.live.clear();
    this.liveBytes = 0;
  }

  stats(): TexturePoolStats {
    let freeTextures = 0;
    for (const list of this.free.values()) freeTextures += list.length;
    return {
      liveTextures: this.live.size,
      liveBytes: this.liveBytes,
      freeTextures,
      freeBytes: this.freeBytes,
      peakBytes: this.peakBytes,
    };
  }
}
