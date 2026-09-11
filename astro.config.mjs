import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// vivek2606.github.io is a GitHub Pages *user* site (repo name matches the
// username), which always serves at the domain root — unlike a project
// site (any other repo name), which is served from /<repo-name>/. No
// `base` config needed here as a result.
//
// Served from the custom domain in public/CNAME (vivekraj.online) rather
// than the default *.github.io URL — `site` has to match what's actually
// served, since it feeds every canonical URL, the sitemap, and the RSS feed.
export default defineConfig({
  site: "https://vivekraj.online",
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  // mdx() extends the top-level `markdown` config (including the plugins
  // above) by default, so they don't need to be repeated here.
  integrations: [react(), mdx(), sitemap()],
});
