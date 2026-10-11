import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useT } from '@/shared/i18n'
import { Button, Input } from '@/shared/ui'

export function FindArticleForm() {
  const { t } = useT()
  const navigate = useNavigate()
  const [slug, setSlug] = useState('')
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (slug.trim()) navigate(`/p/${encodeURIComponent(slug.trim())}?from=moderation`)
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.moderation.find_placeholder')}
        <Input
          required
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder={t('admin.moderation.find_placeholder')}
        />
      </label>
      <Button type="submit" variant="primary" className="self-start" isDisabled={!slug.trim()}>
        {t('admin.moderation.open')}
      </Button>
    </form>
  )
}
