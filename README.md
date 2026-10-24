# VFXVideo Studio

An open-source art studio that runs in your browser: photo editing, video
editing, visual effects compositing, and drawing and animation, all built on
one shared engine.

It is an internal tool and a learning project first. Every stage of the build
comes with notes explaining how it works, in [`docs/learn/`](docs/learn/).

> **Status:** Stage 0, batch B0.2. The app shell and a developer debugger
> (`/dev`, dev and preview builds only) exist; nothing edits images yet. See the [roadmap](docs/PLATFORM_DESIGN.txt) (Section 6).

## The four pages

| Page      | What it does                                   | Stage |
| --------- | ---------------------------------------------- | ----- |
| **Photo** | Layers, masks, adjustments, retouching         | 1     |
| **Edit**  | Timeline video editing, transitions, audio     | 2     |
| **Comp**  | Node-based compositing: keying, roto, tracking | 3     |
| **Draw**  | Pen painting and frame-by-frame animation      | 4     |

Our own AI tools come after these, in Stage 6, built on the same engine.

## Running it

You need [Node.js 22](https://nodejs.org) and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev          # open http://localhost:3000
```

Other commands:

```sh
pnpm check        # typecheck + lint + tests, everything
pnpm build        # static build into apps/web/out
pnpm format       # format all files
```

Use Chrome on the Mac for development. Safari 26 and Chrome on ChromeOS are
also supported targets.

## Documentation

- [`docs/PLATFORM_DESIGN.txt`](docs/PLATFORM_DESIGN.txt): vision, decisions, roadmap
- [`docs/ARCHITECTURE.txt`](docs/ARCHITECTURE.txt): how the system is built
- [`docs/BATCH_LOG.txt`](docs/BATCH_LOG.txt): what each batch delivered
- [`AGENTS.md`](AGENTS.md): guide for AI coding agents working in this repo

## License

[Apache-2.0](LICENSE)
