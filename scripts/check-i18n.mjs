#!/usr/bin/env node
/**
 * Cross-language parity for data/<lang>/.
 *
 * The failure mode this exists to prevent is silent: the theme resolves
 * section data with `index hugo.Data site.Language.Lang` and never falls back
 * across languages, so a missing file, a diverged weight or a translated
 * config key produces a wrong page with a green build. The upstream `bn` tree
 * had all three at once.
 *
 * Every assertion below corresponds to a defect actually present in that tree
 * or to one the theme's templates make easy to introduce.
 */
import fs from 'node:fs'
import path from 'node:path'
import { LANGS, REPO, Report, loadLang, readYaml, walk, leaves, arrays, resolveAsset, isExternal } from './lib.mjs'

const r = new Report('i18n parity')
const REF = LANGS[0] // en is the reference: it is the default language and the i18n fallback

/** Path with array indices collapsed, e.g. experiences[].positions[].start */
const norm = (p) => p.replace(/\.\d+(?=\.|$)/g, '[]')

// Ordered rules. First match wins. Anything unmatched is reported so that new
// fields added by a theme upgrade cannot slip through unclassified.
const RULES = [
  // --- may legitimately differ between languages ---
  [/^resourceLinks\[\]\.url$/, 'varies'], // the CV is a different PDF per language
  [/^openGraph\.url$/, 'varies'], // each language has its own canonical URL
  [/^posts(\[\])?$/, 'varies'], // featured-posts: a post may not be translated

  // --- translatable prose ---
  [/^section\.name$/, 'text'],
  [/^buttons\[\]\.name$/, 'text'],
  [/^greeting$/, 'text'],
  [/^nickname$/, 'text'],
  [/^summary(\[\])?$/, 'text'],
  [/^designation$/, 'text'],
  [/^skills\[\]\.summary$/, 'text'],
  [/^experiences\[\]\.company\.location$/, 'text'],
  [/^experiences\[\]\.company\.overview$/, 'text'],
  [/^experiences\[\]\.positions\[\]\.designation$/, 'text'],
  [/^experiences\[\]\.positions\[\]\.responsibilities\[\]$/, 'text'],
  [/^degrees\[\]\.name$/, 'text'], // "BSc in Computer Science" is prose, the institution is not
  [/^degrees\[\]\.takenCourses\.courses\[\]\.name$/, 'text'],
  [/^degrees\[\]\.extracurricularActivities\[\]$/, 'text'],
  [/^degrees\[\]\.customSections\[\]\.(name|content)$/, 'text'],
  [/^projects\[\]\.(role|summary)$/, 'text'],
  [/^accomplishments\[\]\.courseOverview$/, 'text'],
  [/^achievements\[\]\.(title|summary)$/, 'text'],
  [/^publications\[\]\.paper\.summary$/, 'text'],
  [/^resourceLinks\[\]\.title$/, 'text'],
  [/^(copyright|disclaimer|description)$/, 'text'],
  [/^openGraph\.(title|description)$/, 'text'],
  [/^customMenus\[\]\.name$/, 'text'],

  // --- structural: must be byte-identical across languages ---
  [/^section\./, 'fixed'], // id, weight, enable, showOnNavbar, template, hideTitle, filter
  [/^buttons\[\]\.filter$/, 'fixed'], // CSS/JS token, not a label
  [/^skills\[\]\.categories\[\]$/, 'fixed'],
  [/^projects\[\]\.tags\[\]$/, 'fixed'], // doubles as filter token
  [/^badges\[\]\.(type|percentage|color)$/, 'fixed'],
  [/^socialLinks\[\]\.rel$/, 'fixed'], // HTML rel attribute
  [/^customMenus\[\]\.(hideFromNavbar|showOnFooter)$/, 'fixed'],
  [/^openGraph\.type$/, 'fixed'],
  [/^degrees\[\]\.grade\./, 'fixed'], // scale, achieved, outOf: numbers
  [/^degrees\[\]\.takenCourses\.(showGrades|collapseAfter)$/, 'fixed'],
  [/^degrees\[\]\.takenCourses\.courses\[\]\.(achieved|outOf)$/, 'fixed'],
  [/^degrees\[\]\.publications\[\]\.title$/, 'fixed'], // publication titles are proper nouns
  [/^publications\[\]\.(title|tags\[\]|categories\[\])$/, 'fixed'],
  [/^publications\[\]\.publishedIn\.date$/, 'fixed'],
  [/\.(start|end|timeframe|timeline)$/, 'fixed'],
  [/^contactInfo\./, 'fixed'], // handles and URLs; the KEYS are checked separately
  [/\.?(url|logo|darkLogo|image|badge|repo|icon|certificateURL)$/, 'fixed'],
  [/\.?name$/, 'fixed'] // proper nouns: people, companies, institutions, technologies, certifications
]

