DOCUMENT: Package guide
SCOPE: /packages/io
PART: 1

PURPOSE: Image file input and output.

CONTAINS: PNG and JPEG via browser decoders, EXR read and write, upload to GPU textures.

STATUS: Scaffold (empty). Planned in batch B0.4.

MAY IMPORT: core, devtools, color, gpu. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/io`, never from deep paths.
