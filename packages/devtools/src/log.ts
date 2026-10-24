export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  /** Monotonic sequence number, unique per buffer. */
  seq: number;
  /** Milliseconds since the epoch. */
  time: number;
  level: LogLevel;
  /** Subsystem that produced the entry, e.g. "engine", "ui", "window". */
  source: string;
  message: string;
  data?: unknown;
}

export type LogListener = (entry: LogEntry) => void;

/**
 * Fixed-size ring buffer of log entries. Oldest entries are dropped first.
 * Never log secrets here: the buffer is shown verbatim in the /dev debugger.
 */
export class LogBuffer {
  readonly capacity: number;
  private entries: LogEntry[] = [];
  private nextSeq = 1;
  private listeners = new Set<LogListener>();

  constructor(capacity = 500) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`LogBuffer capacity must be a positive integer, got ${capacity}`);
    }
    this.capacity = capacity;
  }

  log(level: LogLevel, source: string, message: string, data?: unknown): LogEntry {
    const entry: LogEntry = { seq: this.nextSeq++, time: Date.now(), level, source, message };
    if (data !== undefined) entry.data = data;
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.shift();
    for (const listener of this.listeners) listener(entry);
    return entry;
  }

  debug(source: string, message: string, data?: unknown) {
    return this.log("debug", source, message, data);
  }
  info(source: string, message: string, data?: unknown) {
    return this.log("info", source, message, data);
  }
  warn(source: string, message: string, data?: unknown) {
    return this.log("warn", source, message, data);
  }
  error(source: string, message: string, data?: unknown) {
    return this.log("error", source, message, data);
  }

  /** Snapshot of current entries, oldest first. */
  list(): readonly LogEntry[] {
    return this.entries.slice();
  }

  clear(): void {
    this.entries = [];
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
