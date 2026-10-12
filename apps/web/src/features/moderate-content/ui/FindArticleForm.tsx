import { createModerationReturnState } from '@/entities/admin'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useT } from '@/shared/i18n'
import { Button, FormTextField } from '@/shared/ui'

export function FindArticleForm() {
  const { t } = useT()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [slug, setSlug] = useState('')
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        if (slug.trim())
          navigate(`/p/${encodeURIComponent(slug.trim())}?from=moderation`, {
            state: createModerationReturnState(pathname),
          })
      }}
    >
      <FormTextField
        label={t('admin.moderation.find_placeholder')}
        required
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
        placeholder={t('admin.moderation.find_placeholder')}
      />
      <Button type="submit" variant="primary" className="self-start" isDisabled={!slug.trim()}>
        {t('admin.moderation.open')}
      </Button>
    </form>
  )
}
