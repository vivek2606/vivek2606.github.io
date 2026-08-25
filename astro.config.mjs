import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

// GitHub Pages serves a project site (not a user/org site) from
// /<repo-name>/, not the domain root. Scoping `base` to CI keeps local
// `npm run dev` at "/" while the deployed build gets the GH Pages prefix.
const isCI = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  site: "https://vivek2606.github.io",
  base: isCI ? "/personal-blog" : "/",
  integrations: [react(), mdx()],
});
