import { UsageError } from './lib/compose.ts'
import { BootstrapRefusedError, planBootstrap } from './lib/bootstrap-plan.ts'
import { CommandError, compose, readEnvFile } from './lib/run.ts'

// `pnpm infra:bootstrap-prod` — только окружение prod.
function main(): void {
  const env_text = readEnvFile('prod')
  const steps = planBootstrap(env_text)
  for (const step of steps) {
    console.log(`bootstrap: ${step.service}…`)
    const result = compose('prod', step.compose_args)
    if (result.code !== 0) {
      throw new CommandError(`bootstrap остановлен: сервис ${step.service} завершился с кодом ${result.code}.`, result.code)
    }
  }
  console.log('Суперадминистратор и настройки по умолчанию готовы.')
}

try {
  main()
} catch (error: unknown) {
  if (error instanceof BootstrapRefusedError || error instanceof CommandError) {
    console.error(error.message)
    process.exit(error instanceof CommandError ? error.exit_code : 1)
  }
  if (error instanceof UsageError) {
    console.error(error.message)
    process.exit(2)
  }
  throw error
}
