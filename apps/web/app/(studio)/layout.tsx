import Link from "next/link";

import { EngineStatusLabel } from "@/components/studio/engine-status";
import { PageTabs } from "@/components/studio/page-tabs";
import { ToolRail } from "@/components/studio/tool-rail";
import { BUILD_INFO, DEVTOOLS_ENABLED } from "@/lib/build-info";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          VFXVideo
        </Link>
        <PageTabs />
        <div className="w-16" />
      </header>

      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <main className="flex min-w-0 flex-1">{children}</main>
        <aside className="hidden w-72 shrink-0 flex-col border-l lg:flex">
          <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Inspector
          </div>
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            Nothing selected
          </div>
        </aside>
      </div>

      <footer className="flex h-7 shrink-0 items-center justify-between border-t px-3 font-mono text-[11px] text-muted-foreground">
        <span>
          Stage {BUILD_INFO.stage} · {BUILD_INFO.batch}
          <span className="hidden sm:inline"> · {BUILD_INFO.label}</span>
        </span>
        <span className="flex items-center gap-3">
          <EngineStatusLabel />
          {DEVTOOLS_ENABLED ? (
            <Link href="/dev" className="text-amber-300 hover:underline">
              debugger
            </Link>
          ) : null}
        </span>
      </footer>
    </div>
  );
}
