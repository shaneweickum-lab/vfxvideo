import { execSync } from "node:child_process";

import type { NextConfig } from "next";

// The /dev debugger is built only into local development and Vercel preview
// deployments, never into production. Exclusion happens at build time: its
// route files use the ".dev.tsx" extension, which is only registered as a
// page extension when enabled. See docs/ARCHITECTURE.txt Section 10.
const devtoolsEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.VERCEL_ENV === "preview" ||
  process.env.ENABLE_DEVTOOLS === "1";

function gitSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  // Static export: the studio runs entirely in the browser, no server.
  // See docs/ARCHITECTURE.txt Section 1.
  output: "export",
  images: { unoptimized: true },
  pageExtensions: devtoolsEnabled ? ["tsx", "ts", "dev.tsx"] : ["tsx", "ts"],
  env: {
    NEXT_PUBLIC_DEVTOOLS: devtoolsEnabled ? "1" : "0",
    NEXT_PUBLIC_GIT_SHA: gitSha(),
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  },
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
