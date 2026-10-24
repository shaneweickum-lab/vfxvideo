import type { Metadata } from "next";

import { Workspace } from "@/components/studio/workspace";

export const metadata: Metadata = { title: "Edit" };

export default function EditPage() {
  return <Workspace pageId="edit" panel="Timeline" />;
}
