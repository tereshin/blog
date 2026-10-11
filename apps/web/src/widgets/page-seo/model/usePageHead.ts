import { useLayoutEffect } from 'react'
import { usePageSeo } from '@/entities/seo'
import { useSettings } from '@/entities/settings'
import { applyPageHead, clearPageHead } from './page-head.ts'

export function usePageHead(path: string) {
  const seo = usePageSeo(path)
  const settings = useSettings()
  const site_name = settings.data?.name ?? 'Блог'
  useLayoutEffect(() => {
    if (seo.data) applyPageHead(seo.data)
    else clearPageHead(site_name)
    return () => clearPageHead(site_name)
  }, [path, seo.data, site_name])
}
