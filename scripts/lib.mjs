import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

export const REPO = path.resolve(import.meta.dirname, '..')
export const LANGS = ['en', 'es', 'pt-br']

export const red = (s) => `\x1b[31m${s}\x1b[0m`
export const yellow = (s) => `\x1b[33m${s}\x1b[0m`
export const green = (s) => `\x1b[32m${s}\x1b[0m`
export const dim = (s) => `\x1b[2m${s}\x1b[0m`

/** Every file under dir, as paths relative to dir, POSIX separators, sorted. */
export function walk (dir, base = dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full, base))
    else out.push(path.relative(base, full).split(path.sep).join('/'))
  }
  return out.sort()
}

export function readYaml (abs) {
  try {
    return yaml.load(fs.readFileSync(abs, 'utf8')) ?? {}
  } catch (err) {
    throw new Error(`${abs}: ${err.message}`)
  }
}

/** All data/<lang>/**.yaml for one language, keyed by relative path. */
export function loadLang (lang) {
  const root = path.join(REPO, 'data', lang)
  const out = {}
  for (const rel of walk(root)) {
    if (rel.endsWith('.yaml') || rel.endsWith('.yml')) {
      out[rel] = readYaml(path.join(root, rel))
    }
  }
  return out
}

/**
 * Depth-first walk yielding every leaf as { path, value }. Array indices become
 * numeric path segments, so `experiences.0.company.name`.
 */
export function * leaves (node, prefix = '') {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield * leaves(node[i], prefix ? `${prefix}.${i}` : String(i))
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) yield * leaves(v, prefix ? `${prefix}.${k}` : k)
  } else {
    yield { path: prefix, value: node }
  }
}

/** Every array in the tree, as { path, length }. */
export function * arrays (node, prefix = '') {
  if (Array.isArray(node)) {
    yield { path: prefix, length: node.length }
    for (let i = 0; i < node.length; i++) yield * arrays(node[i], prefix ? `${prefix}.${i}` : String(i))
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) yield * arrays(v, prefix ? `${prefix}.${k}` : k)
  }
}

/** Last non-numeric segment of a leaf path, i.e. the field name. */
export function fieldName (leafPath) {
  const parts = leafPath.split('.').filter((p) => !/^\d+$/.test(p))
  return parts[parts.length - 1] ?? ''
}

/**
 * Resolve an asset reference the way Hugo does for this theme: `resources.Get`
 * looks under assets/, and a raw <img src> is served from static/. Leading
 * slash is optional in the data files, both conventions appear upstream.
 */
export function resolveAsset (ref) {
  const clean = String(ref).replace(/^\//, '')
  for (const root of ['assets', 'static']) {
    const p = path.join(REPO, root, clean)
    if (fs.existsSync(p)) return path.relative(REPO, p).split(path.sep).join('/')
  }
  return null
}

export function isExternal (ref) {
  return /^(https?:|mailto:|tel:|#|javascript:)/i.test(String(ref))
}

export class Report {
  constructor (name) {
    this.name = name
    this.errors = []
    this.warnings = []
  }

  error (msg) { this.errors.push(msg) }
  warn (msg) { this.warnings.push(msg) }

  /** Prints and exits non-zero if there are errors. */
  finish () {
    for (const w of this.warnings) console.log(`${yellow('WARN')}  ${w}`)
    for (const e of this.errors) console.log(`${red('FAIL')}  ${e}`)
    const n = this.errors.length
    const w = this.warnings.length
    if (n === 0) {
      console.log(`${green('PASS')}  ${this.name}${w ? dim(` (${w} warning${w === 1 ? '' : 's'})`) : ''}`)
      return
    }
    console.log(`${red('FAIL')}  ${this.name}: ${n} problem${n === 1 ? '' : 's'}`)
    process.exit(1)
  }
}
