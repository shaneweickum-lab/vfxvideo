/**
 * Viewer pan/zoom math. All distances are in device pixels of the canvas and
 * pixels of the image. `center` is the image point shown at the canvas center.
 */
export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  zoom: number;
  center: Point;
}

export const MIN_ZOOM = 1 / 64;
export const MAX_ZOOM = 64;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Zoom and center so the whole image fits, leaving a margin (fraction of the canvas). */
export function fitViewport(image: Size, canvas: Size, margin = 0.05): Viewport {
  const usableW = canvas.width * (1 - 2 * margin);
  const usableH = canvas.height * (1 - 2 * margin);
  const zoom = clampZoom(Math.min(usableW / image.width, usableH / image.height));
  return { zoom, center: { x: image.width / 2, y: image.height / 2 } };
}

export function canvasToImage(v: Viewport, canvas: Size, p: Point): Point {
  return {
    x: (p.x - canvas.width / 2) / v.zoom + v.center.x,
    y: (p.y - canvas.height / 2) / v.zoom + v.center.y,
  };
}

export function imageToCanvas(v: Viewport, canvas: Size, p: Point): Point {
  return {
    x: (p.x - v.center.x) * v.zoom + canvas.width / 2,
    y: (p.y - v.center.y) * v.zoom + canvas.height / 2,
  };
}

/** Move the view by a canvas-space drag delta (content follows the pointer). */
export function panViewport(v: Viewport, dx: number, dy: number): Viewport {
  return { zoom: v.zoom, center: { x: v.center.x - dx / v.zoom, y: v.center.y - dy / v.zoom } };
}

/** Zoom by `factor`, keeping the image point under `anchor` (canvas space) fixed. */
export function zoomViewportAt(v: Viewport, canvas: Size, factor: number, anchor: Point): Viewport {
  const zoom = clampZoom(v.zoom * factor);
  const fixed = canvasToImage(v, canvas, anchor);
  return {
    zoom,
    center: {
      x: fixed.x - (anchor.x - canvas.width / 2) / zoom,
      y: fixed.y - (anchor.y - canvas.height / 2) / zoom,
    },
  };
}

/** Set an absolute zoom (e.g. 1 = 100%) around the canvas center. */
export function setViewportZoom(v: Viewport, zoom: number): Viewport {
  return { zoom: clampZoom(zoom), center: { ...v.center } };
}
