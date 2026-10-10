/* eslint-disable no-console -- CLI generator reports validation errors and its output. */
/**
 * Generates `src/shared/ui/icons.generated.ts` from the SVG catalogue in
 * `icons-source/`.
 *
 * The catalogue ships ~1500 icons per style and the app uses about a hundred of
 * them, so shipping the whole folder meant a 13 MB deploy artefact and one HTTP
 * request per rendered icon. Only the referenced icons are inlined instead.
 *
 *   node scripts/generate-icons.mjs          # rewrite the generated module
 *   node scripts/generate-icons.mjs --check  # fail if it is out of date
 *
 * Icon names are read straight out of the source, so a typo in a `name` prop
 * fails the build here instead of silently rendering a blank square.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(projectRoot, 'icons-source')
const srcDir = join(projectRoot, 'src')
const outputFile = join(srcDir, 'shared/ui/icons.generated.ts')

const styles = ['fill', 'line']
const defaultStyle = 'fill'

/**
 * `name` is also a plain DOM attribute, so the scan picks up form fields and
 * meta tags too. Anything without a matching SVG is dropped rather than
 * reported, but a name used on `BaseIcon` is checked separately below.
 */
const referencePatterns = [
  /\bname="([a-z][a-z0-9_]*)"/g,
  /\bicon="([a-z][a-z0-9_]*)"/g,
  /\bicon:\s*'([a-z][a-z0-9_]*)'/g,
  /\bname=\{[^}]*?'([a-z][a-z0-9_]*)'/g,
]

/** Attributes React spells differently from SVG. */
const propNames = {
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
}

const allowedTags = new Set([
  'path',
  'circle',
  'rect',
  'ellipse',
  'line',
  'polygon',
  'polyline',
  'g',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
])

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : []
  })
}

function collectReferences() {
  const names = new Set()
  const nonDefault = new Set()
  const checked = []

  for (const file of sourceFiles(srcDir)) {
    if (file === outputFile) continue
    const source = readFileSync(file, 'utf8')

    for (const pattern of referencePatterns) {
      for (const [, name] of source.matchAll(pattern)) names.add(name)
    }

    for (const [tag] of source.matchAll(/<BaseIcon\b[^>]*?\/>/gs)) {
      const name = tag.match(/\bname="([^"]+)"/)?.[1]
      const style = tag.match(/\bstyle="(fill|line)"/)?.[1] ?? defaultStyle

      // A literal name must resolve; a dynamic one cannot be checked here.
      if (name) checked.push({ file, name })
      if (style === defaultStyle) continue

      if (name) {
        nonDefault.add(`${name}:${style}`)
        continue
      }

      // A dynamic name with a non-default style could be any referenced icon.
      throw new Error(
        `BaseIcon in ${relative(projectRoot, file)} uses style="${style}" with a ` +
          'dynamic name, which cannot be resolved at build time.',
      )
    }
  }

  return { names: [...names].sort(), nonDefault, checked }
}

function iconPath(name, style) {
  return join(sourceDir, style, `${name}_${style}.svg`)
}

