import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getPublicPage, pageKeys } from '@/entities/page'
import { useT } from '@/shared/i18n'
import { useShellStore } from '@/widgets/shell'

export function useSimplePage() {
  const { slug = '' } = useParams()
  const { t } = useT()
  const query = useQuery({
    queryKey: pageKeys.public(slug),
    queryFn: ({ signal }) => getPublicPage(slug, signal),
    staleTime: 0,
    retry: false,
  })
  const setHeader = useShellStore((state) => state.setHeaderCenter)
  const setTopic = useShellStore((state) => state.setArticleTopicId)
  useEffect(() => {
    setHeader({ kind: 'back', title: query.data?.title ?? t('pages.title') })
    setTopic(null)
  }, [query.data?.title, setHeader, setTopic, t])
  return query
}
