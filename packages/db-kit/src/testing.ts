import { PostgreSqlContainer } from '@testcontainers/postgresql'

export type TestPostgres = { url: string; stop: () => Promise<void> }

/** Реальный PostgreSQL 16 для integration-тестов (testcontainers). */
export async function startPostgres(): Promise<TestPostgres> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start()
  return { url: container.getConnectionUri(), stop: async () => void (await container.stop()) }
}

/**
 * Хеш содержимого таблиц: идемпотентность seed — «хеш до и после повторного запуска совпал».
 * Строки сортируются по тексту, поэтому порядок вставки не важен.
 */
export async function hashTables(pool: { query: (text: string) => Promise<{ rows: { hash: string }[] }> }, tables: readonly string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const table of tables) {
    const { rows } = await pool.query(`select coalesce(md5(string_agg(t::text, '|' order by t::text)), '') as hash from ${table} t`)
    result[table] = rows[0]?.hash ?? ''
  }
  return result
}
