DOCUMENT: Package guide
SCOPE: /apps/web
PART: 1

PURPOSE: The installable web app (PWA). UI, routing, input capture.

CONTAINS:

- `app/`: App Router. `page.tsx` is the launcher; `(studio)/` holds the four
  pages sharing one shell (`(studio)/layout.tsx`). `manifest.ts` is the PWA
  manifest.
- `components/ui/`: shadcn/ui components (copied in, owned by us).
- `components/studio/`: studio shell parts (page tabs, tool rail, workspace).
- `lib/studio-pages.ts`: the page and tool registry, and the current
  build stage shown in the status bar. Update `BUILD_STAGE` each batch.
- `public/icons/`: PWA icons.

RULES:

- Static export only (`output: "export"`): no API routes, no server actions,
  no server-only features.
- Anything touching WebGPU or the engine is client-only (`"use client"` and
  dynamic import), never imported from a server component.
- Do not import engine package internals; use `@vfxvideo/<name>` entry points.
