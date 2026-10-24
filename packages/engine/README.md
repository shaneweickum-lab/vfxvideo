DOCUMENT: Package guide
SCOPE: /packages/engine
PART: 1

PURPOSE: The engine worker.

CONTAINS: Worker entry point that owns the GPUDevice and the live document, plus the typed message protocol the UI uses to talk to it.

STATUS: Scaffold (empty). Planned in batch B0.3.

MAY IMPORT: core, devtools, color, gpu, io, document, graph, nodes. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/engine`, never from deep paths.
