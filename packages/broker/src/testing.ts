import { GenericContainer, Wait } from 'testcontainers'

export type TestNats = { url: string; stop: () => Promise<void> }

/** Реальный NATS с JetStream для integration-тестов (testcontainers). */
export async function startNats(): Promise<TestNats> {
  const container = await new GenericContainer('nats:2.10-alpine')
    .withCommand(['-js'])
    .withExposedPorts(4222)
    .withWaitStrategy(Wait.forLogMessage(/Server is ready/))
    .start()
  return { url: `nats://${container.getHost()}:${container.getMappedPort(4222)}`, stop: async () => void (await container.stop()) }
}
