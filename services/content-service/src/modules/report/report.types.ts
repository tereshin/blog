import type { ReportStatus } from '@blog/contracts'

export type ReportArticle = {
  id: string
  author_id: string
  visibility: 'public' | 'members' | 'author'
  status: 'draft' | 'published' | 'hidden' | 'deleted'
}

export type ReportRow = {
  id: string
  article_id: string
  reporter_id: string
  created_at: Date
  status: ReportStatus
}

export type ReportRepository = {
  findArticle: (article_id: string) => Promise<ReportArticle | null>
  createOpen: (input: { id: string; article_id: string; reporter_id: string }) => Promise<ReportRow>
}
