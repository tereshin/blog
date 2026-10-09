export type MockReport = {
  id: string
  article_id: string
  reporter_id: string
  created_at: string
  status: 'open' | 'reviewed'
}

/** Скрытые модератором статьи мок-ленты. Живут, пока открыта вкладка. */
export const hiddenArticleIds = new Set<string>()

export const mockReports: MockReport[] = [
  {
    id: '00000000-0000-4000-8000-000000000901',
    article_id: '9b2e3f40-2222-4b22-8b22-000000000001',
    reporter_id: '0b3a4c50-3333-4c33-8c33-000000000005',
    created_at: '2026-10-08T12:00:00.000Z',
    status: 'open',
  },
]
