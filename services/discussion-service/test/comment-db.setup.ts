// Temporary test adapter: isolated databases in the already-running PostgreSQL.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { vi } from 'vitest'
vi.mock('@blog/db-kit/testing', async (importOriginal) => {
  const original = await importOriginal<typeof import('@blog/db-kit/testing')>()
  return { ...original, startPostgres: async () => {
    const [container] = JSON.parse(execFileSync('docker', ['inspect', 'blog-discussion-db-1'], { encoding: 'utf8' }))
    const values = Object.fromEntries(container.Config.Env.map((line: string) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)] }))
    const config = { host: 'localhost', port: 5435, user: values.POSTGRES_USER, password: values.POSTGRES_PASSWORD, database: 'postgres' }
    const pool = new pg.Pool(config)
    const name = `comments_test_${randomUUID().replaceAll('-', '')}`
    await pool.query(`CREATE DATABASE "${name}"`)
    const url = new URL(`postgres://localhost:5435/${name}`)
    url.username = config.user; url.password = config.password
    return { url: url.href, stop: async () => { await pool.query(`DROP DATABASE "${name}" WITH (FORCE)`); await pool.end() } }
  } }
})
