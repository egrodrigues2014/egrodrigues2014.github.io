#!/usr/bin/env node
/**
 * Verifies the BUILT output, one home page per language.
 *
 * check-i18n proves the data is consistent; this proves it actually reached
 * the page. They catch different things: a language declared without its
 * data/<lang>/ tree renders an empty home with a green build and passes every
 * data-level assertion, because there is no data to be inconsistent with.
 *
 * Run after `hugo`. Note the output is minified, so attributes are unquoted:
 * `id=about`, not `id="about"`. Matching on the quoted form silently finds
 * nothing and the check passes for the wrong reason.
 */
import fs from 'node:fs'
import path from 'node:path'
import { LANGS, REPO, Report, loadLang, readYaml } from './lib.mjs'

const r = new Report('rendered output')
const PUBLIC = path.join(REPO, 'public')
const MIN_BYTES = 20_000
const LOCALE = { en: 'en', es: 'es-ES', 'pt-br': 'pt-BR' }

if (!fs.existsSync(PUBLIC)) {
  r.error('public/ does not exist — run `mise run build` first')
  r.finish()
}

// Which sections should appear is derived from the data rather than hardcoded,
// so enabling or disabling one cannot desynchronise from this check.
const enabled = Object.entries(loadLang(LANGS[0]))
  .filter(([f]) => f.startsWith('sections/'))
  .map(([, doc]) => doc.section)
  .filter((s) => s?.enable && s?.id)
  .map((s) => s.id)

if (!enabled.length) r.error('no enabled sections found in data/en/sections/ — check the section blocks')

