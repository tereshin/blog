import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://blog:blog@127.0.0.1:5432/blog';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: databaseUrl,
  },
});
