import { AppError } from './app-error.ts'

export const PROBLEM_CONTENT_TYPE = 'application/problem+json'

export type Problem = {
  type: string
  title: string
  status: number
  code: string
  detail?: string
  request_id?: string
  errors?: Record<string, unknown>
}

export type ProblemContext = { request_id?: string }

/** Приводит любую ошибку к problem+json. Неоперационные ошибки не раскрывают причину. */
export function toProblem(error: unknown, context: ProblemContext = {}): Problem {
  const request_id = context.request_id
  if (error instanceof AppError && error.is_operational) {
    return {
      type: `urn:blog:error:${error.code}`,
      title: error.message,
      status: error.http_status,
      code: error.code,
      ...(error.details ? { errors: error.details } : {}),
      ...(request_id ? { request_id } : {}),
    }
  }
  return {
    type: 'urn:blog:error:internal',
    title: 'Внутренняя ошибка',
    status: 500,
    code: 'internal',
    ...(request_id ? { request_id } : {}),
  }
}