for (const lang of LANGS) {
  const rel = lang === LANGS[0] ? 'index.html' : `${lang}/index.html`
  const abs = path.join(PUBLIC, rel)

  if (!fs.existsSync(abs)) {
    r.error(`public/${rel} was not generated — is ${lang} declared in hugo.yaml?`)
    continue
  }
  const html = fs.readFileSync(abs, 'utf8')

  if (html.length < MIN_BYTES) {
    r.error(`public/${rel} is only ${html.length} bytes (< ${MIN_BYTES}). A home page this small means ` +
      `data/${lang}/ did not resolve; the theme does not fall back across languages.`)
  }

  for (const id of enabled) {
    // Unquoted attributes: the output is minified.
    if (!new RegExp(`id=["']?${id}["']?[\\s>]`).test(html)) {
      r.error(`public/${rel} is missing the "${id}" section anchor`)
    }
  }

  const gaps = html.match(/\[i18n\]/g)?.length ?? 0
  if (gaps) {
    r.error(`public/${rel} has ${gaps} unresolved i18n key(s). The theme bundle for "${lang}" is not ` +
      'resolving; check that the language key matches a shipped i18n file.')
  }

  const want = LOCALE[lang]
  const got = html.match(/<html[^>]*\blang=["']?([^\s"'>]+)/)?.[1]
  if (want && got !== want) r.error(`public/${rel} has <html lang="${got}">, expected "${want}"`)
}

// --- hreflang and the pre-launch gate ------------------------------------
// The theme emits no hreflang of its own, and it renders the home through a
// standalone template that bypasses baseof — so the override that adds these has
// to be checked on the built output, per language, or a regression is invisible.
//
// The gate assertions cut both ways on purpose: at launch, params.prelaunch flips
// to false and these confirm the noindex actually disappeared, rather than
// trusting that one line did what it said.
{
  const cfg = readYaml(path.join(REPO, 'hugo.yaml'))
  const prelaunch = Boolean(cfg.params?.prelaunch)
  const expectedLocales = LANGS.map((l) => cfg.languages?.[l]?.locale ?? l)

  for (const lang of LANGS) {
    const rel = lang === LANGS[0] ? 'index.html' : `${lang}/index.html`
    const abs = path.join(PUBLIC, rel)
    if (!fs.existsSync(abs)) continue
    const html = fs.readFileSync(abs, 'utf8')

    for (const loc of expectedLocales) {
      if (!new RegExp(`hreflang=["']?${loc}["']?[\\s>]`).test(html)) {
        r.error(`public/${rel} is missing hreflang="${loc}". All language versions must list each other ` +
          'reciprocally, otherwise a search engine treats them as unrelated or duplicate pages.')
      }
    }
    if (!/hreflang=["']?x-default["']?[\s>]/.test(html)) {
      r.error(`public/${rel} is missing hreflang="x-default"`)
    }

    const hasNoindex = /content=["']?noindex/.test(html)
    if (prelaunch && !hasNoindex) {
      r.error(`params.prelaunch is true but public/${rel} has no noindex meta. robots.txt alone does not ` +
        'prevent indexing of a URL discovered by another route.')
    }
    if (!prelaunch && hasNoindex) {
      r.error(`params.prelaunch is false but public/${rel} still carries a noindex meta — the site would ` +
        'stay invisible to search engines after launch.')
    }
  }

  const robots = path.join(PUBLIC, 'robots.txt')
  if (!fs.existsSync(robots)) {
    r.error('public/robots.txt was not generated — is enableRobotsTXT true in hugo.yaml?')
  } else {
    const txt = fs.readFileSync(robots, 'utf8')
    const disallows = /^\s*Disallow:\s*\/\s*$/m.test(txt)
    if (prelaunch && !disallows) r.error('params.prelaunch is true but robots.txt does not Disallow: /')
    if (!prelaunch && disallows) r.error('params.prelaunch is false but robots.txt still has Disallow: /')
    if (!prelaunch && !txt.includes('Sitemap:')) r.error('robots.txt should advertise the sitemap once launched')
  }
}

// The root sitemap is an index pointing at one sitemap per language.
const sitemap = path.join(PUBLIC, 'sitemap.xml')
if (!fs.existsSync(sitemap)) r.error('public/sitemap.xml is missing')
else {
  const xml = fs.readFileSync(sitemap, 'utf8')
  for (const lang of LANGS) {
    if (!xml.includes(`/${lang}/sitemap.xml`)) r.error(`sitemap.xml does not reference the ${lang} sitemap`)
  }
}

// --- each per-language sitemap lists its home page ------------------------
// The theme's own template built from .Site.RegularPages, which in Hugo excludes
// home and section pages. On a single-page portfolio that left one URL in the
// whole sitemap — /search/ — and the home page, which IS the site, was absent in
// all three languages. Nothing failed: a sitemap can be valid and useless.
//
// robots.txt starts advertising the sitemap the moment params.prelaunch flips, so
// this has to hold before launch, not after.
for (const lang of LANGS) {
  const rel = `${lang}/sitemap.xml`
  const abs = path.join(PUBLIC, rel)
  if (!fs.existsSync(abs)) {
    r.error(`public/${rel} was not generated`)
    continue
  }
  const xml = fs.readFileSync(abs, 'utf8')
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
  // The home URL is the shortest one: every other page hangs off it.
  const home = [...locs].sort((a, b) => a.length - b.length)[0]
  const wantSuffix = lang === LANGS[0] ? '/' : `/${lang}/`
  if (!locs.length) {
    r.error(`public/${rel} contains no <loc> at all`)
  } else if (!home?.endsWith(wantSuffix)) {
    r.error(`public/${rel} does not list the ${lang} home page (shortest URL found: ${home}). ` +
      'The theme builds its sitemap from .Site.RegularPages, which excludes home and section pages.')
  }
  const missingLastmod = locs.length - (xml.match(/<lastmod>\d/g) ?? []).length
  if (missingLastmod > 0) {
    r.error(`public/${rel} has ${missingLastmod} URL(s) with no dated <lastmod> — enableGitInfo needs ` +
      'real git history, which is why both workflows check out with fetch-depth: 0')
  }
}

// --- the blog index carries posts in every language -----------------------
// The theme selects posts with site.RegularPages, which is language scoped, and
// section.enable for recent-posts is FIXED across languages. So a post written
// only in English produces a populated /posts/ and two empty ones, plus a
// "Recent Posts" heading above an empty row on two of the three home pages —
// with a green build and no warning anywhere.
//
// The count is not compared across languages on purpose: posts are exempt from
// parity, and requiring every post in three languages would kill the publishing
// cadence. What must hold is that no language ends up with none.
{
  const cards = (html) => (html.match(/class=["']?card-title/g) ?? []).length
  for (const lang of LANGS) {
    const rel = lang === LANGS[0] ? 'posts/index.html' : `${lang}/posts/index.html`
    const abs = path.join(PUBLIC, rel)
    if (!fs.existsSync(abs)) {
      r.error(`public/${rel} was not generated, but features.blog.enable puts a "Posts" item in the navbar ` +
        'for every language — that link would 404')
      continue
    }
    if (cards(fs.readFileSync(abs, 'utf8')) === 0) {
      r.error(`public/${rel} lists no posts. The navbar links there in every language, and the enabled ` +
        `recent-posts section renders its heading above an empty row. Give ${lang} at least a summary of ` +
        'one post, or disable recent-posts in all three languages.')
    }
  }
}

// Client-side search needs the JSON output; losing it breaks the search box
// with no visible error until someone types in it.
if (!fs.existsSync(path.join(PUBLIC, 'index.json'))) {
  r.error('public/index.json is missing — client-side search will silently return nothing')
}
for (const f of ['404.html']) {
  if (!fs.existsSync(path.join(PUBLIC, f))) r.error(`public/${f} is missing`)
}

// Sections removed from the project must not survive anywhere in the output.
for (const gone of ['notes', 'publications', 'achievements']) {
  const hit = fs.existsSync(path.join(PUBLIC, gone))
  if (hit) r.error(`public/${gone}/ exists but that section was removed — stale output? try a clean build`)
}

r.finish()
