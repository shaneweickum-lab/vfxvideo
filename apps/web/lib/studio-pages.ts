import {
  Blend,
  Brush,
  Crop,
  Crosshair,
  Eraser,
  Film,
  Hand,
  Image,
  Layers,
  type LucideIcon,
  MousePointer2,
  Move,
  Pencil,
  Pipette,
  Scissors,
  SlidersHorizontal,
  Spline,
  SquareDashed,
  Type,
  Workflow,
  ZoomIn,
} from "lucide-react";

export type StudioPageId = "photo" | "edit" | "comp" | "draw";

export interface StudioTool {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface StudioPage {
  id: StudioPageId;
  label: string;
  href: `/${StudioPageId}`;
  icon: LucideIcon;
  stage: number;
  summary: string;
  tools: StudioTool[];
}

// The four pages of the studio, in roadmap order (docs/PLATFORM_DESIGN.txt, Section 6).
// Tools are listed so the shell has its final shape; none are functional yet.
export const STUDIO_PAGES: StudioPage[] = [
  {
    id: "photo",
    label: "Photo",
    href: "/photo",
    icon: Image,
    stage: 1,
    summary: "Layers, masks, adjustments and retouching.",
    tools: [
      { id: "select", label: "Select", icon: MousePointer2 },
      { id: "move", label: "Move", icon: Move },
      { id: "marquee", label: "Marquee", icon: SquareDashed },
      { id: "crop", label: "Crop", icon: Crop },
      { id: "eyedropper", label: "Eyedropper", icon: Pipette },
      { id: "adjust", label: "Adjustments", icon: SlidersHorizontal },
      { id: "text", label: "Text", icon: Type },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    href: "/edit",
    icon: Film,
    stage: 2,
    summary: "Timeline editing, transitions, audio and export.",
    tools: [
      { id: "select", label: "Select", icon: MousePointer2 },
      { id: "blade", label: "Blade", icon: Scissors },
      { id: "hand", label: "Hand", icon: Hand },
      { id: "zoom", label: "Zoom", icon: ZoomIn },
    ],
  },
  {
    id: "comp",
    label: "Comp",
    href: "/comp",
    icon: Workflow,
    stage: 3,
    summary: "Node compositing, keying, roto and tracking.",
    tools: [
      { id: "select", label: "Select", icon: MousePointer2 },
      { id: "roto", label: "Roto", icon: Spline },
      { id: "track", label: "Tracker", icon: Crosshair },
      { id: "merge", label: "Merge", icon: Blend },
      { id: "layers", label: "Layers", icon: Layers },
    ],
  },
  {
    id: "draw",
    label: "Draw",
    href: "/draw",
    icon: Brush,
    stage: 4,
    summary: "Painting and frame-by-frame animation with a pen.",
    tools: [
      { id: "brush", label: "Brush", icon: Brush },
      { id: "pencil", label: "Pencil", icon: Pencil },
      { id: "eraser", label: "Eraser", icon: Eraser },
      { id: "eyedropper", label: "Eyedropper", icon: Pipette },
      { id: "layers", label: "Layers", icon: Layers },
    ],
  },
];

export function getStudioPage(id: StudioPageId): StudioPage {
  const page = STUDIO_PAGES.find((p) => p.id === id);
  if (!page) throw new Error(`Unknown studio page: ${id}`);
  return page;
}

// Current development position, shown in the status bar.
export const BUILD_STAGE = { stage: 0, batch: "B0.3", label: "GPU foundation" } as const;
