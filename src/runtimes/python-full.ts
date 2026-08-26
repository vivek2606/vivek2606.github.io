import type { LanguageRuntime, RunResult, BokehPayload } from "./types";

// Unlike PythonRuntime (bare stdlib, fully self-hosted from public/pyodide/),
// this variant loads NumPy/Pandas/scikit-learn/Matplotlib/Bokeh on demand
// from Pyodide's own CDN. Those packages aren't part of the npm `pyodide`
// distribution — only the interpreter core and stdlib are — so self-hosting
// them means vendoring 100MB+ of wasm wheels into this repo. Loading the
// interpreter itself from the same CDN (rather than mixing indexURLs, which
// Pyodide doesn't support per-package) keeps that cost opt-in: only posts
// that use this runtime take on the CDN dependency and the larger download;
// the plain "python" runtime used elsewhere stays untouched and self-hosted.
const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

declare global {
  interface Window {
    loadPyodideFull?: (config: { indexURL: string }) => Promise<PyodideFullInterface>;
  }
}

interface PyodideFullInterface {
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: { batched: (msg: string) => void }): void;
  setStderr(options: { batched: (msg: string) => void }): void;
  loadPackagesFromImports(
    code: string,
    options?: { messageCallback?: (message: string) => void },
  ): Promise<unknown>;
}

let scriptPromise: Promise<void> | null = null;
let pyodidePromise: Promise<PyodideFullInterface> | null = null;
let pyodide: PyodideFullInterface | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.loadPyodideFull) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `${PYODIDE_CDN_URL}pyodide.js`;
    script.onload = () => {
      // pyodide.js always defines the global as `loadPyodide`; alias it so
      // this loader never collides with the self-hosted core runtime's copy
      // if both happen to be on the page at once.
      window.loadPyodideFull = (
        window as unknown as { loadPyodide: typeof window.loadPyodideFull }
      ).loadPyodide;
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Failed to load the Python runtime from the Pyodide CDN. Check your network connection."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

const MATPLOTLIB_SETUP = `
import matplotlib
matplotlib.use("Agg")
`;

const FIGURE_CAPTURE = `
import base64 as _b64, io as _io
def __capture_figures():
    try:
        import matplotlib.pyplot as _plt
    except ImportError:
        return []
    images = []
    for num in _plt.get_fignums():
        fig = _plt.figure(num)
        buf = _io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", dpi=110)
        buf.seek(0)
        images.append(_b64.b64encode(buf.read()).decode("ascii"))
    _plt.close("all")
    return images
__capture_figures()
`;

// Bokeh has no equivalent of matplotlib's "currently open figures" registry
// outside a running Bokeh server, so figures are found by scanning the
// globals left behind by the user's code for anything Plot-like (figure()
// returns a Plot subclass) — any such variable gets rendered, no special
// naming convention required. json_item() is Bokeh's own documented
// mechanism for embedding a plot outside of output_file()/show(): it
// returns a small JSON-safe dict that BokehJS's embed_item() can render
// into a target <div> without a Jupyter/server connection.
const BOKEH_CAPTURE = `
import json as _json
def __capture_bokeh():
    try:
        import bokeh
        from bokeh.embed import json_item as _json_item
        from bokeh.models import Plot as _BokehPlotBase
    except ImportError:
        return None
    items = []
    for _name, _val in list(globals().items()):
        if isinstance(_val, _BokehPlotBase):
            items.append(_json_item(_val, _name))
    if not items:
        return None
    return _json.dumps({"version": bokeh.__version__, "items": items})
__capture_bokeh()
`;

class PythonFullRuntime implements LanguageRuntime {
  id = "python-full";
  label = "Python (NumPy/Pandas/scikit-learn/Bokeh)";

  isLoaded(): boolean {
    return pyodide !== null;
  }

  async load(onStatus: (message: string) => void): Promise<void> {
    if (pyodide) return;
    if (!pyodidePromise) {
      pyodidePromise = (async () => {
        onStatus("Downloading Python runtime from the Pyodide CDN (~10 MB, cached after first run)…");
        await loadScript();
        onStatus("Starting interpreter…");
        const instance = await window.loadPyodideFull!({ indexURL: PYODIDE_CDN_URL });
        pyodide = instance;
        return instance;
      })();
    }
    await pyodidePromise;
  }

  async run(code: string): Promise<RunResult> {
    if (!pyodide) {
      return { ok: false, stdout: "", error: "Runtime not loaded yet." };
    }
    let stdout = "";
    pyodide.setStdout({ batched: (msg) => (stdout += msg + "\n") });
    pyodide.setStderr({ batched: (msg) => (stdout += msg + "\n") });
    try {
      await pyodide.loadPackagesFromImports(code, {
        messageCallback: (msg) => (stdout += msg + "\n"),
      });
      // Matched against actual import statements, not the whole source —
      // a comment or string merely mentioning "matplotlib"/"bokeh" must
      // not trigger this (it did, and broke, before this check existed).
      const needsMatplotlib = /^\s*(?:import|from)\s+matplotlib\b/m.test(code);
      if (needsMatplotlib) {
        await pyodide.runPythonAsync(MATPLOTLIB_SETUP);
      }
      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined && result !== null) {
        stdout += `${result}\n`;
      }
      let images: string[] | undefined;
      if (needsMatplotlib) {
        const raw = await pyodide.runPythonAsync(FIGURE_CAPTURE);
        const converted = raw && typeof (raw as { toJs?: unknown }).toJs === "function"
          ? (raw as { toJs: () => unknown }).toJs()
          : raw;
        (raw as { destroy?: () => void } | null)?.destroy?.();
        if (Array.isArray(converted) && converted.length > 0) {
          images = converted as string[];
        }
      }
      let bokeh: BokehPayload | undefined;
      if (/^\s*(?:import|from)\s+bokeh\b/m.test(code)) {
        // A plain JSON string round-trips through the FFI boundary as a
        // regular JS string with no PyProxy involved, unlike a Python
        // list/dict return value — simplest thing that works here.
        const raw = await pyodide.runPythonAsync(BOKEH_CAPTURE);
        if (typeof raw === "string") {
          bokeh = JSON.parse(raw) as BokehPayload;
        }
      }
      return { ok: true, stdout, images, bokeh };
    } catch (err) {
      return {
        ok: false,
        stdout,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const pythonFullRuntime = new PythonFullRuntime();
