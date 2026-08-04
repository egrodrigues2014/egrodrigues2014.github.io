#!/usr/bin/env node
/**
 * Scans for personal data that must not reach a public repository.
 *
 * .gitignore stops the LinkedIn profile export itself from being committed.
 * This is the second layer: it stops the export's *contents* from being copied
 * into a YAML file by hand. The history of a public repo is permanent, and
 * removing a committed phone number means rewriting history and force pushing,
 * with GitHub having already cached the old object.
 *
 * Written to be noisy rather than clever. A false positive costs a glance; a
 * miss costs a permanent leak.
 */
import fs from 'node:fs'
import path from 'node:path'
import { REPO, Report, walk } from './lib.mjs'

const r = new Report('no personal data')

const PATTERNS = [
  // Spanish mobile/landline, with or without +34 and separators.
  [/(?:\+?34[\s.\-]?)?[6789]\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3}\b/, 'possible Spanish phone number'],
  // Brazilian mobile with area code.
  [/\+?55[\s.\-]?\d{2}[\s.\-]?9?\d{4}[\s.\-]?\d{4}\b/, 'possible Brazilian phone number'],
  [/\b\d{8}[A-Z]\b/, 'possible DNI'],
  [/\b[XYZ]\d{7}[A-Z]\b/, 'possible NIE'],
  [/\b[A-Z]{2}\d{2}[\s]?(?:\d{4}[\s]?){3,5}\d{0,4}\b/, 'possible IBAN'],
  // `c/` needs trailing whitespace: without it this matched the "C/" in
  // "C/C++ programming" and reported a skill summary as a postal address.
  [/\b(?:calle|avenida|avda|paseo|plaza|piso|portal|escalera|c[oó]digo postal)\b|\bc\/\s+\w/i, 'possible postal address'],
  [/\b(?:fecha de nacimiento|date of birth|data de nascimento)\b/i, 'date of birth'],
  [/\b\d{2}\/\d{2}\/(?:19[5-9]\d|20[01]\d)\b/, 'possible full date of birth']
]

const ROOTS = ['data', 'content', 'static', 'archetypes']
const FILES = ['hugo.yaml', 'README.md']
const SKIP_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp4', '.woff', '.woff2', '.ttf'])

const targets = []
for (const f of FILES) if (fs.existsSync(path.join(REPO, f))) targets.push(f)
for (const root of ROOTS) {
  for (const rel of walk(path.join(REPO, root))) {
    if (SKIP_EXT.has(path.extname(rel).toLowerCase())) continue
    targets.push(`${root}/${rel}`)
  }
}

for (const rel of targets) {
  const lines = fs.readFileSync(path.join(REPO, rel), 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    for (const [re, label] of PATTERNS) {
      if (re.test(line)) {
        r.error(`${rel}:${i + 1} ${label}: ${line.trim().slice(0, 90)}`)
      }
    }
  })
}

// Any PDF that is not an intentionally published CV.
for (const rel of walk(path.join(REPO, 'static'))) {
  if (rel.toLowerCase().endsWith('.pdf') && !/(^|\/)cv-[^/]+\.pdf$/.test(rel)) {
    r.error(`static/${rel} is a PDF that is not a curated CV. Publishable CVs are named ` +
      'static/files/cv-<name>-<lang>.pdf; a LinkedIn export carries a phone number and often an address.')
  }
}

if (!r.errors.length) console.log(`scanned ${targets.length} files, nothing personal found`)
r.finish()
