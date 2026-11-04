# Writing posts with the Content Manager (Decap CMS)

This blog has a browser-based editor at **`/admin/`** (e.g.
`https://vivekraj.online/admin/`) — [Decap
CMS](https://decapcms.org/) (the actively maintained continuation of
Netlify CMS). It gives you a form for title/description/date/tags/cover,
a markdown editor for the post body, and an image uploader — no local
editor, no git commands. Saving a post there commits the `.mdx` file
straight to this repo's `main` branch, which triggers the normal
`Deploy to GitHub Pages` Action.

It needs a one-time setup before first use, because GitHub's OAuth login
flow requires a server-side step a static GitHub Pages site can't do on
its own. The fix doesn't require writing or hosting any code — Netlify
provides a free OAuth proxy for exactly this (a GitHub-backed site that
isn't hosted on Netlify).

## One-time setup (~5 minutes)

1. **Create a free Netlify account** at [netlify.com](https://netlify.com)
   if you don't have one already — you will **not** deploy this site
   there, the account is only used for its free OAuth proxy.
2. In Netlify, create any new site linked to this GitHub repo (the
   "Import an existing project" flow). You can leave the build command
   blank or let it fail — it doesn't matter, since GitHub Pages stays
   the real deployment target. This step just gives you a Netlify site
   to attach OAuth to.
3. **Create a GitHub OAuth App**: GitHub → Settings → Developer settings
   → OAuth Apps → **New OAuth App**.
   - Application name: anything, e.g. "Vivek's Weblog CMS"
   - Homepage URL: your Netlify site's URL (e.g.
     `https://your-site-name.netlify.app`)
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Save, then generate a **Client Secret** and copy both the Client ID
     and Client Secret.
4. In the Netlify site from step 2: **Site configuration → General →
   OAuth** (sometimes under "Access control" depending on Netlify's
   current UI) → **Install provider** → GitHub → paste in the Client ID
   and Client Secret from step 3.
5. Done. Open `https://vivekraj.online/admin/`, click **Login with
   GitHub**, authorize the OAuth App once, and you're in.

`public/admin/config.yml` doesn't need the Netlify site's URL anywhere —
it deliberately leaves `base_url` unset, which defaults to
`https://api.netlify.com`, Netlify's shared OAuth proxy endpoint.

## Using it

- **New post**: Content Manager → Blog Posts → New Blog Post. Fill in
  the fields; a cover image is optional (goes to
  `public/images/covers/`).
- **Editing existing posts**: all existing `.mdx` files under
  `src/content/blog/` show up in the list automatically.
- **MDX with interactive code blocks**: a few posts (e.g. the one using
  `<CodeRunner>`) have JSX and an `import` line above the prose. The
  body field's rich-text/visual mode doesn't understand MDX syntax and
  can mangle it on save — switch that field to **raw markdown mode**
  (the toggle in its toolbar) before editing those specific posts. Plain
  posts without any JSX are safe in either mode.
- **Local testing without GitHub**: `npx decap-server` in the repo root,
  then open `http://localhost:4321/admin/` while `npm run dev` is also
  running — `local_backend: true` in config.yml makes the CMS write
  straight to your local working tree instead of going through GitHub
  OAuth at all, useful for trying the editor out before doing the setup
  above.
