# ICCMC app — read this first

**This repository _is_ the deployed app.** The live link loads it directly from here — there is no build
step and no separate "standalone" file. `index.html` and the `assets/` folder are **one app**, not two
versions.

> **New here?** Read *What the system does* first — it is the product in plain words.
> Everything after it is for whoever changes the code.

---

# What the system does

The employee document registry: passports, visas, and the Iraqi legal papers
(**التعهد · الاستمارة · المنح**). Scans go in one end; out the other comes a registry that knows who
your people are, what documents they hold, when each one dies, which legal grant covers them, and how
long that grant lives — and that says plainly when it does **not** know something, instead of pretending.

## 1 · Getting the papers in

Two doors, one pipeline.

- **The page** — drag a handful of files straight in.
- **The Agent** — a desktop pump for real volume. You tell it how many files you are sending, and from
  that moment the system owes you that exact number back.

Every file is written down the instant it arrives, before anything has looked at it. A file is therefore
never merely "somewhere": it is always travelling, filed, waiting for a human, or refused with a reason.

## 2 · What the machine reads

If a PDF is several documents stapled together, it is cut into the real documents first — but if the
cutter cannot find genuine boundaries it **refuses the whole file intact** rather than shredding it into
nonsense pages. Word and Excel rosters are read directly; a legal paper does not have to be a scan.

Then the work forks:

**Passports and visas** are machine-readable. Every field is extracted *and graded for confidence*. Clean
documents file themselves with no human touch. The face is found, straightened, and the proper passport
photo page preferred over any other face on the document. If an important field is doubtful the system
does not guess — it stops and waits for a human.

**Legal papers never file themselves. Ever.** The reader takes the roster — serials, names, passport
numbers, the first and last person — but is **forbidden** from reading the stamps, the grant number and
the grant date. Those three belong to a human. A machine guessing a stamp is worse than no machine.
So legal papers always land in **الوارد**.

## 3 · The review

One button, starting at the first paper, walking you through them.

Papers do **not** have to arrive together or in order. A تعهد scanned today and its منح next week, from
different drops, are recognised as one batch — matched by serial range, by the names at each end, and by
which passports they share. A منح that arrives before its roster waits for it.

For each paper you tick the stamps you can actually see. At the منح you type the grant number **and** its
date; the system refuses to commit without both, jumps you to the missing field and marks it. On confirm,
a green receipt states exactly what was saved — which batch, how many papers, how many names, and how
many of those names matched a real employee. The next batch appears immediately.

Deleting a paper removes it completely — the record *and* the file — so it can never come back around the
loop. A paper already committed cannot be deleted this way at all.

## 4 · The legal section, and how a paper expires

Every committed batch appears in **المعاملات**: its grant number, the serial range, how many employees it
covers, and which of the three papers are present and stamped.

**A legal paper prints no expiry date, so the system does not invent one.**

- **Static.** A new batch has no expiry, and says so. Either the people on it are not registered employees
  yet, or they are and none of them holds a visa yet. It is shown as static rather than given a green tick
  nobody can justify.
- **Connected.** When any employee on the batch receives a visa issued within roughly six weeks of the
  grant date, the two are joined. **From then on the batch's life *is* that visa's life** — the legal paper
  is valid exactly as long as the visa it produced. The batch begins reporting active, then expiring, then
  expired.
- **History.** An expired batch is never thrown away. It moves into history: the employee's file shows his
  current legal papers first and the older, expired ones one tap behind. "What covered this man last year?"
  always has an answer.

The same principle runs through the whole product: waiting is shown as waiting, expired as expired, and
nothing is painted green to look tidy.

## 5 · Renewals

A renewed passport or a new visa does **not** overwrite the old one. The old becomes history, the new
becomes current. The system recognises the same person even when the document number changed — by national
ID, by name with date and place of birth, or by face. One employee accumulates a real record over years
instead of a single row that keeps being overwritten.

## 6 · Finding, viewing, printing

