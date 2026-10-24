DOCUMENT: Package guide
SCOPE: /packages/core
PART: 1

PURPOSE: Foundation types shared by every package.

CONTAINS: Math (vectors, matrices), stable ids, rational time, error types, a small event emitter.

STATUS: Scaffold (empty). Planned in batch B0.3+ (rational time and ids arrive with the document model in B0.6).

MAY IMPORT: nothing. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/core`, never from deep paths.
