DOCUMENT: Package guide
SCOPE: /packages/devtools
PART: 1

PURPOSE: Diagnostics collectors used by the /dev debugger.

CONTAINS: Log ring buffer, timing probes, counters, capability snapshot types. Never holds secrets.

STATUS: Scaffold (empty). Planned in batch B0.2.

MAY IMPORT: core. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/devtools`, never from deep paths.