Search is the front page: a name, a passport number, a grant number. Filter by who is expiring, who is
incomplete, whose legal file has a gap.

Open an employee to see his photo, passport, every visa, his legal batches, and every original scan —
zoom, rotate, read every page.

**Print** produces a dossier: a cover with name and status, a table of contents, a clean card per document,
then the raw scans themselves, every page. It prints **current** documents only — history stays on screen,
because a file handed to a ministry should not carry last year's expired visa. Legal batches print
separately, with the relevant employee's row highlighted so an officer finds him instantly.

An **استمارة** or **منح** can also be built inside the app: the government form filled on screen, fed by
what the OCR already read, exported as a clean PDF on the real template — instead of a hand-typed
spreadsheet that gets rejected at the counter.

## 7 · The system checks itself

**Every night** it audits its own data against about thirty invariants. Is a passport filed under the wrong
man? Do two people share one passport number? Does a legal batch disagree with its own roster? Is someone
unfindable when you search their own name?

If something real is wrong, an email arrives. If everything is fine you get **nothing** — silence is the
healthy signal, so an email arriving *is* the alarm.

It also keeps itself tidy: unreferenced files are swept after two weeks, anything deleted stays recoverable
for three months, and every change is recorded with who made it.

## 8 · The CHECK

The full examination, run after a batch. It asks: did the pump lose a single file · are the filed records
sound · what is waiting for a human · did reading stay accurate · where did the files go · is any
background job silently dead · was the speed steady · did the registry move correctly · did the legal
papers arrive whole · does the legal data actually reach real employees.

The nightly integrity audit is folded **inside** it. That is deliberate: the CHECK's green light is not a
verdict about the pump alone, it is a verdict about **the truth of the data**. It ends in one line —
**GO or NO-GO** — computed from all the others, so it cannot flatter them.

---

# For developers

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

## Performance — read before adding a list or a heavy render

The app is built to stay smooth as the registry grows (target: **5,000+ employees**). Any new feature that
renders a list or rebuilds a lot of DOM must follow these rules — they're already in place for the employee
list; copy the pattern:

1. **Virtualize long lists.** Never build a DOM node per row for an unbounded list. `render()` paints a
   first window (`_VCHUNK` rows) and streams the rest on scroll (`_vChunk` + an `IntersectionObserver`
   sentinel). DOM stays ~constant; scroll and memory don't grow with the data.
2. **Cache derived per-row data.** Expensive per-row work (e.g. `rowStatus` date‑math) is computed ONCE per
   dataset and reused on filter changes (`_rItems`/`_rRef`, keyed by array reference). Don't recompute on
   every render.
3. **Delegate events; don't bind per row.** Row clicks are ONE delegated listener on `#results`
   (`e.target.closest('.row')`). Per‑row `onclick` breaks virtualization and is slow.
4. **Paint after the FIRST query; defer the rest.** `search()` renders after the main query and loads
   secondary data (the legal‑gap chip) in the background, then re‑renders. Never `await` a secondary query
   before showing results.
5. **Measure at TARGET scale, not today's.** Bottlenecks only appear at scale. Profile with a synthetic
   harness in the console — `render(mkRows(5000))` with `performance.now()` around it — no login or real
   data needed for the render path. DevTools → Performance is the human‑side flame chart.

**Touchstone (5,000 rows, measured):** virtualized render ≈ 20 ms, ≈ 60 DOM nodes (not 5,000). If a new
render pushes those up, it needs the same treatment. Bump `assets/app.js?v=N` on every change.

## What is NOT in this repo (on purpose)

The OCR "brain" runs on **Google Cloud Run** (service `iccmc-ocr`) and the data lives in **Supabase** —
neither is here. `.gitignore` is an **allow-list**: it ignores everything and permits only the app files
above, so no backend code, key, or secret can ever land in this public repo by accident. Only the
publishable Supabase key ships in the app; the database's Row-Level-Security is the real guard.
