"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { STUDIO_PAGES } from "@/lib/studio-pages";
import { cn } from "@/lib/utils";

export function PageTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {STUDIO_PAGES.map((page) => {
        const active = pathname.startsWith(page.href);
        return (
          <Link
            key={page.id}
            href={page.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <page.icon className="size-3.5" />
            <span className="hidden sm:inline">{page.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
