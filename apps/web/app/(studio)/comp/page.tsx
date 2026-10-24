import type { Metadata } from "next";

import { Workspace } from "@/components/studio/workspace";

export const metadata: Metadata = { title: "Comp" };

export default function CompPage() {
  return <Workspace pageId="comp" panel="Node graph" />;
}
