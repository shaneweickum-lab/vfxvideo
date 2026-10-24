import { describe, expect, it } from "vitest";

import { probeCapabilities, type ProbeEnv } from "./capabilities";

function fakeGpu(features: string[]): GPU {
  const adapter = {
    features: new Set(features),
    limits: {
      maxTextureDimension2D: 16384,
      maxBufferSize: 2 ** 32,
      maxStorageBufferBindingSize: 2 ** 31,
      maxComputeWorkgroupStorageSize: 32768,
      maxComputeInvocationsPerWorkgroup: 1024,
    },
    info: { vendor: "apple", architecture: "metal-3", device: "", description: "" },
  };
  return {
    requestAdapter: async () => adapter,
    getPreferredCanvasFormat: () => "bgra8unorm",
  } as unknown as GPU;
}

const byId = (r: Awaited<ReturnType<typeof probeCapabilities>>, id: string) =>
  r.capabilities.find((c) => c.id === id);

describe("probeCapabilities", () => {
  it("reports everything missing in an empty environment without throwing", async () => {
    const r = await probeCapabilities({});
    expect(r.gpu).toBeNull();
    expect(byId(r, "webgpu")?.status).toBe("no");
    expect(byId(r, "webcodecs")?.status).toBe("no");
    expect(byId(r, "codec.h264")?.status).toBe("no");
    expect(byId(r, "opfs")?.status).toBe("no");
    expect(byId(r, "wasm")?.status).toBe("no");
  });

  it("reads adapter info, features and limits", async () => {
    const r = await probeCapabilities({ gpu: fakeGpu(["shader-f16", "timestamp-query"]) });
    expect(r.gpu).toMatchObject({ vendor: "apple", preferredCanvasFormat: "bgra8unorm" });
    expect(r.gpu?.limits.maxTextureDimension2D).toBe(16384);
    expect(byId(r, "webgpu")?.detail).toBe("apple metal-3");
    expect(byId(r, "gpu.shader-f16")?.status).toBe("yes");
    expect(byId(r, "gpu.float32-filterable")?.status).toBe("no");
  });

  it("treats a null adapter as no WebGPU", async () => {
    const gpu = { requestAdapter: async () => null } as unknown as GPU;
    const r = await probeCapabilities({ gpu });
    expect(byId(r, "webgpu")).toMatchObject({ status: "no", detail: "no adapter available" });
  });

  it("splits codec support into decode and encode", async () => {
    const env: ProbeEnv = {
      VideoDecoder: {
        isConfigSupported: async (c: { codec: string }) => ({
          supported: c.codec.startsWith("avc1") || c.codec.startsWith("hvc1"),
        }),
      } as never,
      VideoEncoder: {
        isConfigSupported: async (c: { codec: string }) => ({
          supported: c.codec.startsWith("avc1"),
        }),
      } as never,
      AudioDecoder: function AudioDecoder() {},
    };
    const r = await probeCapabilities(env);
    expect(byId(r, "webcodecs")?.status).toBe("yes");
    expect(byId(r, "codec.h264")?.status).toBe("yes");
    expect(byId(r, "codec.hevc")).toMatchObject({
      status: "partial",
      detail: "decode yes, encode no",
    });
    expect(byId(r, "codec.av1")?.status).toBe("no");
  });

  it("treats a throwing codec check as unsupported", async () => {
    const throwing = {
      isConfigSupported: async () => {
        throw new TypeError("bad codec");
      },
    } as never;
    const r = await probeCapabilities({ VideoDecoder: throwing, VideoEncoder: throwing });
    expect(byId(r, "webcodecs")).toMatchObject({
      status: "partial",
      detail: "video only, no audio decoder",
    });
    expect(byId(r, "codec.vp9")?.status).toBe("no");
  });

  it("uses the real WebAssembly.validate for feature detection", async () => {
    const r = await probeCapabilities({ WebAssembly });
    expect(byId(r, "wasm")?.status).toBe("yes");
    // Node 22 supports SIMD; this guards the hand-written module bytes.
    expect(byId(r, "wasm.simd")?.status).toBe("yes");
    expect(["yes", "no"]).toContain(byId(r, "wasm.memory64")?.status);
  });

  it("only reports threads when cross-origin isolated", async () => {
    const shared = await probeCapabilities({ SharedArrayBuffer, crossOriginIsolated: false });
    expect(byId(shared, "threads")?.status).toBe("no");
    const isolated = await probeCapabilities({ SharedArrayBuffer, crossOriginIsolated: true });
    expect(byId(isolated, "threads")?.status).toBe("yes");
  });
});
