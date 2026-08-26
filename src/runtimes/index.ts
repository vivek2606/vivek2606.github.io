import type { LanguageRuntime } from "./types";
import { UnsupportedRuntime } from "./types";
import { pythonRuntime } from "./python";
import { rRuntime } from "./r";

// Register a runtime here to light up a new language across the whole
// blog. Julia and Haskell don't yet have a runtime wired up — no mature
// in-browser WASM interpreter with an interactive REPL exists for either
// yet, so they render as "coming soon".
const registry: Record<string, LanguageRuntime> = {
  python: pythonRuntime,
  r: rRuntime,
  julia: new UnsupportedRuntime(
    "julia",
    "Julia",
    "Julia has no mature in-browser WASM runtime yet, so live execution isn't available.",
  ),
  haskell: new UnsupportedRuntime(
    "haskell",
    "Haskell",
    "Haskell has no mature in-browser WASM runtime yet, so live execution isn't available.",
  ),
};

export function getRuntime(lang: string): LanguageRuntime {
  const runtime = registry[lang.toLowerCase()];
  if (!runtime) {
    return new UnsupportedRuntime(lang, lang, `Unknown language "${lang}".`);
  }
  return runtime;
}
