import { reportSchema } from '@blog/contracts'
import type { Report } from '@blog/contracts'
import { http } from '@/shared/api'

export function reportArticle(article_id: string): Promise<Report> {
  return http.post(`/v1/articles/${article_id}/reports`, reportSchema)
}
