import { UsageError, parseArgs } from './lib/compose.ts'
import { CommandError, compose, readEnvFile } from './lib/run.ts'

function main(): void {
  const { env, volumes } = parseArgs(process.argv.slice(2))
  readEnvFile(env)
  // Тома не трогаем, пока явно не попросили: данные баз и MinIO живут в именованных томах.
  const result = compose(env, volumes ? ['down', '--volumes'] : ['down'])
  if (result.code !== 0) throw new CommandError(`docker compose down завершился с кодом ${result.code}`, result.code)
  console.log(volumes ? `Окружение ${env} остановлено, тома удалены.` : `Окружение ${env} остановлено, тома сохранены.`)
}

try {
  main()
} catch (error: unknown) {
  if (error instanceof CommandError) {
    console.error(error.message)
    process.exit(error.exit_code)
  }
  if (error instanceof UsageError) {
    console.error(error.message)
    process.exit(2)
  }
  throw error
}
