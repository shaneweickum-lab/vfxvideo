import { describe, expect, it } from "vitest";

import {
  canvasToImage,
  fitViewport,
  imageToCanvas,
  MAX_ZOOM,
  panViewport,
  setViewportZoom,
  zoomViewportAt,
} from "./viewport";

const canvas = { width: 1000, height: 500 };
const image = { width: 1920, height: 1080 };

describe("viewport math", () => {
  it("fits a wide image by its limiting dimension and centers it", () => {
    const v = fitViewport(image, canvas, 0);
    expect(v.zoom).toBeCloseTo(500 / 1080);
    expect(v.center).toEqual({ x: 960, y: 540 });
    expect(imageToCanvas(v, canvas, { x: 960, y: 540 })).toEqual({ x: 500, y: 250 });
  });

  it("round-trips canvas and image coordinates", () => {
    const v = { zoom: 2.5, center: { x: 300, y: 200 } };
    const p = { x: 123, y: 456 };
    const back = imageToCanvas(v, canvas, canvasToImage(v, canvas, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  it("keeps the anchor point fixed while zooming", () => {
    const v = fitViewport(image, canvas);
    const anchor = { x: 820, y: 90 };
    const before = canvasToImage(v, canvas, anchor);
    const z = zoomViewportAt(v, canvas, 3, anchor);
    const after = canvasToImage(z, canvas, anchor);
    expect(z.zoom).toBeCloseTo(v.zoom * 3);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("pans so content follows the pointer", () => {
    const v = { zoom: 2, center: { x: 100, y: 100 } };
    const p = { x: 400, y: 300 };
    const under = canvasToImage(v, canvas, p);
    const moved = panViewport(v, 50, -20);
    const now = imageToCanvas(moved, canvas, under);
    expect(now).toEqual({ x: 450, y: 280 });
  });

  it("clamps zoom", () => {
    const v = setViewportZoom({ zoom: 1, center: { x: 0, y: 0 } }, 1e6);
    expect(v.zoom).toBe(MAX_ZOOM);
  });
});
