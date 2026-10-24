import { BUILD_STAGE } from "@/lib/studio-pages";

export const DEVTOOLS_ENABLED = process.env.NEXT_PUBLIC_DEVTOOLS === "1";

export const BUILD_INFO = {
  ...BUILD_STAGE,
  gitSha: process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown",
  deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV ?? "unknown",
} as const;
