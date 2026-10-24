import type { Capability } from "@vfxvideo/devtools";

/**
 * Capabilities that only exist on a window (display, input, file pickers).
 * Worker-safe probes live in @vfxvideo/devtools.
 */
export function probeBrowserCapabilities(): Capability[] {
  const mq = (q: string) => window.matchMedia(q).matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const caps: Capability[] = [
    {
      id: "display.gamut",
      group: "display",
      label: "Wide color display",
      status: mq("(color-gamut: p3)") ? "yes" : "no",
      detail: mq("(color-gamut: rec2020)")
        ? "Rec.2020"
        : mq("(color-gamut: p3)")
          ? "Display P3"
          : "sRGB",
    },
    {
      id: "display.hdr",
      group: "display",
      label: "HDR display",
      status: mq("(dynamic-range: high)") ? "yes" : "no",
    },
    {
      id: "display.dpr",
      group: "display",
      label: "Pixel ratio",
      status: "yes",
      detail: `${window.devicePixelRatio}x, ${screen.width}x${screen.height} screen`,
    },
    {
      id: "input.fine",
      group: "input",
      label: "Fine pointer (mouse/pen)",
      status: mq("(any-pointer: fine)") ? "yes" : "no",
    },
    {
      id: "input.touch",
      group: "input",
      label: "Touch",
      status: navigator.maxTouchPoints > 0 ? "yes" : "no",
      detail: `${navigator.maxTouchPoints} touch points`,
    },
    {
      id: "input.coalesced",
      group: "input",
      label: "Coalesced pointer events",
      status: "getCoalescedEvents" in PointerEvent.prototype ? "yes" : "no",
      detail: "full-rate pen samples between frames",
    },
    {
      id: "input.predicted",
      group: "input",
      label: "Predicted pointer events",
      status: "getPredictedEvents" in PointerEvent.prototype ? "yes" : "no",
      detail: "reduces visible brush lag",
    },
    {
      id: "storage.fsaccess",
      group: "storage",
      label: "File System Access (real folders)",
      ...("showDirectoryPicker" in window
        ? { status: "yes" as const }
        : { status: "no" as const, detail: "uses import/export instead" }),
    },
    {
      id: "compute.cores",
      group: "compute",
      label: "CPU threads",
      status: "yes",
      detail: `${navigator.hardwareConcurrency}${nav.deviceMemory ? `, ~${nav.deviceMemory} GB RAM reported` : ""}`,
    },
  ];
  return caps;
}
