// Engine worker entry point. The app loads this file as a module worker.
import { Engine } from "./engine";
import type { FromEngine, ToEngine } from "./protocol";

// The worker globals this file uses. Declared structurally (rather than as
// DedicatedWorkerGlobalScope) so it also typechecks under the app's DOM lib.
interface EngineWorkerScope {
  navigator: { gpu?: GPU };
  postMessage(message: FromEngine): void;
  addEventListener(type: "message", listener: (event: MessageEvent<ToEngine>) => void): void;
  requestAnimationFrame?: (callback: () => void) => number;
}

const scope = globalThis as unknown as EngineWorkerScope;

const schedule = scope.requestAnimationFrame
  ? (cb: () => void) => void scope.requestAnimationFrame?.(cb)
  : (cb: () => void) => void setTimeout(cb, 16);

const engine = new Engine((message) => scope.postMessage(message), schedule, scope.navigator.gpu);

scope.addEventListener("message", (event) => {
  engine.handle(event.data).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    engine.log.error("engine", `Failed to handle ${event.data.type}: ${message}`);
    scope.postMessage({ type: "error", code: "internal", message, fatal: false });
  });
});
