import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearch } from '@/entities/search'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { Avatar, Button, Dialog } from '@/shared/ui'

type PeerPickerProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
}

/** Поиск человека и переход к пустому диалогу с ним. */
export function PeerPicker({ is_open, onOpenChange }: PeerPickerProps) {
  const { t } = useT()
  const navigate = useNavigate()
  const { viewer } = useViewer()
  const [query, setQuery] = useState('')
  const search = useSearch(query)
  const my_id = viewer.status === 'member' ? viewer.user.id : null
  const people = (search.data?.people ?? []).filter((person) => person.user_id !== my_id)

  return (
    <Dialog is_open={is_open} onOpenChange={onOpenChange} aria-label={t('messages.new')}>
      <Dialog.Header>
        <Dialog.Heading>{t('messages.new')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-muted">{t('messages.search_people')}</span>
          <input
            value={query}
            aria-label={t('messages.search_people')}
            className="rounded-lg border border-separator bg-background px-3 py-2 text-foreground"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <ul className="mt-3 flex flex-col gap-1">
          {search.deferred.length >= 2 && people.length === 0 && !search.isFetching ? (
            <li className="px-2 py-3 text-sm text-muted">{t('messages.no_people')}</li>
          ) : null}
          {people.map((person) => (
            <li key={person.user_id}>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onPress={() => {
                  onOpenChange(false)
                  void navigate(`/messages/new?to=${encodeURIComponent(person.user_id)}`, {
                    state: {
                      peer: {
                        user_id: person.user_id,
                        display_name: person.display_name,
                        avatar_url: person.avatar_url,
                        slug: person.slug,
                      },
                    },
                  })
                }}
              >
                <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
                {person.display_name}
              </Button>
            </li>
          ))}
        </ul>
      </Dialog.Body>
    </Dialog>
  )
}
