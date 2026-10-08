import { UsageError } from './lib/compose.ts'
import { CommandError, compose, readEnvFile } from './lib/run.ts'
import { SeedForbiddenError, parseSeedRequest, planSeed } from './lib/seed-plan.ts'

// `pnpm infra:seed <local|dev> <small|large> [-- --anchor=<ISO>]`
function main(): void {
  // В prod разбор аргументов уже бросает SeedForbiddenError: ни env-файл, ни docker не трогаются.
  const request = parseSeedRequest(process.argv.slice(2))
  readEnvFile(request.env)
  for (const step of planSeed(request)) {
    console.log(`seed ${request.profile}: ${step.service}…`)
    const result = compose(request.env, step.compose_args)
    if (result.code !== 0) {
      throw new CommandError(`seed остановлен: сервис ${step.service} завершился с кодом ${result.code}. Остальные сервисы не запускались.`, result.code)
    }
  }
  console.log(`Тестовые данные (${request.profile}) записаны в ${request.env}.`)
}

try {
  main()
} catch (error: unknown) {
  if (error instanceof SeedForbiddenError || error instanceof CommandError) {
    console.error(error.message)
    process.exit(error instanceof CommandError ? error.exit_code : 1)
  }
  if (error instanceof UsageError) {
    console.error(error.message)
    process.exit(2)
  }
  throw error
}
