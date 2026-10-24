import Link from "next/link";

import { BUILD_STAGE, STUDIO_PAGES } from "@/lib/studio-pages";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-10 px-4 py-16 sm:px-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Stage {BUILD_STAGE.stage} · {BUILD_STAGE.batch} · {BUILD_STAGE.label}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">VFXVideo Studio</h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          One engine for photo editing, video editing, compositing and drawing. Open source, built
          in the browser, made to learn from.
        </p>
      </header>

      <nav className="grid gap-3 sm:grid-cols-2">
        {STUDIO_PAGES.map((page) => (
          <Link
            key={page.id}
            href={page.href}
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <span className="rounded-lg bg-secondary p-2.5 text-primary">
              <page.icon className="size-5" />
            </span>
            <span className="flex-1 space-y-1">
              <span className="flex items-center justify-between">
                <span className="font-medium">{page.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Stage {page.stage}
                </span>
              </span>
              <span className="block text-sm text-muted-foreground">{page.summary}</span>
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
