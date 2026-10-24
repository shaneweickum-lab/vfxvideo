import type { Metadata } from "next";

import { DevConsole } from "@/components/devtools/dev-console";

// Development debugger. This file uses the ".dev.tsx" extension so it is only
// built when devtools are enabled (see next.config.ts). Never link to it from
// user-facing UI without checking DEVTOOLS_ENABLED.
export const metadata: Metadata = { title: "Debugger", robots: { index: false } };

export default function DevPage() {
  return <DevConsole />;
}
