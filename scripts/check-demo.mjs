#!/usr/bin/env node
/**
 * Regression scan for leftovers of the theme's example site.
 *
 * Expected to FAIL until the content phase finishes: it doubles as a progress
 * counter (how many demo traces are left) and, from then on, as the gate that
 * stops one creeping back in. The patterns were written while the demo data
 * was still in front of us, which is the only time you know what to look for.
 */
import fs from 'node:fs'
import path from 'node:path'
import { REPO, Report, walk } from './lib.mjs'

const r = new Report('no demo data')

const PATTERNS = [
  [/John Doe|John's|\bJessica\b/i, 'demo person'],
  [/johndoe|john[.-]doe/i, 'demo handle'],
  [/Example Co\.?|example\.com|example@gmail\.com/i, 'demo company or contact'],
  [/Lorem ipsum/i, 'filler text'],
  [/hugo-toha|hugo-themes|hossainemruz/i, "theme author's identity"],
  [/toha-preview|toha-example-site|toha-docs/i, "theme author's sites"],
  [/G-H4LBG7NDFZ/, "third-party Google Analytics id"],
  [/\bpercy\b|api\.netlify\.com/i, 'third-party CI service'],
  [/credly\.com\/org\//i, 'Credly org template URL, not a personal credential'],
  [/kubernetes\/kubernetes|tensorflow\/tensorflow|kelseyhightower\/nocode/i, "someone else's repository"],
  [/\+0123456789/, 'demo phone number'],
  [/©\s*2020/, 'demo copyright year'],
  [/url:\s*["']?#["']?\s*$/m, 'social link pointing nowhere'],
  [/files\/resume\.pdf/, 'demo CV path — should be files/cv-<name>-<lang>.pdf'],
  [/images\/author\/(john|jessica)/i, 'demo author image'],
  [/ABC University|University of XYZ|MST College|JK School/i, 'demo institution'],
  [/PreExample|Intern Counting Company/i, 'demo employer'],
  [/Dr\. (Madman|Lessmad|Moremad|Goodman)/i, 'demo author name']
]

/**
 * Legitimate occurrences. Each needs a reason: an allowlist without one
 * becomes the place where real findings go to be forgotten.
 */
const ALLOW = [
  // The theme module import. Required for the site to build at all, and the
  // reason `hugo-toha` will keep appearing in this repo forever.
  /github\.com\/hugo-toha\/toha\/v4/,
  // Commented-out Matomo placeholder shipped by the theme, under a disabled
  // feature. Inert documentation, not our configuration.
  /#\s*instance:\s*matomo\.example\.com/,
  // Footer attribution. The theme is MIT licensed, which requires crediting it,
  // so "hugo-toha" appears here by obligation rather than by leftover.
  /\[Toha\]\(https:\/\/github\.com\/hugo-toha\/toha\)/
]

// hugo.yaml is scanned; generated and vendored trees are not.
const ROOTS = ['data', 'content', 'static', '.github', 'archetypes']
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

let hits = 0
for (const rel of targets) {
  const text = fs.readFileSync(path.join(REPO, rel), 'utf8')
  const lines = text.split(/\r?\n/)
  for (const [re, label] of PATTERNS) {
    // Per-line so the report points at something actionable.
    lines.forEach((line, i) => {
      if (ALLOW.some((a) => a.test(line))) return
      const flags = re.flags.replace('m', '').replace('g', '')
      if (new RegExp(re.source, flags).test(line)) {
        hits++
        r.error(`${rel}:${i + 1} ${label}: ${line.trim().slice(0, 90)}`)
      }
    })
  }
}

if (!hits) console.log(`scanned ${targets.length} files, no demo traces left`)
r.finish()
