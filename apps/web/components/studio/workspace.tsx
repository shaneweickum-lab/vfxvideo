import { getStudioPage, type StudioPageId } from "@/lib/studio-pages";

// Placeholder workspace for a studio page. The viewer becomes a WebGPU
// surface owned by the engine worker in batch B0.3.
export function Workspace({ pageId, panel }: { pageId: StudioPageId; panel?: string }) {
  const page = getStudioPage(pageId);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-viewer">
        <div className="space-y-2 px-4 text-center">
          <page.icon className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">{page.label}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {page.summary} Arrives in Stage {page.stage}.
          </p>
        </div>
      </div>
      {panel ? (
        <div className="flex h-40 shrink-0 items-center justify-center border-t text-xs text-muted-foreground">
          {panel}
        </div>
      ) : null}
    </div>
  );
}
