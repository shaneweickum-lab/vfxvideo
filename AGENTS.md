DOCUMENT: Agent Repository Guide
SCOPE: / (whole repository)
PART: 1

PURPOSE:
Orientation for AI coding agents. Read this first, then only the directory
README for the area your task touches.

CONTAINS:

- Where things are, layering rules, protected paths, how to verify work,
  current batch, continuation instructions.

# Where things are

| Path                       | What                                          | Read                        |
| -------------------------- | --------------------------------------------- | --------------------------- |
| `apps/web/`                | Next.js PWA: routes, UI, input                | `apps/web/README.md`        |
| `packages/<name>/`         | Engine packages, no UI framework, worker-safe | `packages/<name>/README.md` |
| `docs/PLATFORM_DESIGN.txt` | Vision, decisions, roadmap                    | when scope is unclear       |
| `docs/ARCHITECTURE.txt`    | Data model, node contract, batches            | before any engine work      |
| `docs/BATCH_LOG.txt`       | Batch reviews, open issues                    | at the start of a session   |
| `docs/learn/`              | Educational notes for humans                  | when adding a stage feature |

# Layering (enforced, do not work around)

- `packages/*` never import React, Next.js, or DOM APIs. Their tsconfig uses
  the `WebWorker` lib, so `document`/`window` fail to typecheck.
- Packages import only lower layers. Order and allowed lists live in
  `eslint.config.mjs` (`LAYERS`). Violations are lint errors.
- `apps/web` talks to the engine only through `@vfxvideo/engine`'s message
  protocol (arrives in B0.3).
- Packages export source (`src/index.ts`); `apps/web/next.config.ts` lists
  them in `transpilePackages`. Add new packages there too.

# Protected paths

Do not modify these unless the human explicitly authorizes that specific
change. If one is genuinely required, stop and report why.

- `LICENSE`
- `docs/PLATFORM_DESIGN.txt` (human-approved design; decisions log)
- `docs/ARCHITECTURE.txt` (human-approved plan)

# Conventions

- TypeScript strict. Versions shared via `catalog:` in `pnpm-workspace.yaml`.
- Design and planning docs are `.txt` (owner preference). `README.md` and
  `AGENTS.md` are Markdown by convention.
- UI: Tailwind v4 + shadcn/ui components in `apps/web/components/ui`.
- Colors come from CSS tokens in `apps/web/app/globals.css`, never hex in components.

# Verify before claiming done

```sh
pnpm check && pnpm build
```

Never report something as tested unless it was run.

# Current position

Stage 0. B0.1 approved. B0.2 (debugger at /dev) complete, awaiting review.
Next: B0.3, GPU foundation + engine worker.
The /dev debugger is gated in `apps/web/next.config.ts`; debugger route files
use the `.dev.tsx` extension and must never be imported by normal pages.
See `docs/BATCH_LOG.txt` for open issues.
