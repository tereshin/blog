import { buildApp } from './app.ts'
import { loadEnv } from './config/env.ts'

const env = loadEnv()
const app = await buildApp(env)
await app.listen({ host: '0.0.0.0', port: env.HTTP_PORT })
