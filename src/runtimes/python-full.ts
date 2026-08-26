import type { LanguageRuntime, RunResult } from "./types";

// Unlike PythonRuntime (bare stdlib, fully self-hosted from public/pyodide/),
// this variant loads NumPy/Pandas/Matplotlib/scikit-learn on demand from
// Pyodide's own CDN. Those packages aren't part of the npm `pyodide`
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

class PythonFullRuntime implements LanguageRuntime {
  id = "python-full";
  label = "Python (NumPy/Pandas/Matplotlib/scikit-learn)";

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
      const needsMatplotlib = /\bmatplotlib\b/.test(code);
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
      return { ok: true, stdout, images };
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
