"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { STUDIO_PAGES } from "@/lib/studio-pages";

export function ToolRail() {
  const pathname = usePathname();
  const page = STUDIO_PAGES.find((p) => pathname.startsWith(p.href));
  if (!page) return null;
  return (
    <aside className="hidden w-12 flex-col items-center gap-1 border-r py-2 sm:flex">
      {page.tools.map((tool) => (
        <Button
          key={tool.id}
          variant="ghost"
          size="icon-sm"
          title={`${tool.label} (not yet available)`}
          aria-label={tool.label}
          disabled
        >
          <tool.icon />
        </Button>
      ))}
    </aside>
  );
}
