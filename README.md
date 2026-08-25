# Personal blog with inline, runnable code

A blog (Astro + MDX) for writing posts with code examples that run live
in the visitor's browser via WASM — no server-side execution, no backend
to operate.

## Stack

- **Astro** for content/routing — islands mean the WASM runtime only loads
  on pages that actually use it, not on every page load.
- **MDX** for posts, so a post can mix prose with a `<CodeRunner />` island.
- **React** (`@astrojs/react`) just for the `CodeRunner` island itself.

## Running locally

```sh
npm install
npm run dev
```

## How a runnable block works

Authors write:

```mdx
import CodeRunner from "../../components/CodeRunner.tsx";

<CodeRunner client:visible lang="python" code={`print("hi")`} />
```

`CodeRunner` (`src/components/CodeRunner.tsx`) is a plain editable textarea +
Run button + output pane. It doesn't know anything about Python
specifically — it looks up a `LanguageRuntime` for whatever `lang` prop it's
given (`src/runtimes/index.ts`) and calls `load()` then `run()` on it.

`client:visible` means the island (and its JS) only hydrates once the block
scrolls into view — and the runtime itself is only downloaded on the first
click of Run, not on page load.

## Language status

| Language | Status | Notes |
| --- | --- | --- |
| Python | ✅ working | [Pyodide](https://pyodide.org), self-hosted from `public/pyodide/` (copied from the npm package by `scripts/copy-pyodide-assets.mjs`) |
| R | ✅ working | [webR](https://docs.r-wasm.org/webr/latest/), self-hosted from `public/webr/` (copied from the npm package by `scripts/copy-webr-assets.mjs`) |
| Julia | ❌ blocked | no mature in-browser WASM runtime with an interactive REPL yet |
| Haskell | ❌ blocked | same — WASM compilation exists, an interactive REPL doesn't |

Until Julia/Haskell have real runtimes, blocks for those languages render a
"coming soon" / "not available" message (`UnsupportedRuntime` in
`src/runtimes/types.ts`) instead of crashing the page.

### Notes on the R runtime

- webR's own `captureR()` defaults to `withAutoprint: false`; the R runtime
  (`src/runtimes/r.ts`) passes `withAutoprint: true` so a bare expression at
  the end of a block prints the way it would at an R console, matching how
  the Python runtime handles a trailing expression.
- Each run uses its own `Shelter` and calls `purge()` afterwards, so R
  objects created by one run don't accumulate in memory across repeated
  clicks of Run on the same page.
- webR picks its communication channel automatically: `SharedArrayBuffer`
  when the page is cross-origin isolated, otherwise a `postMessage`-based
  fallback that works without any special server headers. No configuration
  needed either way.
- Plot output isn't captured or rendered — `captureGraphics` is explicitly
  turned off in `src/runtimes/r.ts`. It's not just unimplemented: leaving
  it on makes `captureR` throw under the `postMessage` fallback channel.
  Revisit this if/when plot support is added.
- The real `import("webr")` call is isolated in a plain `.js` file
  (`src/runtimes/webr-loader.js`, typed by the sibling
  `webr-loader.d.ts`) rather than living directly in `r.ts`. This is a
  deliberate workaround, not a style preference — see `npm run typecheck`
  below.

## Typechecking (`npm run typecheck`)

`astro check` is **not** part of `npm run build` here, unlike a typical
Astro project. It's a separate, opt-in script because running it with
`webr` installed reliably exhausts 8GB+ of heap and crashes — this
reproduces even with nothing in the project importing anything from
`webr`, so it's inherent to that package being a dependency (its `d.ts`
files lean on deeply generic Proxy types that are extremely expensive for
`tsc` to resolve), not something under this project's control. `astro
build` itself doesn't run a full typecheck, so it's unaffected and stays
fast. Run `npm run typecheck` manually if you want it, with enough memory
headroom.

## Adding a new post

Drop an `.mdx` file in `src/content/blog/` with frontmatter matching the
schema in `src/content/config.ts` (`title`, `description`, `date`, `tags`).

## Security note

Code runs entirely client-side in the visitor's own browser tab (Pyodide and
webR are sandboxed the same way any other WASM/JS in a page is) — nothing is
sent to a server, and there is no shared execution backend to secure or abuse.
