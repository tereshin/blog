import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('web nginx CSP', () => {
  it('разрешает Google API loader во всех политиках HTML', () => {
    const config = readFileSync(resolve(import.meta.dirname, '../../docker/web.nginx.conf'), 'utf8')
    const policies = [...config.matchAll(/add_header Content-Security-Policy "([^"]+)"/g)]
    expect(policies).toHaveLength(2)
    for (const policy of policies) {
      const scripts = policy[1]
        ?.split(';')
        .find((directive) => directive.trim().startsWith('script-src'))
      expect(scripts?.trim()).toBe("script-src 'self' https://apis.google.com")
    }
  })
})
