"use client";

import { EngineClient, type FromEngine } from "@vfxvideo/engine";
import { useSyncExternalStore } from "react";

import { appLog } from "@/lib/devtools/app-log";

let client: EngineClient | null = null;

/** The app's single engine worker, started on first use. Browser only. */
export function getEngine(): EngineClient {
  if (client) return client;
  const worker = new Worker(new URL("../workers/engine.worker.ts", import.meta.url), {
    type: "module",
    name: "vfxvideo-engine",
  });
  client = new EngineClient(worker);
  client.subscribe(onMessage);
  appLog.info("engine", "Engine worker started");
  return client;
}

export type EngineStatus =
  | { state: "idle" }
  | { state: "starting" }
  | { state: "ready"; adapter: string }
  | { state: "error"; message: string; noWebGpu: boolean };

let status: EngineStatus = { state: "idle" };
const statusListeners = new Set<() => void>();

function setStatus(next: EngineStatus) {
  status = next;
  for (const l of statusListeners) l();
}

function onMessage(msg: FromEngine) {
  switch (msg.type) {
    case "ready": {
      const name = [msg.adapter.vendor, msg.adapter.architecture].filter(Boolean).join(" ");
      setStatus({ state: "ready", adapter: name || "GPU" });
      break;
    }
    case "error":
      if (msg.fatal) {
        setStatus({ state: "error", message: msg.message, noWebGpu: msg.code === "no-webgpu" });
      }
      break;
    case "log":
      appLog.log(msg.entry.level, `engine/${msg.entry.source}`, msg.entry.message, msg.entry.data);
      break;
  }
}

/** Start the engine (if needed) and report "starting" until it answers. */
export function startEngine(): EngineClient {
  const c = getEngine();
  if (status.state === "idle") setStatus({ state: "starting" });
  return c;
}

export function useEngineStatus(): EngineStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => status,
  );
}
