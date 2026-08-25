// Isolates the one line that touches the real "webr" package. Its own
// types are built from deeply generic Proxy types (newRClassProxy<...>)
// that are extremely expensive to resolve — heavy enough that `astro
// check` exhausts 8GB+ of heap just from webR being an installed
// dependency, independent of whether any file imports its types (see the
// `npm run typecheck` note in the README). webr-loader.d.ts describes only
// this loader's own return value, so consumers never need webR's real
// types either.
export async function loadWebR(baseUrl, onStatus) {
  const { WebR } = await import("webr");
  const instance = new WebR({ baseUrl });
  onStatus("Starting interpreter…");
  await instance.init();
  return new instance.Shelter();
}
