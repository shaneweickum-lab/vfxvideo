// Lint rules for the engine packages (packages/*).
// apps/web has its own config (apps/web/eslint.config.mjs).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Architecture layering (docs/ARCHITECTURE.txt, Section 2).
// Each package may import only the packages listed for it.
// devtools is a diagnostics side channel that every layer above core may use.
const LAYERS = {
  core: [],
  devtools: ["core"],
  color: ["core", "devtools"],
  gpu: ["core", "devtools"],
  io: ["core", "devtools", "color", "gpu"],
  document: ["core", "devtools", "color", "gpu", "io"],
  graph: ["core", "devtools", "color", "gpu", "io", "document"],
  nodes: ["core", "devtools", "color", "gpu", "io", "document", "graph"],
  engine: ["core", "devtools", "color", "gpu", "io", "document", "graph", "nodes"],
};

const UI_FRAMEWORKS = ["react", "react-dom", "next", "@vfxvideo/web"];

const layerRules = Object.entries(LAYERS).map(([pkg, allowed]) => {
  const forbidden = Object.keys(LAYERS).filter((p) => p !== pkg && !allowed.includes(p));
  return {
    files: [`packages/${pkg}/**/*.ts`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: UI_FRAMEWORKS.flatMap((m) => [m, `${m}/*`]),
              message: "Engine packages must not depend on UI frameworks. See AGENTS.md.",
            },
            ...(forbidden.length
              ? [
                  {
                    group: forbidden.flatMap((p) => [`@vfxvideo/${p}`, `@vfxvideo/${p}/*`]),
                    message: `@vfxvideo/${pkg} may only import: ${allowed.join(", ") || "nothing"}. See docs/ARCHITECTURE.txt Section 2.`,
                  },
                ]
              : []),
          ],
        },
      ],
    },
  };
});

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "apps/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["packages/**/*.ts"],
    languageOptions: { globals: { ...globals.worker } },
  },
  ...layerRules,
);