const classify = (p) => RULES.find(([re]) => re.test(p))?.[1] ?? 'unknown'

// ---------------------------------------------------------------------------
const data = {}
for (const lang of LANGS) {
  const dir = path.join(REPO, 'data', lang)
  if (!fs.existsSync(dir)) {
    r.error(`data/${lang}/ does not exist, but ${lang} is expected to be configured`)
    continue
  }
  try {
    data[lang] = loadLang(lang)
  } catch (err) {
    r.error(String(err.message))
  }
}
if (r.errors.length) r.finish()

// --- 1. the set of files is identical across languages -------------------
// Caught the upstream bn tree missing publications.yaml and featured-posts.yaml.
const refFiles = Object.keys(data[REF]).sort()
for (const lang of LANGS.slice(1)) {
  const files = Object.keys(data[lang]).sort()
  for (const f of refFiles) if (!files.includes(f)) r.error(`data/${lang}/${f} is missing (exists in ${REF})`)
  for (const f of files) if (!refFiles.includes(f)) r.error(`data/${lang}/${f} has no counterpart in ${REF}`)
}

// --- 2. contactInfo keys are identical -----------------------------------
// The bn author.yaml translated the keys themselves, so the theme matched none
// of them and rendered no contact icons, with a green build.
{
  const keysOf = (lang) => Object.keys(data[lang]?.['author.yaml']?.contactInfo ?? {}).sort()
  const ref = keysOf(REF)
  for (const lang of LANGS.slice(1)) {
    const got = keysOf(lang)
    if (got.join(',') !== ref.join(',')) {
      r.error(`author.yaml contactInfo keys differ: ${REF}=[${ref}] vs ${lang}=[${got}]. ` +
        'These are lookup keys, never labels: translating one silently drops its icon.')
    }
  }
}

// --- 3 & 4. section blocks: identical across languages, unique within ----
// The bn tree had education and projects both at weight 4.
for (const lang of LANGS) {
  const seen = { id: new Map(), weight: new Map() }
  for (const [file, doc] of Object.entries(data[lang] ?? {})) {
    if (!file.startsWith('sections/')) continue
    const s = doc?.section
    if (!s) { r.error(`data/${lang}/${file} has no \`section\` block`); continue }
    for (const key of ['id', 'weight']) {
      if (s[key] === undefined) { r.error(`data/${lang}/${file} section.${key} is missing`); continue }
      if (seen[key].has(s[key])) {
        r.error(`data/${lang}: section.${key}=${s[key]} used by both ${seen[key].get(s[key])} and ${file}`)
      } else seen[key].set(s[key], file)
    }
    if (lang !== REF) {
      const ref = data[REF]?.[file]?.section
      if (ref) {
        for (const key of ['id', 'weight', 'enable', 'showOnNavbar', 'template', 'filter', 'hideTitle']) {
          if (JSON.stringify(ref[key]) !== JSON.stringify(s[key])) {
            r.error(`${file} section.${key}: ${REF}=${JSON.stringify(ref[key])} vs ${lang}=${JSON.stringify(s[key])}. ` +
              'Diverging here makes the navbar differ by language.')
          }
        }
      }
    }
  }
}

// --- 5. no filter button can end up with zero items ---------------------
for (const lang of LANGS) {
  for (const [file, doc] of Object.entries(data[lang] ?? {})) {
    const buttons = doc?.buttons
    if (!Array.isArray(buttons)) continue
    const itemKey = ['skills', 'projects', 'publications'].find((k) => Array.isArray(doc[k]))
    if (!itemKey) continue
    const tokenField = itemKey === 'projects' ? 'tags' : 'categories'
    const used = new Set(doc[itemKey].flatMap((it) => it?.[tokenField] ?? []))
    for (const b of buttons) {
      if (!b?.filter || b.filter === 'all') continue
      if (!used.has(b.filter)) {
        r.error(`data/${lang}/${file}: filter button "${b.filter}" matches no ${itemKey}[].${tokenField}, ` +
          'so clicking it empties the section')
      }
    }
  }
}

