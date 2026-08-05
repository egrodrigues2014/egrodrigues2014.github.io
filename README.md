# egrodrigues2014.github.io

Personal portfolio of Elton Rodrigues, Lead Data Engineer — a Hugo site built on
the [Toha](https://github.com/hugo-toha/toha) theme, published to GitHub Pages in
English, Spanish and Brazilian Portuguese.

**Live:** <https://egrodrigues2014.github.io>

---

## Quick start

Dependencies are managed with [mise](https://mise.jdx.dev), which installs the
pinned `hugo-extended`, `node` and `go` for you.

```bash
mise install && mise run server
```

| Command | What it does |
|---|---|
| `mise run install` | Fetches the theme module, packs its npm deps, installs the checkers' deps |
| `mise run server` | Local dev server on :1313, with missing i18n keys shown as `[i18n] key` |
| `mise run build` | Production build into `public/` |
| `mise run verify` | **The gate.** Run this before every commit — see below |
| `mise run check-demo` | Fails if any of the theme's example content is back |
| `mise run update` | Updates the theme to its latest release |

Versions are pinned in `mise.toml` rather than left on `latest`, and CI reads the
same file. With `latest`, a Hugo release can break the build without a line
changing here, and you cannot tell your own mistake from a toolchain regression.

---

## `mise run verify`

Seven gates, in order. The same set runs in CI, in the same order, so a green run
locally means something.

| Checker | Catches |
|---|---|
| `check-i18n` | Cross-language drift: a missing file, a diverged `weight`, a translated lookup key, a translation one bullet short |
| `check-assets` | Dangling asset references and orphans, plus `openGraph.image` pointing outside `static/` |
| `check-pii` | Phone numbers, national IDs, IBANs, postal addresses — anything from the CV that must not reach a public repo |
| `check-demo` | The theme's example content coming back |
| `check-overrides` | A theme upgrade leaving a copied partial stale |
| *build* | `hugo --gc --minify --cleanDestinationDir --printPathWarnings --panicOnWarning` |
| `check-render` | The built pages: section anchors, `hreflang`, the pre-launch gate, a post in every language, no unresolved `[i18n]` keys |

The data gates run **before** the build on purpose. `check-i18n` treats a dangling
`skills[].logo` as fatal because `cards/skill.html` dereferences the result of
`resources.Get` with no nil check — running it first turns a nil-pointer crash
into a named file and a reason.

`check-demo` was held out of `verify` while it was still counting down from the
118 hits the inherited example site left behind; a permanently red gate is one you
learn to ignore. It reached zero when the demo projects were replaced with real
case studies, and it is now a one-way door.

`check-i18n` also passes with **zero warnings**, not just zero errors. Its
untranslated-value heuristic flags any `es`/`pt-br` string byte-identical to the
English one, and the handful that are deliberately identical — job titles kept in
English, a filter button named after a product — are listed by path *and value* in
`INTENTIONALLY_IDENTICAL`. Keyed by value because the fields themselves are
translatable: "SAS Consultant" does become "Consultor SAS".

Every checker has been proven to fail against a deliberately injected defect. A
test that has never been seen failing is not a test.

**Do not run `verify` or `build` while `mise run server` is up.** The CLI rebuilds
`public/` with fresh fingerprints while the dev server keeps serving the HTML it
already rendered, so the page asks for a bundle hash that no longer exists: the
script 404s, fails its `integrity` check and is blocked. Nothing says so — the
symptom is JavaScript silently not running, which looks like a broken hamburger
icon, a dead filter or a dropdown that will not open. Stop the server first, or
restart it afterwards.

---

## Three languages

English is served at the root, Spanish at `/es/`, Brazilian Portuguese at
`/pt-br/`. Each has its own `data/<lang>/` tree.

**The theme does not fall back across languages.** `layouts/index.html` resolves
section data with `index hugo.Data site.Language.Lang`, so a language declared in
`hugo.yaml` without its own `data/<lang>/` tree renders an **empty home page with
a green build**. Hence one hard rule:

> Adding a language to `hugo.yaml` and creating its `data/<lang>/` tree happen in
> the same commit. Always.

The key must also match a theme i18n bundle, which is why the language is
`pt-br` and not `pt` — v4.16.0 ships `pt-br.toml` but no `pt.toml`, and under `pt`
the entire UI would silently fall back to English.

### What may differ between languages, and what may not

This table is what the parity checker enforces. Getting it wrong is how the
theme's own example site ended up with a broken Bengali tree.

**Never translate — byte-identical across all three:**

- the whole `section` block: `id`, `weight`, `enable`, `showOnNavbar`, `template`, `filter`
- `buttons[].filter` — a CSS/JS token, not a label. Translate it and the button empties the section
- `skills[].categories`, `projects[].tags` — same reason
- `badges[].type`, `percentage`, `color`
- the **keys** of `contactInfo` — translating one silently drops its icon
- every `url`, `logo`, `darkLogo`, `image`, `badge`, `repo`, `icon`, `certificateURL`
- dates: `start`, `end`, `timeframe`, `timeline`, all in `MM/YYYY`
- proper nouns — people, companies, institutions, technologies, and certification names exactly as the issuer writes them

**Translate:**

- `section.name`, `buttons[].name`
- `author.greeting`, `author.summary[]`
- `about.designation`, `about.summary`, `skills[].summary`
- `positions[].designation`, `positions[].responsibilities[]`, `company.overview`, `company.location`
- `degrees[].name`, `projects[].role`, `projects[].summary`, `accomplishments[].courseOverview`
- `site.disclaimer`, `site.description`, `openGraph.title`/`description`

**Legitimately differs:** `resourceLinks[].url` (a CV per language) and
`openGraph.url` (a canonical per language). `featured-posts.posts[]` too — a post
with no translation vanishes from that list in silence, so each language lists
only what exists for it.

Dates use `MM/YYYY` on purpose. Month names would need translating three times,
"Mar 2022" reads wrong in Spanish and Portuguese, and every one is a chance to
misalign a month against its year.

### Missing i18n keys

`mise run server` sets `HUGO_ENABLEMISSINGTRANSLATIONPLACEHOLDERS=true`, so a key
the theme does not ship renders as `[i18n] key` — visible to the person who can
fix it. It is **not** set in `hugo.yaml`, so a published build falls back to
English instead of showing that to a visitor.

`check-render` still greps the built output for `[i18n]`. It can no longer catch a
gap by itself; it is a sentinel that fires if the flag is ever moved back into
`hugo.yaml`.

### Writing a section

One commit per section, all three languages together. Generate the three files
from one source so parity is structural rather than reviewed by eye, then
`mise run verify`, then check the built HTML — not the YAML — for the text, the
links and the absence of empty anchors.

---

## Adding a post

```bash
hugo new posts/my-post
```

That scaffolds a page bundle from `archetypes/posts/`, which is the convention
this theme expects: images live beside the post and `hero.*` is auto-detected.

Posts are **exempt from cross-language parity**. Requiring every post in three
languages kills the publishing cadence; the checker is strict about `data/` and
permissive about `content/posts/`.

If you rename a post's directory, update `featured-posts.yaml` in all three
languages — `site.GetPage` is wrapped in a `with`, so a broken reference
disappears without an error.

---

## Deployment

Push to `main` and `.github/workflows/deploy.yml` builds and publishes. It uses
the official Pages actions specifically because `configure-pages` exposes
`base_url`, which is fed to `hugo --baseURL`. That makes a wrong `baseURL`
structurally impossible instead of dependent on `hugo.yaml` being right — and
that class of bug does not reproduce locally, because `hugo server` serves from
the root.

### Pre-launch gate

While `params.prelaunch` is `true` in `hugo.yaml`, the site is deployed but
deliberately not indexable: `layouts/robots.txt` serves `Disallow: /` and
`seo-extra.html` emits `noindex,nofollow`. Both are needed — `robots.txt` stops
crawling, but a URL found another way can still be listed, and the meta tag is
what actually prevents indexing.

Launching is that one line. `check-render` asserts the gate in **both**
directions, so flipping it is verified rather than assumed.

---

## Maintaining the theme

Three files are copied verbatim from Toha, because the theme offers no `<head>`
extension point, no issuer icon on certification cards, and no way to stop one
third-party script:

| Copy | Why |
|---|---|
| `layouts/partials/opengraph.html` | The only seam both `<head>`-emitting templates share, used to add `hreflang` and the pre-launch `noindex` |
| `layouts/partials/cards/accomplishments.html` | Adds an issuer mark; upstream renders the organisation as plain text |
| `assets/scripts/sections/projects.js` | Drops an unconditional `buttons.github.io/buttons.js` request that fired on every page whether or not any project used `repo:` |

Each carries a `THEME-VERSION` marker. `check-overrides` scans `layouts/` and
`assets/` — the project's `assets/` shadows the theme's for an identical path (the
mechanism `assets/styles/override.scss` relies on), so a copied script rots on
upgrade exactly like a copied partial.

**On every theme upgrade:**

1. `mise run update`
2. `mise run verify` — `check-overrides` fails while `go.mod`'s theme version and
   the `THEME-VERSION` markers disagree. That is the point: it forces step 3.
3. Diff each override against its new upstream. **If the theme added something to
   `<head>`, a stale copy silently drops it.**
4. Update the markers, commit the regenerated npm manifests separately.

`assets/jsconfig.json` is untracked: Hugo rewrites it on every install with an
absolute path into the local module cache.

Generated files — `package.json`, `package-lock.json`, `packages/hugoautogen/` —
belong in isolated `chore(deps)` commits. Otherwise every `mise run install`
buries a real diff under generated churn.

---

## Recovering the example content

The upstream example site is tagged, so its demo posts remain available as a
reference for the theme's shortcodes without keeping a branch that would rot:

```bash
git show upstream-example-site:content/posts/shortcodes/index.md
git show upstream-example-site:content/posts/markdown-sample/index.md
```

---

## Licence

The code is MIT. The content — career history, prose, photograph, CVs — is all
rights reserved. See [LICENSE](LICENSE).

Third-party work, including the Toha theme, the landing page background and the
icon sets, is credited in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
