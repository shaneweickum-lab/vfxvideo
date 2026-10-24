DOCUMENT: Package guide
SCOPE: /packages/color
PART: 1

PURPOSE: Color management.

CONTAINS: Working space (scene-linear ACEScg), input transforms, view transforms, 3D LUTs, WGSL color functions.

STATUS: Scaffold (empty). Planned in batch B0.5.

MAY IMPORT: core, devtools. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/color`, never from deep paths.
