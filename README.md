# ICCMC app — read this first

**This repository _is_ the deployed app.** The live link loads it directly from here — there is no build
step and no separate "standalone" file. `index.html` and the `assets/` folder are **one app**, not two
versions.

## The link → this repo → these files

- **GitHub Pages** serves the repo root, so `https://iccmc-26.github.io/iccmc-app/` opens **`index.html`**.
- `index.html` then loads the code from the **`assets/`** folder.
- **Cloudflare** (`wrangler.toml`) serves the same files.

`index.html` **must stay at the repo root** — that is the address the link points at. Everything else
lives in `assets/`.

## The one source of truth — what each file is

```
index.html          ← the SHELL only: the page markup + the <link>/<script> tags that pull in assets/.
                       ~47 KB, rarely touched. It is NOT standalone — it does nothing without assets/.
assets/app.js       ← THE APP. All the behaviour (search, the legal-batch matching, rendering, the
                       Supabase data layer, …). ⭐ Edit HERE to change how the app works.
assets/app.css      ← all the styles.
assets/vendor.js    ← the vendored Supabase library (third-party — don't edit).
ocr.html            ← a SEPARATE, self-contained OCR-admin page. Reached at /ocr.html. Its own file.
```

So: **the app's source of truth for behaviour is `assets/app.js`** (styles in `assets/app.css`).
`index.html` is just the loader.

## How to change the app

1. Edit **`assets/app.js`** (logic) or **`assets/app.css`** (styles) — **not** `index.html`.
2. Bump the `?v=N` on that file's tag inside `index.html` (e.g. `assets/app.js?v=2`) so browsers refetch
   the new version instead of a cached one.
3. Commit and push. GitHub Pages and Cloudflare redeploy automatically (~1 minute). Hard-refresh
   (Ctrl+Shift+R) to see it.

## What is NOT in this repo (on purpose)

The OCR "brain" runs on **Google Cloud Run** (service `iccmc-ocr`) and the data lives in **Supabase** —
neither is here. `.gitignore` is an **allow-list**: it ignores everything and permits only the app files
above, so no backend code, key, or secret can ever land in this public repo by accident. Only the
publishable Supabase key ships in the app; the database's Row-Level-Security is the real guard.
