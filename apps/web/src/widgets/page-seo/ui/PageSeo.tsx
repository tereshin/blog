import { useEffect } from 'react'
import { useSettings } from '@/entities/settings'
import { applySiteAssetsHead } from '../model/site-assets-head.ts'
import { usePageHead } from '../model/usePageHead.ts'

export function PageSeo({ path }: { path: string }) {
  usePageHead(path)
  const { data: settings } = useSettings()
  useEffect(() => {
    if (settings) applySiteAssetsHead(settings.favicon)
  }, [settings])
  return null
}