function exists(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * The catalogue mixes literal colours into the artwork, but the icons were
 * previously painted through a CSS mask, which threw the colours away and
 * tinted everything with `currentColor`. Normalising literal colours keeps that
 * appearance now that the markup is inlined. `none` and `url(#…)` references
 * are left alone: the first hides a shape, the second points at a gradient
 * whose own stops get normalised instead.
 */
function normalizeColor(key, value) {
  if (key !== 'fill' && key !== 'stop-color' && key !== 'stroke') return value
  if (value === 'none' || value.startsWith('url(')) return value
  return 'currentColor'
}

function parseAttributes(raw) {
  const attrs = {}
  for (const [, key, value] of raw.matchAll(/([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g)) {
    if (key === 'width' || key === 'height' || key === 'xmlns') continue
    const prop = propNames[key] ?? key
    if (/-/.test(prop)) {
      throw new Error(`Unmapped SVG attribute "${key}".`)
    }
    attrs[prop] = normalizeColor(key, value)
  }
  return attrs
}

/** Parses the uniform, machine-generated icon markup into a React-ready tree. */
function parseNodes(markup, file) {
  const nodes = []
  const stack = [nodes]
  const token =
    /<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z][a-zA-Z0-9-]*="[^"]*")*)\s*(\/?)>/g
  let match

  while ((match = token.exec(markup)) !== null) {
    const [, closing, tag, rawAttrs, selfClosing] = match

    if (!allowedTags.has(tag)) {
      throw new Error(`Unsupported SVG element <${tag}> in ${file}.`)
    }

    if (closing) {
      if (stack.length === 1) throw new Error(`Unbalanced </${tag}> in ${file}.`)
      stack.pop()
      continue
    }

    const node = { tag, attrs: parseAttributes(rawAttrs) }
    stack[stack.length - 1].push(node)

    if (!selfClosing) {
      node.children = []
      stack.push(node.children)
    }
  }

  if (stack.length !== 1) throw new Error(`Unclosed SVG element in ${file}.`)
  return nodes
}

function readIcon(name, style) {
  const file = iconPath(name, style)
  const source = readFileSync(file, 'utf8')
  const viewBox = source.match(/viewBox="([^"]+)"/)?.[1]
  if (!viewBox) throw new Error(`Missing viewBox in ${file}.`)

  const inner = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')

  return { viewBox, nodes: parseNodes(inner, relative(projectRoot, file)) }
}

function build() {
  const { names, nonDefault, checked } = collectReferences()

  const missing = checked.filter(
    ({ name }) =>
      !styles.some((style) => exists(iconPath(name, style))),
  )
  if (missing.length > 0) {
    const list = missing
      .map(({ file, name }) => `  ${relative(projectRoot, file)}: "${name}"`)
      .join('\n')
    throw new Error(`BaseIcon references icons that do not exist:\n${list}`)
  }

  // Every referenced name is inlined in the default style, because a dynamic
  // `name` can resolve to any of them. Other styles are only inlined where the
  // source asks for them by name.
  const keys = new Set()
  for (const name of names) {
    if (exists(iconPath(name, defaultStyle))) keys.add(`${name}:${defaultStyle}`)
  }
  for (const key of nonDefault) {
    const [name, style] = key.split(':')
    if (!exists(iconPath(name, style))) {
      throw new Error(`Missing icon "${name}" in style "${style}".`)
    }
    keys.add(key)
  }

  const icons = {}
  for (const key of keys) {
    const [name, style] = key.split(':')
    icons[key] = readIcon(name, style)
  }

  const sorted = Object.keys(icons).sort()
  const entries = sorted
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(icons[key])},`)
    .join('\n')

  const iconNames = [...new Set(sorted.map((key) => key.split(':')[0]))].sort()

  return `/* eslint-disable */
// Generated by scripts/generate-icons.mjs from icons-source/. Do not edit.
// Run \`pnpm --filter web icons\` after adding or removing a BaseIcon reference.

export type IconNode = {
  tag: string
  attrs: Record<string, string>
  children?: IconNode[]
}

export type Icon = {
  viewBox: string
  nodes: IconNode[]
}

export type IconName = ${iconNames.map((name) => `'${name}'`).join(' | ')}

export const icons: Record<string, Icon> = {
${entries}
}
`
}

const output = build()

if (process.argv.includes('--check')) {
  const current = (() => {
    try {
      return readFileSync(outputFile, 'utf8')
    } catch {
      return ''
    }
  })()

  if (current !== output) {
    console.error(
      'src/shared/ui/icons.generated.ts is out of date. Run `pnpm --filter web icons`.',
    )
    process.exit(1)
  }

  console.log('Icon module is up to date.')
} else {
  writeFileSync(outputFile, output)
  console.log(
    `Wrote ${relative(projectRoot, outputFile)} (${(output.length / 1024).toFixed(1)} KB).`,
  )
}
