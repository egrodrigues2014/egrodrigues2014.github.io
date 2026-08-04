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
import { LANGS, REPO, Report, loadLang } from './lib.mjs'

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

// The root sitemap is an index pointing at one sitemap per language.
const sitemap = path.join(PUBLIC, 'sitemap.xml')
if (!fs.existsSync(sitemap)) r.error('public/sitemap.xml is missing')
else {
  const xml = fs.readFileSync(sitemap, 'utf8')
  for (const lang of LANGS) {
    if (!xml.includes(`/${lang}/sitemap.xml`)) r.error(`sitemap.xml does not reference the ${lang} sitemap`)
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
