import type { ShaderRegistry } from "./shaders";

// Linear-light test image used until real image loading arrives (B0.4).
// Top: color bars. Middle: a 0..1 linear ramp. Bottom left: a 1-pixel
// checkerboard (shows whether the viewer is at exactly 100%). Bottom right:
// a hue sweep. Plus a 120 px grid and a circle to check aspect ratio.
const TEST_PATTERN_WGSL = /* wgsl */ `
@group(0) @binding(0) var out: texture_storage_2d<rgba16float, write>;

fn hue(h: f32) -> vec3f {
  let k = vec3f(1.0, 2.0 / 3.0, 1.0 / 3.0);
  let p = abs(fract(vec3f(h) + k) * 6.0 - 3.0);
  return clamp(p - 1.0, vec3f(0.0), vec3f(1.0));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(out);
  if (id.x >= size.x || id.y >= size.y) { return; }
  let p = vec2f(id.xy) + 0.5;
  let uv = p / vec2f(size);

  var bars = array<vec3f, 7>(
    vec3f(1.0, 1.0, 1.0), vec3f(1.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(0.0, 1.0, 0.0),
    vec3f(1.0, 0.0, 1.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0));

  var c: vec3f;
  if (uv.y < 0.6) {
    c = bars[min(u32(uv.x * 7.0), 6u)] * 0.75;
  } else if (uv.y < 0.8) {
    c = vec3f(uv.x);
  } else if (uv.x < 0.5) {
    c = vec3f(f32((id.x + id.y) & 1u));
  } else {
    c = hue((uv.x - 0.5) * 2.0);
  }

  if (id.x % 120u == 0u || id.y % 120u == 0u) {
    c = mix(c, vec3f(0.18), 0.6);
  }
  let d = distance(p, vec2f(size) * 0.5);
  if (abs(d - f32(size.y) * 0.4) < 1.5) {
    c = vec3f(1.0);
  }
  textureStore(out, id.xy, vec4f(c, 1.0));
}
`;

/** Render the test pattern into a new rgba16float texture. */
export function createTestPattern(
  device: GPUDevice,
  shaders: ShaderRegistry,
  width = 1920,
  height = 1080,
): GPUTexture {
  const texture = device.createTexture({
    label: "test pattern",
    size: { width, height },
    format: "rgba16float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
  const pipeline = device.createComputePipeline({
    label: "test pattern",
    layout: "auto",
    compute: { module: shaders.get("test-pattern", TEST_PATTERN_WGSL), entryPoint: "main" },
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: texture.createView() }],
  });
  const encoder = device.createCommandEncoder({ label: "test pattern" });
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
  pass.end();
  device.queue.submit([encoder.finish()]);
  return texture;
}
