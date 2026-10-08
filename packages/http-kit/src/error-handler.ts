import fp from 'fastify-plugin'
import type { FastifyError, FastifyPluginAsync } from 'fastify'
import { ZodError } from 'zod'
import { AppError, PROBLEM_CONTENT_TYPE, ValidationError, toProblem } from '@blog/errors'

function zodDetails(error: ZodError): Record<string, unknown> {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    ;(fields[key] ??= []).push(issue.message)
  }
  return { fields }
}

function clientStatus(error: unknown): number | null {
  if (!(error instanceof Error) || error instanceof AppError) return null
  const status = (error as FastifyError).statusCode
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null
}

/** Один обработчик: `AppError`, zod и ошибки Fastify → `application/problem+json`. */
const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    let normalized: unknown = error
    if (error instanceof ZodError) {
      normalized = new ValidationError({ cause: error, details: zodDetails(error) })
    } else {
      const status = clientStatus(error)
      if (status !== null) {
        normalized = new AppError({
          code: (error as FastifyError).code === 'FST_ERR_VALIDATION' ? 'validation_failed' : 'bad_request',
          http_status: status,
          message: status === 413 ? 'Слишком большой запрос' : 'Некорректный запрос',
          cause: error,
        })
      }
    }

    const problem = toProblem(normalized, { request_id: request.request_id })
    if (problem.status >= 500) {
      request.log_ctx.error({ err: error }, 'необработанная ошибка запроса')
    }
    return reply.code(problem.status).type(PROBLEM_CONTENT_TYPE).send(problem)
  })

  app.setNotFoundHandler((request, reply) => {
    const problem = toProblem(new AppError({ code: 'not_found', http_status: 404, message: 'Не найдено' }), {
      request_id: request.request_id,
    })
    return reply.code(404).type(PROBLEM_CONTENT_TYPE).send(problem)
  })
}

export const errorHandler = fp(errorHandlerPlugin, { name: 'blog-error-handler' })
