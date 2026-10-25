import { ImageViewer } from "@/components/studio/viewer";
import { getStudioPage, type StudioPageId } from "@/lib/studio-pages";

// Workspace for a studio page: the GPU viewer when the page has one,
// otherwise a placeholder until the page's stage arrives.
export function Workspace({
  pageId,
  panel,
  viewer = false,
}: {
  pageId: StudioPageId;
  panel?: string;
  viewer?: boolean;
}) {
  const page = getStudioPage(pageId);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {viewer ? (
        <ImageViewer />
      ) : (
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-viewer">
          <div className="space-y-2 px-4 text-center">
            <page.icon className="mx-auto size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">{page.label}</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {page.summary} Arrives in Stage {page.stage}.
            </p>
          </div>
        </div>
      )}
      {panel ? (
        <div className="flex h-40 shrink-0 items-center justify-center border-t text-xs text-muted-foreground">
          {panel}
        </div>
      ) : null}
    </div>
  );
}
