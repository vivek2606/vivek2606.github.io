// import.meta.env.BASE_URL's trailing-slash convention isn't consistent
// enough to concatenate onto directly (e.g. it comes back as
// "/personal-blog" with no trailing slash when `base` has none either,
// which silently produced "/personal-blogblog/..." before this existed).
// Normalize once here instead of assuming a format at each call site.
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export function withBase(path: string): string {
  return `${BASE}/${path.replace(/^\/+/, "")}`;
}
