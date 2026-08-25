import type { LanguageRuntime, RunResult } from "./types";
import type { WebRShelter } from "./webr-loader";
import { loadWebR } from "./webr-loader";

// Self-hosted rather than CDN-loaded: scripts/copy-webr-assets.mjs copies
// these files from node_modules/webr into public/webr/ at dev/build time,
// so the blog has no runtime dependency on a third-party CDN.
const WEBR_BASE_URL = "/webr/";

let shelterPromise: Promise<WebRShelter> | null = null;
let shelter: WebRShelter | null = null;

class RRuntime implements LanguageRuntime {
  id = "r";
  label = "R";

  isLoaded(): boolean {
    return shelter !== null;
  }

  async load(onStatus: (message: string) => void): Promise<void> {
    if (shelter) return;
    if (!shelterPromise) {
      onStatus("Downloading R runtime (webR, ~50 MB, cached after first run)…");
      shelterPromise = loadWebR(WEBR_BASE_URL, onStatus);
    }
    shelter = await shelterPromise;
  }

  async run(code: string): Promise<RunResult> {
    if (!shelter) {
      return { ok: false, stdout: "", error: "Runtime not loaded yet." };
    }
    try {
      // captureGraphics defaults to true, which sets up an OffscreenCanvas
      // graphics device to capture plots. This blog only surfaces text
      // output (no plot rendering yet), and leaving it enabled makes
      // captureR throw an opaque WebRError under the PostMessage channel
      // (the fallback used whenever the page isn't cross-origin isolated).
      const capture = await shelter.captureR(code, {
        withAutoprint: true,
        captureGraphics: false,
      });
      const stdout = capture.output
        .filter((msg) => msg.type === "stdout" || msg.type === "stderr")
        .map((msg) => String(msg.data))
        .join("\n");
      return { ok: true, stdout };
    } catch (err) {
      return {
        ok: false,
        stdout: "",
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      await shelter.purge();
    }
  }
}

export const rRuntime = new RRuntime();
