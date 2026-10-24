import { describe, expect, it } from "vitest";

import { type PenSample, PenStats } from "./pen";

function sample(t: number, pressure: number, extra: Partial<PenSample> = {}): PenSample {
  return {
    t,
    x: t,
    y: t,
    pointerType: "pen",
    pressure,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    buttons: 1,
    ...extra,
  };
}

describe("PenStats", () => {
  it("reports untested before any input", () => {
    const s = new PenStats().summary();
    expect(s.pressure.verdict).toBe("untested");
    expect(s.eventRateHz).toBe(0);
  });

  it("detects a mouse-like device that reports constant 0.5 pressure", () => {
    const stats = new PenStats();
    stats.beginStroke();
    for (let i = 0; i < 20; i++) stats.addEvent([sample(i * 16, 0.5, { pointerType: "mouse" })]);
    expect(stats.summary().pressure.verdict).toBe("none");
  });

  it("detects real pressure from many levels across a wide range", () => {
    const stats = new PenStats();
    stats.beginStroke();
    for (let i = 0; i < 64; i++) stats.addEvent([sample(i * 4, 0.1 + i * 0.012)]);
    const s = stats.summary();
    expect(s.pressure.verdict).toBe("real");
    expect(s.pressure.distinctLevels).toBe(64);
    expect(s.pressure.min).toBeCloseTo(0.1);
  });

  it("calls a narrow set of levels limited", () => {
    const stats = new PenStats();
    stats.beginStroke();
    for (let i = 0; i < 10; i++) stats.addEvent([sample(i * 10, i % 2 ? 0.4 : 0.6)]);
    expect(stats.summary().pressure.verdict).toBe("limited");
  });

  it("measures event and coalesced sample rates only within strokes", () => {
    const stats = new PenStats();
    stats.beginStroke();
    // 60 Hz events, each carrying 4 coalesced samples at 240 Hz.
    for (let e = 0; e < 10; e++) {
      const base = e * (1000 / 60);
      stats.addEvent(
        [0, 1, 2, 3].map((k) => sample(base + (k - 3) * (1000 / 240), 0.5 + k * 0.01)),
      );
    }
    stats.beginStroke(); // a long pause between strokes must not lower the rate
    stats.addEvent([sample(100_000, 0.5)]);
    const s = stats.summary();
    expect(s.eventRateHz).toBeCloseTo(60, 0);
    expect(s.sampleRateHz).toBeCloseTo(240, 0);
    expect(s.coalescedPerEvent).toBeCloseTo(41 / 11);
    expect(s.strokes).toBe(2);
  });

  it("tracks tilt, twist and pointer types; ignores hover pressure", () => {
    const stats = new PenStats();
    stats.beginStroke();
    stats.addEvent([sample(0, 0, { buttons: 0, tiltX: -35 })]);
    stats.addEvent([sample(5, 0.7, { tiltY: 20, twist: 90, pointerType: "touch" })]);
    const s = stats.summary();
    expect(s.tilt).toEqual({ seen: true, maxAbsX: 35, maxAbsY: 20 });
    expect(s.twistSeen).toBe(true);
    expect(s.pointerTypes).toEqual(["pen", "touch"]);
    expect(s.pressure.distinctLevels).toBe(1);
  });
});
