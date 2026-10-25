import type { Metadata } from "next";

import { Workspace } from "@/components/studio/workspace";

export const metadata: Metadata = { title: "Photo" };

export default function PhotoPage() {
  return <Workspace pageId="photo" viewer />;
}
