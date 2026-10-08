import { ALL_SERVICES, UsageError, expandServices, findPlaceholder, hasMockGoogle, parseArgs } from './lib/compose.ts'
import { CommandError, compose, readEnvFile, waitForHttp } from './lib/run.ts'

const WAIT_TIMEOUT_MS = 180_000

async function main(): Promise<void> {
  const { env, services } = parseArgs(process.argv.slice(2))
  const env_text = readEnvFile(env)

  if (env === 'prod') {
    const placeholder = findPlaceholder(env_text)
    if (placeholder) {
      throw new CommandError(`infra/env/prod.env: значение ${placeholder} осталось заглушкой CHANGE_ME. Запуск prod отменён.`)
    }
    const listing = compose(env, ['config', '--services'], { capture: true })
    if (listing.code !== 0) throw new CommandError('Не удалось собрать конфигурацию Compose для prod', listing.code)
    if (hasMockGoogle(listing.stdout)) {
      throw new CommandError('Собранная конфигурация prod содержит mock-google: запуск запрещён (FR-132).')
    }
  }

  const up_args = ['up', '-d', '--wait']
  if (env === 'local') up_args.push('--build')
  if (services) {
    const unknown = services.filter((name) => ![...ALL_SERVICES, 'web', 'mock-google'].includes(name))
    if (unknown.length > 0) throw new UsageError(`Неизвестные сервисы: ${unknown.join(', ')}`)
    up_args.push('--no-deps', ...expandServices(services))
  }

  const result = compose(env, up_args)
  if (result.code !== 0) {
    throw new CommandError(`docker compose up завершился с кодом ${result.code}. Смотрите вывод выше: имя упавшей задачи указано в строке ошибки.`, result.code)
  }

  const wanted = services ?? ['gateway', 'web']
  if (wanted.includes('gateway') && !(await waitForHttp('http://localhost:3000/health/ready', WAIT_TIMEOUT_MS))) {
    throw new CommandError('gateway не стал готов за 180 с (GET /health/ready)')
  }
  if (wanted.includes('web') && !(await waitForHttp('http://localhost:8080/', WAIT_TIMEOUT_MS))) {
    throw new CommandError('Клиент не стал готов за 180 с (http://localhost:8080/)')
  }
  console.log(`Окружение ${env} запущено.`)
}

main().catch((error: unknown) => {
  if (error instanceof CommandError) {
    console.error(error.message)
    process.exit(error.exit_code)
  }
  if (error instanceof UsageError) {
    console.error(error.message)
    process.exit(2)
  }
  throw error
})
