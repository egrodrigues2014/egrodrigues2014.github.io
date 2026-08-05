#!/usr/bin/env node
/**
 * Guards the local theme overrides against silent drift.
 *
 * Every file under layouts/ that copies theme code carries a marker:
 *
 *   THEME-VERSION: v4.16.0
 *
 * This asserts each marker still matches the theme version pinned in go.mod. The
 * failure being prevented is quiet and nasty: bump the theme, the upstream
 * partial gains a tag or a partial call, our stale copy silently drops it, and
 * nothing anywhere complains. That already happened once in this project in a
 * different form — the og:image pointing at an unpublished asset path produced a
 * broken social card with a green build.
 *
 * Comparing file contents against the module cache would be stronger, but the
 * cache lives at a different path on Windows and in CI, so the check would be
 * environment-dependent and would rot. The version marker is environment-neutral
 * and does the one thing that matters: force a human diff on upgrade.
 */
import fs from 'node:fs'
import path from 'node:path'
import { REPO, Report, walk } from './lib.mjs'

const r = new Report('theme overrides')

const THEME = 'github.com/hugo-toha/toha/v4'
const goMod = fs.readFileSync(path.join(REPO, 'go.mod'), 'utf8')
const pinned = goMod.match(new RegExp(`${THEME.replace(/[.\/]/g, '\\$&')}\\s+(v[\\d.]+)`))?.[1]

if (!pinned) {
  r.error(`could not find the ${THEME} version in go.mod`)
  r.finish()
}

// Templates are not the only thing that can be copied from the theme. The
// project's assets/ shadows the theme's for an identical path — the mechanism
// assets/styles/override.scss already relies on — so a copied script drifts on
// upgrade in exactly the same silent way a copied partial does.
const ROOTS = [
  ['layouts', '.html'],
  ['assets', '.js'],
  ['assets', '.scss']
]

const files = ROOTS.flatMap(([root, ext]) =>
  walk(path.join(REPO, root)).filter((f) => f.endsWith(ext)).map((f) => `${root}/${f}`))

if (!files.length) console.log('  no local overrides')

for (const rel of files) {
  const text = fs.readFileSync(path.join(REPO, rel), 'utf8')
  // `v\d+(\.\d+)*` and not `v[\d.]+`: the loose class swallows a sentence-ending
  // period, so a marker written as "... @ THEME-VERSION: v4.16.0. The div..." was
  // read as version "v4.16.0." and failed against a go.mod pinning "v4.16.0" — a
  // confusing error where the two strings look identical in the message.
  const marker = text.match(/THEME-VERSION:\s*(v\d+(?:\.\d+)*)/)?.[1]

  // Files written from scratch declare so; only copies need a marker.
  //
  // Case-sensitive: the declaration is a token, not a phrase. Matching it
  // case-insensitively meant a comment in a from-scratch partial that mentioned
  // "the local override of ..." in passing was read as a declaration, and the
  // file was then reported for missing a marker it correctly does not have.
  //
  // A copy that declares itself in mixed case is still caught, just by the other
  // error: it has a marker but no recognised declaration.
  const isCopy = text.includes('LOCAL OVERRIDE')

  if (!isCopy) {
    if (marker) r.error(`${rel} carries a THEME-VERSION marker but is not declared a LOCAL OVERRIDE`)
    continue
  }
  if (!marker) {
    r.error(`${rel} is declared a LOCAL OVERRIDE but has no "THEME-VERSION: vX.Y.Z" marker, ` +
      'so an upgrade could not be detected')
    continue
  }
  if (marker !== pinned) {
    r.error(`${rel} was copied from theme ${marker}, but go.mod now pins ${pinned}. ` +
      'Diff it against the new upstream file — anything the theme added, this copy is silently ' +
      `dropping — then update the marker to ${pinned}.`)
  }
}

r.finish()
