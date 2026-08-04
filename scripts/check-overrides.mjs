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

const layouts = walk(path.join(REPO, 'layouts')).filter((f) => f.endsWith('.html'))
if (!layouts.length) console.log('  no local layout overrides')

for (const rel of layouts) {
  const text = fs.readFileSync(path.join(REPO, 'layouts', rel), 'utf8')
  const marker = text.match(/THEME-VERSION:\s*(v[\d.]+)/)?.[1]

  // Files written from scratch declare so; only copies need a marker.
  const isCopy = /LOCAL OVERRIDE/i.test(text)

  if (!isCopy) {
    if (marker) r.error(`layouts/${rel} carries a THEME-VERSION marker but is not declared a LOCAL OVERRIDE`)
    continue
  }
  if (!marker) {
    r.error(`layouts/${rel} is declared a LOCAL OVERRIDE but has no "THEME-VERSION: vX.Y.Z" marker, ` +
      'so an upgrade could not be detected')
    continue
  }
  if (marker !== pinned) {
    r.error(`layouts/${rel} was copied from theme ${marker}, but go.mod now pins ${pinned}. ` +
      'Diff it against the new upstream file — if the theme added anything to <head>, this copy is ' +
      `silently dropping it — then update the marker to ${pinned}.`)
  }
}

r.finish()
