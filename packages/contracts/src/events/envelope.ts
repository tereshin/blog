import { z } from 'zod'

/** Общая часть каждого события (node-microservices.mdc): трассировка и идемпотентность. */
export const eventEnvelopeSchema = z.object({
  event_id: z.uuid(),
  name: z.string().regex(/^[a-z]+\.[a-z_]+\.[a-z_]+$/, 'ожидается <context>.<entity>.<past-tense>'),
  occurred_at: z.iso.datetime(),
  correlation_id: z.string().min(1),
  causation_id: z.string().min(1).nullable(),
  version: z.number().int().positive(),
})

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>

/**
 * Собирает схему события: конверт плюс полезная нагрузка, имя и версия — литералы.
 * Файлы событий называются `<event>.v<N>.ts`; ломающее изменение — новая версия.
 */
export function defineEvent<
  const TName extends string,
  const TVersion extends number,
  TShape extends z.ZodRawShape,
>(name: TName, version: TVersion, payload: TShape) {
  return eventEnvelopeSchema.extend({
    name: z.literal(name),
    version: z.literal(version),
    ...payload,
  })
}
