import { LogBuffer } from "@vfxvideo/devtools";

/** The app-wide diagnostic log shown in /dev. */
export const appLog = new LogBuffer(500);

let installed = false;

/** Route uncaught errors and console warnings/errors into appLog. Idempotent. */
export function installGlobalLogCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    appLog.error("window", e.message, { file: e.filename, line: e.lineno, col: e.colno });
  });
  window.addEventListener("unhandledrejection", (e) => {
    appLog.error("window", `Unhandled rejection: ${String(e.reason)}`);
  });

  for (const level of ["warn", "error"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      appLog.log(
        level,
        "console",
        args.map((a) => (typeof a === "string" ? a : safeJson(a))).join(" "),
      );
      original(...args);
    };
  }
  appLog.info("devtools", "Log capture installed");
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
