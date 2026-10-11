import { pageSeoSchema } from '@blog/contracts'
import type { PageSeo } from '@blog/contracts'
import { http } from '@/shared/api'

export function getPageSeo(path: string, signal?: AbortSignal): Promise<PageSeo> {
  return http.get('/v1/seo', pageSeoSchema, { query: { path }, signal })
}
