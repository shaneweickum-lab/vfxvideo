import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the studio runs entirely in the browser, no server.
  // See docs/ARCHITECTURE.txt Section 1.
  output: "export",
  images: { unoptimized: true },
  // Engine packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    "@vfxvideo/core",
    "@vfxvideo/devtools",
    "@vfxvideo/color",
    "@vfxvideo/gpu",
    "@vfxvideo/io",
    "@vfxvideo/document",
    "@vfxvideo/graph",
    "@vfxvideo/nodes",
    "@vfxvideo/engine",
  ],
};

export default nextConfig;
