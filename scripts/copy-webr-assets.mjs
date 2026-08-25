// Same idea as copy-pyodide-assets.mjs: webR's WASM binary, native libs,
// and R filesystem image aren't meant to be bundled by Vite — they're
// fetched at runtime from a plain static URL (WebROptions.baseUrl). This
// copies them from node_modules into public/ so the blog doesn't depend
// on a third-party CDN.
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "webr", "dist");
const dest = join(root, "public", "webr");

const files = ["R.js", "R.wasm", "libRblas.so", "libRlapack.so", "webr-worker.js"];
const dirs = ["vfs"];

await mkdir(dest, { recursive: true });
await Promise.all([
  ...files.map((file) => cp(join(src, file), join(dest, file))),
  ...dirs.map((dir) => cp(join(src, dir), join(dest, dir), { recursive: true })),
]);
console.log(`Copied ${files.length} files and ${dirs.length} director(y/ies) to public/webr/`);
