import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

// vivek2606.github.io is a GitHub Pages *user* site (repo name matches the
// username), which always serves at the domain root — unlike a project
// site (any other repo name), which is served from /<repo-name>/. No
// `base` config needed here as a result.
export default defineConfig({
  site: "https://vivek2606.github.io",
  integrations: [react(), mdx()],
});
