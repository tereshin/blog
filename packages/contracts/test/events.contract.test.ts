import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import * as events from '../src/events/index.ts'

const fixtures_root = join(import.meta.dirname, 'fixtures')

function schemas(): z.ZodObject[] {
  return Object.values(events).filter((value): value is z.ZodObject => {
    if (!value || typeof value !== 'object' || !('shape' in value)) return false
    const name = (value as z.ZodObject).shape['name']
    return name instanceof z.ZodLiteral
  })
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : path.endsWith('.json') ? [path] : []
  })
}

const by_name = new Map<string, z.ZodObject>()
for (const schema of schemas()) {
  const name = schema.shape['name']
  if (name instanceof z.ZodLiteral) by_name.set(String(name.value), schema)
}

describe('контракт событий', () => {
  const files = walk(fixtures_root)

  it('у каждой фикстуры есть схема', () => {
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const body = JSON.parse(readFileSync(file, 'utf8')) as { name?: string }
      expect(by_name.has(String(body.name)), file).toBe(true)
    }
  })

  it('каждая фикстура разбирается своей схемой', () => {
    for (const file of files) {
      const body = JSON.parse(readFileSync(file, 'utf8')) as { name: string }
      const schema = by_name.get(body.name)
      expect(schema, file).toBeDefined()
      expect(schema?.parse(body)).toMatchObject({ name: body.name })
    }
  })
})
