import type { Metadata } from "next";

import { Workspace } from "@/components/studio/workspace";

export const metadata: Metadata = { title: "Draw" };

export default function DrawPage() {
  return <Workspace pageId="draw" />;
}
