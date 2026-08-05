#!/usr/bin/env node
/**
 * Generates the OpenGraph share card: static/files/og-elton-rodrigues.png, 1200x630.
 *
 *   node scripts/make-og-card.mjs
 *
 * WHAT og:image ACTUALLY IS
 *
 * The image LinkedIn, WhatsApp, Slack, Telegram, Teams and Discord render when
 * someone shares a link to the site. It is the most-seen image the site has,
 * because it is seen before anyone clicks.
 *
 * What it replaced was the 800x800 profile photo. A square is the wrong shape:
 * LinkedIn composes its large card at 1.91:1, and given a square it either crops
 * top and bottom or — usually — demotes the link to a small thumbnail beside the
 * text. So a good site rendered as a discreet grey line in the feed.
 *
 * ONE CARD FOR ALL THREE LANGUAGES
 *
 * Everything on it — the name, "Lead Data Engineer", the stack, the URL — is
 * already identical in all three languages by decision: the job title has no
 * settled Spanish or Portuguese equivalent and is deliberately left in English
 * across the site. So `openGraph.image` stays FIXED in check-i18n's terms and
 * there is one file, not three.
 *
 * WHY resvg AND NOT A BROWSER
 *
 * Chromium was the obvious tool and does not work on this machine: Edge 151
 * headless logs "Network service crashed or was terminated" and renders nothing,
 * for --print-to-pdf and --screenshot alike. The in-app browser cannot screenshot
 * either — its pane is not compositing. Both were tried before reaching for a
 * dependency.
 *
 * @resvg/resvg-js rasterises SVG, including text, with prebuilt native binaries.
 * Added to scripts/package.json, which is hand-maintained precisely so
 * dependencies survive the root package.json being regenerated.
 *
 * TYPEFACE, AND AN INCONSISTENCY WORTH KNOWING ABOUT
 *
 * Segoe UI, from the system font directory. resvg needs TTF/OTF and @fontsource
 * ships Mulish only as woff/woff2, so the site's own typeface is not available
 * here without writing a woff-to-sfnt repacker. That leaves three typefaces across
 * three artefacts: Mulish on the site, Helvetica in the CV, Segoe UI on this card.
 * Nobody sees two of them at once, so it is a known cosmetic debt rather than a
 * defect — and one conversion routine would close it for both the CV and this.
 *
 * Output is committed and deterministic: no timestamps anywhere in the pipeline.
 */
import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { REPO, loadLang, green } from './lib.mjs'

const OUT = path.join(REPO, 'static/files/og-elton-rodrigues.png')
const W = 1200
const H = 630

// LinkedIn crops a few pixels off every edge, so nothing meaningful goes near one.
const PAD = 84

const d = loadLang('en')
const name = d['author.yaml'].name
const role = d['sections/about.yaml'].designation
const site = 'egrodrigues2014.github.io'

// The stack line, taken from cv.yaml's headline so it cannot drift from the CV:
// drop the role prefix and keep the technologies.
const stack = String(d['cv.yaml'].headline).split('·').slice(1).map((s) => s.trim()).join('  ·  ')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The ER monogram, same geometry as assets/images/site/monogram-badge.svg. Repeated
// rather than imported because that file is a Hugo asset with its own viewBox; this
// is a 96px badge placed on a 1200x630 canvas.
const badge = `
  <g transform="translate(${PAD} ${PAD - 6}) scale(1.5)">
    <rect width="64" height="64" rx="14" fill="#0891b2"/>
    <g transform="translate(-2 0)" fill="none" stroke="#ffffff" stroke-width="7">
      <path d="M30 21H17v22h13"/>
      <path d="M17 32h10"/>
      <path d="M40 43V21h11v11H40"/>
      <path d="M43 32l8 11"/>
    </g>
  </g>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#12202e"/>
      <stop offset="1" stop-color="#070d14"/>
    </linearGradient>
    <!-- A soft lift from the top-left, so the card has direction instead of
         reading as a flat fill. Same idea as the hero background. -->
    <radialGradient id="lift" cx="0.08" cy="0.05" r="0.9">
      <stop offset="0" stop-color="#1e3a52" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#1e3a52" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#lift)"/>

  ${badge}

  <text x="${PAD}" y="330" font-family="Segoe UI" font-size="92" font-weight="700"
        fill="#f1f5f9" letter-spacing="-2">${esc(name)}</text>

  <text x="${PAD}" y="404" font-family="Segoe UI" font-size="44" font-weight="600"
        fill="#22d3ee">${esc(role)}</text>

  <text x="${PAD}" y="470" font-family="Segoe UI" font-size="27" font-weight="400"
        fill="#94a3b8">${esc(stack)}</text>

  <rect x="${PAD}" y="524" width="72" height="4" rx="2" fill="#0891b2"/>
  <text x="${PAD}" y="566" font-family="Segoe UI" font-size="25" font-weight="600"
        fill="#64748b">${esc(site)}</text>
</svg>`

const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: {
    // Windows-only, like the CV generator. The PNG is committed, so a build never
    // depends on this running.
    fontDirs: ['C:/Windows/Fonts', '/usr/share/fonts'],
    defaultFontFamily: 'Segoe UI',
    loadSystemFonts: true
  }
})
const png = r.render().asPng()

const w = png.readUInt32BE(16)
const h = png.readUInt32BE(20)
if (w !== W || h !== H) throw new Error(`expected ${W}x${H}, got ${w}x${h}`)

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, png)
console.log(`${green('ok')}  ${path.relative(REPO, OUT)}  ${w}x${h}  ${(png.length / 1024).toFixed(1)} KB`)
console.log(`    name  "${name}"`)
console.log(`    role  "${role}"`)
console.log(`    stack "${stack}"`)
