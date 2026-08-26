// BokehJS renders the interactive plot client-side from the JSON spec
// Python's bokeh.embed.json_item() produces — it has to be the exact same
// version as the Python `bokeh` package that produced that JSON, so the
// runtime tells us which version to fetch rather than pinning one here.
declare global {
  interface Window {
    Bokeh?: {
      embed: { embed_item: (item: Record<string, unknown>, targetId: string) => void };
    };
  }
}

let loadedVersion: string | null = null;
let loadPromise: Promise<void> | null = null;

export function loadBokehJs(version: string): Promise<void> {
  if (window.Bokeh && loadedVersion === version) return Promise.resolve();
  if (loadPromise && loadedVersion === version) return loadPromise;
  loadedVersion = version;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://cdn.bokeh.org/bokeh/release/bokeh-${version}.min.js`;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Failed to load BokehJS ${version} from the CDN. Check your network connection.`));
    document.head.appendChild(script);
  });
  return loadPromise;
}
