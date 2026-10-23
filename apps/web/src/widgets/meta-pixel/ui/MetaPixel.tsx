import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useSettings } from '@/entities/settings'
import { trackMetaPageView } from '../model/meta-pixel.ts'

export function MetaPixel() {
  const { data: settings } = useSettings()
  const { key } = useLocation()
  const pixel_id = settings?.meta_pixel_id
  useEffect(() => {
    trackMetaPageView(pixel_id, key)
  }, [pixel_id, key])
  return null
}
