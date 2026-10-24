DOCUMENT: Package guide
SCOPE: /packages/document
PART: 1

PURPOSE: The project data model.

CONTAINS: Project, Asset, Graph, Node, Param types; commands with undo/redo; command log; save/load; schema migrations.

STATUS: Scaffold (empty). Planned in batch B0.6.

MAY IMPORT: core, devtools, color, gpu, io. Enforced by `eslint.config.mjs` at the repo root.

RULES:

- No React, Next.js, or DOM APIs. Code here must run inside a Web Worker
  (`tsconfig.json` uses the WebWorker lib, not DOM, to enforce this).
- Public API is whatever `src/index.ts` exports. Other packages import only
  from `@vfxvideo/document`, never from deep paths.
