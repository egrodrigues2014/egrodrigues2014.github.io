#!/usr/bin/env node
/**
 * Asset references, checked in both directions.
 *
 * Dangling: something references a file that is not there. Mostly silent —
 * the theme nil-guards every image except skills[].logo — so it surfaces as a
 * missing picture in production rather than a build failure.
 *
 * Orphans: a file nobody references. Harmless to serve, but during a cleanup
 * this is the list of what is safe to delete, which is what makes deleting
 * safe at all.
 */
import fs from 'node:fs'
import path from 'node:path'
import { LANGS, REPO, Report, loadLang, walk, leaves, resolveAsset, isExternal } from './lib.mjs'

const r = new Report('asset references')
const referenced = new Set()

const ASSET_FIELD = /(^|\.)(logo|darkLogo|image|badge|background|darkBackground|main|inverted|favicon)$/

// --- references from data/ ------------------------------------------------
for (const lang of LANGS) {
  for (const [file, doc] of Object.entries(loadLang(lang))) {
    for (const { path: p, value } of leaves(doc)) {
      if (!ASSET_FIELD.test(p.replace(/\.\d+/g, ''))) continue
      if (!value || isExternal(value)) continue
      const hit = resolveAsset(value)
      if (hit) referenced.add(hit)
      else r.error(`data/${lang}/${file} ${p} -> "${value}" not found under assets/ or static/`)
    }
  }
}

// --- references from hugo.yaml (logos, backgrounds) ----------------------
{
  const cfg = walk(REPO).includes('hugo.yaml') ? path.join(REPO, 'hugo.yaml') : null
  if (cfg) {
    const { readYaml } = await import('./lib.mjs')
    for (const { path: p, value } of leaves(readYaml(cfg).params ?? {})) {
      if (!ASSET_FIELD.test(p.replace(/\.\d+/g, ''))) continue
      if (!value || isExternal(value)) continue
      const hit = resolveAsset(value)
      if (hit) referenced.add(hit)
      else r.error(`hugo.yaml params.${p} -> "${value}" not found under assets/ or static/`)
    }
  }
}

// --- references from content/ (front matter hero + markdown images) ------
for (const rel of walk(path.join(REPO, 'content'))) {
  if (!rel.endsWith('.md')) continue
  const abs = path.join(REPO, 'content', rel)
  const text = fs.readFileSync(abs, 'utf8')

  // A page bundle's own resources sit next to it, so they count as referenced.
  const bundleDir = path.dirname(path.join('content', rel))
  for (const f of walk(path.join(REPO, bundleDir))) {
    if (!f.endsWith('.md')) referenced.add(`${bundleDir.split(path.sep).join('/')}/${f}`)
  }

  // Any image-ish front matter key, not just `hero`. An author override uses
  // `image:` nested under `author:`, and missing it reported a used file as an
  // orphan.
  const fm = text.split(/^---\s*$/m)[1] ?? ''
  for (const m of fm.matchAll(/^\s*(hero|image|logo|thumbnail):\s*(.+)$/gm)) {
    const ref = m[2].trim().replace(/^["']|["']$/g, '')
    if (!ref || isExternal(ref)) continue
    const local = path.join(bundleDir, ref).split(path.sep).join('/')
    if (fs.existsSync(path.join(REPO, local))) { referenced.add(local); continue }
    const hit = resolveAsset(ref)
    if (hit) referenced.add(hit)
    else r.error(`content/${rel} ${m[1]} -> "${ref}" not found`)
  }

  for (const m of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    const ref = m[1]
    if (isExternal(ref) || ref.startsWith('data:')) continue
    const local = path.join(bundleDir, ref).split(path.sep).join('/')
    if (fs.existsSync(path.join(REPO, local))) { referenced.add(local); continue }
    const hit = resolveAsset(ref)
    if (hit) referenced.add(hit)
    else r.error(`content/${rel} image -> "${ref}" not found`)
  }
}

// --- openGraph.image must be a PUBLISHED static path --------------------
// The theme's opengraph.html does `{{ . | absURL }}` with no resources.Get, so
// the string has to resolve to a file Hugo actually publishes. An assets/ path
// silently 404s: Hugo only publishes the processed derivative under a hashed
// name. Worse, the theme falls back to author.image when openGraph.image is
// unset, so simply adding a profile photo introduces a broken social-card URL.
// Only the directories mounted in hugo.yaml are served — static/files is,
// static/images is not.
for (const lang of LANGS) {
  const ref = loadLang(lang)['site.yaml']?.openGraph?.image
  if (!ref || isExternal(ref)) continue
  const clean = String(ref).replace(/^\//, '')
  if (!fs.existsSync(path.join(REPO, 'static', clean))) {
    r.error(`data/${lang}/site.yaml openGraph.image -> "${ref}" is not under static/. ` +
      'The theme passes it straight to absURL, so an assets/ path publishes nothing and the ' +
      'social card 404s. Put the file in static/files/ (mounted) and point here.')
  }
}

// --- orphans -------------------------------------------------------------
// Limited to the directories we curate. static/flags, static/fonts and
// static/files/mulish-* come from node_modules via module.mounts and are
// referenced by the theme's own CSS, so they are not ours to judge.
const CURATED = ['assets/images']
for (const root of CURATED) {
  for (const rel of walk(path.join(REPO, root))) {
    const full = `${root}/${rel}`
    if (!referenced.has(full)) {
      r.warn(`${full} is not referenced by data/, content/ or hugo.yaml — safe to delete unless the theme uses it`)
    }
  }
}

r.finish()
