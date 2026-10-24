import { describe, expect, it, vi } from "vitest";

import { LogBuffer } from "./log";

describe("LogBuffer", () => {
  it("keeps entries in order with increasing sequence numbers", () => {
    const buf = new LogBuffer(10);
    buf.info("ui", "a");
    buf.warn("engine", "b", { x: 1 });
    const list = buf.list();
    expect(list.map((e) => e.message)).toEqual(["a", "b"]);
    expect(list[1]).toMatchObject({ seq: 2, level: "warn", source: "engine", data: { x: 1 } });
    expect(list[0]).not.toHaveProperty("data");
  });

  it("drops the oldest entries beyond capacity", () => {
    const buf = new LogBuffer(3);
    for (let i = 1; i <= 5; i++) buf.debug("t", `m${i}`);
    expect(buf.list().map((e) => e.message)).toEqual(["m3", "m4", "m5"]);
    expect(buf.list()[0]?.seq).toBe(3);
  });

  it("notifies subscribers until unsubscribed", () => {
    const buf = new LogBuffer();
    const listener = vi.fn();
    const off = buf.subscribe(listener);
    buf.error("t", "first");
    off();
    buf.error("t", "second");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ message: "first" });
  });

  it("returns a copy from list()", () => {
    const buf = new LogBuffer();
    buf.info("t", "x");
    const snapshot = buf.list();
    buf.clear();
    expect(snapshot).toHaveLength(1);
    expect(buf.list()).toHaveLength(0);
  });

  it("rejects invalid capacity", () => {
    expect(() => new LogBuffer(0)).toThrow(RangeError);
  });
});
