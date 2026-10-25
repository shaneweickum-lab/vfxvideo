import { describe, expect, it } from "vitest";

import { TexturePool, textureBytes } from "./texture-pool";

function fakeDevice() {
  let created = 0;
  const destroyed: unknown[] = [];
  const device = {
    createTexture: () => {
      created++;
      const t = { id: created, destroy: () => destroyed.push(t) };
      return t as unknown as GPUTexture;
    },
  };
  return { device, created: () => created, destroyed };
}

const spec = { width: 64, height: 32, format: "rgba16float" as const, usage: 4 };

describe("TexturePool", () => {
  it("computes texture sizes", () => {
    expect(textureBytes(64, 32, "rgba16float")).toBe(64 * 32 * 8);
    expect(() => textureBytes(1, 1, "depth24plus")).toThrow();
  });

  it("reuses a released texture with the same spec", () => {
    const f = fakeDevice();
    const pool = new TexturePool(f.device);
    const a = pool.acquire(spec);
    pool.release(a);
    const b = pool.acquire(spec);
    expect(b).toBe(a);
    expect(f.created()).toBe(1);
  });

  it("does not reuse across different specs", () => {
    const f = fakeDevice();
    const pool = new TexturePool(f.device);
    pool.release(pool.acquire(spec));
    pool.acquire({ ...spec, format: "rgba32float" });
    expect(f.created()).toBe(2);
  });

  it("tracks live, free and peak bytes", () => {
    const pool = new TexturePool(fakeDevice().device);
    const size = textureBytes(64, 32, "rgba16float");
    const a = pool.acquire(spec);
    pool.acquire(spec);
    expect(pool.stats()).toMatchObject({
      liveTextures: 2,
      liveBytes: 2 * size,
      peakBytes: 2 * size,
    });
    pool.release(a);
    expect(pool.stats()).toMatchObject({ liveTextures: 1, freeTextures: 1, freeBytes: size });
  });

  it("destroys instead of caching beyond the free-memory cap", () => {
    const f = fakeDevice();
    const size = textureBytes(64, 32, "rgba16float");
    const pool = new TexturePool(f.device, size);
    const a = pool.acquire(spec);
    const b = pool.acquire(spec);
    pool.release(a);
    pool.release(b);
    expect(f.destroyed).toEqual([b]);
    expect(pool.stats().freeTextures).toBe(1);
  });

  it("rejects releasing an unknown texture", () => {
    const pool = new TexturePool(fakeDevice().device);
    expect(() => pool.release({} as GPUTexture)).toThrow();
  });

  it("trim and destroy free GPU memory", () => {
    const f = fakeDevice();
    const pool = new TexturePool(f.device);
    const a = pool.acquire(spec);
    pool.acquire(spec);
    pool.release(a);
    pool.trim();
    expect(f.destroyed).toHaveLength(1);
    pool.destroy();
    expect(f.destroyed).toHaveLength(2);
    expect(pool.stats()).toMatchObject({ liveTextures: 0, freeTextures: 0, liveBytes: 0 });
  });
});
