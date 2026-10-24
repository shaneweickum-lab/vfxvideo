/** One pen/pointer sample, copied out of a PointerEvent so it is serializable. */
export interface PenSample {
  /** Event timestamp in milliseconds (PointerEvent.timeStamp). */
  t: number;
  x: number;
  y: number;
  pointerType: string;
  /** 0..1. Devices without pressure report 0.5 while pressed. */
  pressure: number;
  tangentialPressure: number;
  /** Degrees, -90..90. */
  tiltX: number;
  tiltY: number;
  /** Degrees, 0..359. */
  twist: number;
  buttons: number;
}

export type PressureVerdict = "real" | "limited" | "none" | "untested";

export interface PenSummary {
  pointerTypes: string[];
  strokes: number;
  events: number;
  samples: number;
  pressure: { min: number; max: number; distinctLevels: number; verdict: PressureVerdict };
  tilt: { seen: boolean; maxAbsX: number; maxAbsY: number };
  twistSeen: boolean;
  tangentialPressureSeen: boolean;
  /** Rate of dispatched pointermove events while drawing. */
  eventRateHz: number;
  /** Rate including coalesced samples: the true hardware report rate. */
  sampleRateHz: number;
  coalescedPerEvent: number;
}

/** Interval accumulator that only measures time inside strokes. */
class RateMeter {
  private last: number | null = null;
  private total = 0;
  private count = 0;

  break(): void {
    this.last = null;
  }

  tick(t: number): void {
    if (this.last !== null && t > this.last) {
      this.total += t - this.last;
      this.count++;
    }
    this.last = t;
  }

  hz(): number {
    return this.total > 0 ? (this.count / this.total) * 1000 : 0;
  }
}

/**
 * Aggregates pen samples to answer: does this device really report pressure,
 * tilt and twist, and how often? Used by the /dev pen tester.
 */
export class PenStats {
  private types = new Set<string>();
  private strokes = 0;
  private events = 0;
  private samples = 0;
  private pressedPressures = new Set<number>();
  private minP = Infinity;
  private maxP = -Infinity;
  private maxTiltX = 0;
  private maxTiltY = 0;
  private twist = false;
  private tangential = false;
  private eventMeter = new RateMeter();
  private sampleMeter = new RateMeter();

  beginStroke(): void {
    this.strokes++;
    this.eventMeter.break();
    this.sampleMeter.break();
  }

  /**
   * Record one dispatched event. `samples` are its coalesced samples (or just
   * the event itself when coalesced events are unavailable).
   */
  addEvent(samples: readonly PenSample[]): void {
    const last = samples[samples.length - 1];
    if (!last) return;
    this.events++;
    this.eventMeter.tick(last.t);
    for (const s of samples) {
      this.samples++;
      this.sampleMeter.tick(s.t);
      this.types.add(s.pointerType);
      if (s.buttons !== 0) {
        // Quantize so float noise does not inflate the level count.
        this.pressedPressures.add(Math.round(s.pressure * 4096));
        this.minP = Math.min(this.minP, s.pressure);
        this.maxP = Math.max(this.maxP, s.pressure);
      }
      this.maxTiltX = Math.max(this.maxTiltX, Math.abs(s.tiltX));
      this.maxTiltY = Math.max(this.maxTiltY, Math.abs(s.tiltY));
      if (s.twist !== 0) this.twist = true;
      if (s.tangentialPressure !== 0) this.tangential = true;
    }
  }

  summary(): PenSummary {
    const levels = this.pressedPressures.size;
    let verdict: PressureVerdict;
    if (levels === 0) verdict = "untested";
    else if (levels === 1 && this.pressedPressures.has(2048)) verdict = "none";
    else if (levels >= 16 && this.maxP - this.minP >= 0.3) verdict = "real";
    else verdict = "limited";

    return {
      pointerTypes: [...this.types].sort(),
      strokes: this.strokes,
      events: this.events,
      samples: this.samples,
      pressure: {
        min: levels ? this.minP : 0,
        max: levels ? this.maxP : 0,
        distinctLevels: levels,
        verdict,
      },
      tilt: {
        seen: this.maxTiltX > 0 || this.maxTiltY > 0,
        maxAbsX: this.maxTiltX,
        maxAbsY: this.maxTiltY,
      },
      twistSeen: this.twist,
      tangentialPressureSeen: this.tangential,
      eventRateHz: this.eventMeter.hz(),
      sampleRateHz: this.sampleMeter.hz(),
      coalescedPerEvent: this.events ? this.samples / this.events : 0,
    };
  }
}