// --- 6 & 7. list lengths and field classification -----------------------
// A responsibility bullet dropped in one translation is invisible otherwise.
// Untranslated fields are aggregated per file: during F5 they are the
// translation backlog, and one line per leaf drowns out the real failures.
const untranslated = new Map()
const unclassified = new Set()
for (const lang of LANGS.slice(1)) {
  for (const file of refFiles) {
    const ref = data[REF][file]
    const got = data[lang]?.[file]
    if (!got) continue

    // Keyed by the EXACT path. Keying by the normalised path collapses
    // skills.0.categories and skills.1.categories into one entry, so every
    // list gets compared against the last one's length.
    const refArrays = new Map([...arrays(ref)].map((a) => [a.path, a.length]))
    for (const a of arrays(got)) {
      if (classify(norm(a.path)) === 'varies') continue
      if (refArrays.has(a.path) && refArrays.get(a.path) !== a.length) {
        r.error(`${file} ${a.path}: ${REF} has ${refArrays.get(a.path)} items, ${lang} has ${a.length}`)
      }
    }

    const refLeaves = new Map([...leaves(ref)].map((l) => [l.path, l.value]))
    for (const { path: p, value } of leaves(got)) {
      const kind = classify(norm(p))
      if (kind === 'varies') continue
      if (kind === 'unknown') { unclassified.add(`${file} ${norm(p)}`); continue }
      if (!refLeaves.has(p)) continue
      const refVal = refLeaves.get(p)
      if (kind === 'fixed' && JSON.stringify(refVal) !== JSON.stringify(value)) {
        r.error(`${file} ${p} must match across languages: ${REF}=${JSON.stringify(refVal)} vs ${lang}=${JSON.stringify(value)}`)
      }
      if (kind === 'text' && refVal && refVal === value) {
        const key = `${lang}/${file}`
        untranslated.set(key, (untranslated.get(key) ?? 0) + 1)
      }
    }
  }
}

// --- 8. every referenced asset exists -----------------------------------
// skills[].logo is fatal on its own: cards/skill.html is the theme's only
// resources.Get without a nil guard, so a missing file breaks the build.
for (const lang of LANGS) {
  for (const [file, doc] of Object.entries(data[lang] ?? {})) {
    for (const { path: p, value } of leaves(doc)) {
      if (!/(^|\.)(logo|darkLogo|image|badge)$/.test(p.replace(/\.\d+/g, ''))) continue
      if (!value || isExternal(value)) continue
      if (!resolveAsset(value)) {
        const fatal = /^skills\[\]\.logo$/.test(norm(p))
        r.error(`data/${lang}/${file} ${p} -> "${value}" does not exist under assets/ or static/` +
          (fatal ? ' — THIS BREAKS THE BUILD (cards/skill.html has no nil guard; use `icon:` instead)' : ''))
      }
    }
  }
}

// --- 9. featured posts exist for their own language ---------------------
// site.GetPage is language scoped and wrapped in `with`, so an untranslated
// post vanishes from the list without a word.
// site.GetPage resolves a bare directory name as well as a full path, so the
// check mirrors that: look for the slug anywhere under content/, not only at
// the root. A bare name is still fragile once two posts share a leaf name,
// hence the warning nudging towards the full path.
{
  const contentFiles = walk(path.join(REPO, 'content'))
  for (const lang of LANGS) {
    const posts = data[lang]?.['sections/featured-posts.yaml']?.posts
    if (!Array.isArray(posts)) continue
    for (const slug of posts) {
      const rel = String(slug).replace(/^\/+|\/+$/g, '').replace(/\.md$/, '')
      const suffix = lang === REF ? '' : `.${lang}`
      const re = new RegExp(`(^|/)${rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(index|_index)${suffix.replace('.', '\\.')}\\.md$`)
      const hit = contentFiles.find((f) => re.test(f))
      if (!hit) {
        r.error(`data/${lang}/sections/featured-posts.yaml lists "${slug}" but no ${lang} content file exists. ` +
          'site.GetPage is language scoped and wrapped in `with`, so this entry vanishes from the list silently.')
      } else if (!rel.includes('/')) {
        r.warn(`data/${lang}/sections/featured-posts.yaml: "${slug}" resolves to ${hit} by bare name; ` +
          'prefer the full path from the content root, e.g. "posts/' + rel + '"')
      }
    }
  }
}

// --- hugo.yaml languages must match the data/ directories --------------
// Parsed as YAML rather than by regex: the working tree is CRLF, so a pattern
// anchored on "\n" silently matched nothing and the check always passed empty.
{
  const cfg = readYaml(path.join(REPO, 'hugo.yaml'))
  const declared = Object.keys(cfg.languages ?? {}).sort()
  const present = [...new Set(walk(path.join(REPO, 'data')).map((p) => p.split('/')[0]))].sort()
  const want = [...LANGS].sort()
  if (declared.join(',') !== want.join(',')) {
    r.error(`hugo.yaml declares languages [${declared}], expected [${want}]`)
  }
  if (present.join(',') !== want.join(',')) {
    r.error(`data/ contains [${present}], expected [${want}]`)
  }
  if (cfg.defaultContentLanguage !== REF) {
    r.error(`hugo.yaml defaultContentLanguage is "${cfg.defaultContentLanguage}", expected "${REF}"`)
  }
}

for (const [key, n] of [...untranslated].sort()) {
  r.warn(`${key}: ${n} field${n === 1 ? '' : 's'} identical to ${REF} — translation pending`)
}
for (const u of [...unclassified].sort()) {
  r.warn(`${u}: not classified as fixed/text/varies, add a rule in scripts/check-i18n.mjs`)
}

r.finish()
