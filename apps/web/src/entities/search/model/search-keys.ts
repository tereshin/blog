export const searchKeys = {
  all: ['search'] as const,
  query: (q: string) => [...searchKeys.all, q] as const,
  pages: (q: string) => [...searchKeys.all, 'pages', q] as const,
}
