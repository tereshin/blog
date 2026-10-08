import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { REPO_ROOT } from './lib/run.ts'
import { hostEnvFor, parseDotenv } from './lib/host-env.ts'

// Запуск одного сервиса с хоста против контейнеров баз и NATS:
//   tsx infra/scripts/with-host-env.ts <service> -- <команда...>
const [service, separator, ...command] = process.argv.slice(2)
if (!service || separator !== '--' || command.length === 0) {
  console.error('Использование: with-host-env.ts <service> -- <команда...>')
  process.exit(2)
}

const file = resolve(REPO_ROOT, 'infra/env/local.host.env')
let text: string
try {
  text = readFileSync(file, 'utf8')
} catch {
  console.error('Нет infra/env/local.host.env. Скопируйте шаблон: cp infra/env/local.host.env.example infra/env/local.host.env')
  process.exit(1)
}

const env = { ...process.env, ...hostEnvFor(service, parseDotenv(text)) }
const [bin, ...args] = command as [string, ...string[]]
const child = spawn(bin, args, { stdio: 'inherit', env, cwd: process.cwd() })
child.on('exit', (code) => process.exit(code ?? 1))
