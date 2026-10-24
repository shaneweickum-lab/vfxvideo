DOCUMENT: Package guide
SCOPE: /packages/nodes
PART: 1

PURPOSE: Built-in node library.

CONTAINS: Each node: definition, WGSL (GPU) implementation, CPU reference implementation, golden test.

STATUS: Scaffold (empty). Planned in batch B0.5 (first node: color.exposure).

MAY IMPORT: core, devtools, color, gpu, io, document, graph. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/nodes`, never from deep paths.
