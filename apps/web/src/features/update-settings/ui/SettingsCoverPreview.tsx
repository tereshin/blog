import { FormTextField } from '@/shared/ui'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { SOCIAL_COVER_SIZES } from '@blog/contracts'
import type { SocialCoverSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useCoverPreview } from '../model/useCoverPreview.ts'

export function SettingsCoverPreview({
  settings,
  site_name,
  site_logo,
  upload,
  can_edit_media,
}: {
  settings: SocialCoverSettings
  site_name: string
  site_logo: string | null
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  can_edit_media: boolean
}) {
  const { t } = useT()
  const [title, setTitle] = useState(() => t('seo.sample_title'))
  const [author, setAuthor] = useState(() => t('seo.sample_author'))
  const [image_url, setImageUrl] = useState<string | null>(null)
  const preview = useCoverPreview({
    title: title.trim() || site_name || 'Блог',
    author_name: author || null,
    site_name: site_name.trim() || 'Блог',
    image_url,
    settings: { ...settings, logo_url: settings.logo_url ?? site_logo },
  })
  return (
    <fieldset className="flex min-w-0 flex-col gap-8 border-t border-separator pt-6">
      <legend className="text-lg font-semibold">{t('seo.preview')}</legend>
      <FormTextField
        label={t('seo.sample_heading')}
        maxLength={150}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <FormTextField
        label={t('seo.sample_byline')}
        maxLength={50}
        value={author}
        onChange={(event) => setAuthor(event.target.value)}
      />
      {can_edit_media && settings.background_mode === 'image'
        ? upload({ label: t('seo.sample_image'), onUploaded: setImageUrl })
        : null}
      {image_url ? (
        <Button type="button" variant="ghost" onPress={() => setImageUrl(null)}>
          {t('seo.clear_sample')}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        isDisabled={preview.is_pending || !can_edit_media}
        onPress={preview.generate}
      >
        {t(preview.is_pending ? 'seo.generating' : 'seo.generate_preview')}
      </Button>
      {preview.is_error ? (
        <p role="alert" className="text-sm text-danger">
          {t('seo.preview_error')}
        </p>
      ) : null}
      {preview.images?.map(({ variant, url }) => (
        <figure key={variant} className="flex flex-col gap-1">
          <figcaption className="text-xs text-muted">
            {variant === 'og' ? 'Open Graph' : variant === 'twitter' ? 'Twitter / X' : 'VK'} ·{' '}
            {SOCIAL_COVER_SIZES[variant].width} × {SOCIAL_COVER_SIZES[variant].height}
          </figcaption>
          <img loading="lazy"
            src={url}
            alt={title}
            width={SOCIAL_COVER_SIZES[variant].width}
            height={SOCIAL_COVER_SIZES[variant].height}
            className="w-full rounded-lg"
          />
        </figure>
      ))}
    </fieldset>
  )
}
