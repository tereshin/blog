import { useLayoutEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePageSeo, seoKeys } from '@/entities/seo'
import { useSettings } from '@/entities/settings'
import { useLiveSignals } from '@/shared/api'
import { applyPageHead, clearPageHead } from './page-head.ts'

export function usePageHead(path: string) {
  const seo = usePageSeo(path)
  const query_client = useQueryClient()
  const refresh = () => { void query_client.invalidateQueries({ queryKey: seoKeys.page(path) }) }
  useLiveSignals({ subscribe: {}, on: { article: () => { if (path.startsWith('/p/')) refresh() }, settings: refresh }, onReconnected: refresh })
  const settings = useSettings()
  const site_name = settings.data?.name ?? 'Блог'
  useLayoutEffect(() => {
    if (seo.data) applyPageHead(seo.data)
    else clearPageHead(site_name)
    return () => clearPageHead(site_name)
  }, [path, seo.data, site_name])
}
