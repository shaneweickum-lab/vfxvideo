DOCUMENT: Package guide
SCOPE: /packages/graph
PART: 1

PURPOSE: Node graph evaluation.

CONTAINS: Pull-based evaluator, evaluation context, result cache keyed by node + params + inputs.

STATUS: Scaffold (empty). Planned in batch B0.5.

MAY IMPORT: core, devtools, color, gpu, io, document. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/graph`, never from deep paths.
