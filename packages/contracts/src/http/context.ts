import { z } from 'zod'

export const ROLES = ['guest', 'member', 'admin', 'superadmin'] as const
export const roleSchema = z.enum(ROLES)
export type Role = z.infer<typeof roleSchema>

/** Служебный контекст: gateway подписывает его, сервисы cookie браузера не видят. */
export const serviceContextSchema = z.strictObject({
  user_id: z.uuid().optional(),
  role: roleSchema,
  is_restricted: z.boolean(),
  can_publish: z.boolean(),
  /** `user:{id}` для вошедшего, `guest:{cookie}` для гостя. */
  viewer_key: z.string().min(1),
  /**
   * Нет поля в старом JWT — истина. Новый identity всегда пишет факт.
   * Старый токен живёт не дольше 60 с.
   */
  email_verified: z.boolean().default(true),
})
type ServiceContextParsed = z.infer<typeof serviceContextSchema>
/** `email_verified` можно не задавать: разбор схемы подставляет истину. */
export type ServiceContext = Omit<ServiceContextParsed, 'email_verified'> & { email_verified?: boolean }

export const SERVICE_CONTEXT_HEADER = 'x-service-context'
export const SERVICE_JWT_MAX_TTL_SECONDS = 60

/** Claims JWT: `sub` = `user_id` (у гостя — `viewer_key`), `exp` − `iat` ≤ 60 с. */
export const serviceJwtClaimsSchema = z
  .strictObject({
    sub: z.string().min(1),
    role: roleSchema,
    is_restricted: z.boolean(),
    can_publish: z.boolean(),
    viewer_key: z.string().min(1),
    /** Нет поля — истина, как у служебного контекста. */
    email_verified: z.boolean().default(true),
    iat: z.number().int(),
    exp: z.number().int(),
  })
  .refine((claims) => claims.exp - claims.iat <= SERVICE_JWT_MAX_TTL_SECONDS, {
    message: `TTL служебного JWT не больше ${SERVICE_JWT_MAX_TTL_SECONDS} с`,
    path: ['exp'],
  })
export type ServiceJwtClaims = z.infer<typeof serviceJwtClaimsSchema>

export function claimsToContext(claims: ServiceJwtClaims): ServiceContext {
  return {
    ...(claims.role === 'guest' ? {} : { user_id: claims.sub }),
    role: claims.role,
    is_restricted: claims.is_restricted,
    can_publish: claims.can_publish,
    viewer_key: claims.viewer_key,
    email_verified: claims.email_verified,
  }
}

export function contextToClaims(context: ServiceContext, now_seconds: number, ttl_seconds = 30): ServiceJwtClaims {
  return {
    sub: context.user_id ?? context.viewer_key,
    role: context.role,
    is_restricted: context.is_restricted,
    can_publish: context.can_publish,
    viewer_key: context.viewer_key,
    email_verified: context.email_verified ?? true,
    iat: now_seconds,
    exp: now_seconds + Math.min(ttl_seconds, SERVICE_JWT_MAX_TTL_SECONDS),
  }
}
