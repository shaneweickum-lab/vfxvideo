DOCUMENT: Package guide
SCOPE: /packages/gpu
PART: 1

PURPOSE: WebGPU foundation.

CONTAINS: Device acquisition, texture pool, shader registry, viewer surface (OffscreenCanvas), display-p3 output.

STATUS: Scaffold (empty). Planned in batch B0.3.

MAY IMPORT: core, devtools. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/gpu`, never from deep paths.
