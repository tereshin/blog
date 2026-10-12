import { Spinner } from '@heroui/react/spinner'
import { useT } from '@/shared/i18n'
import {
  Input,
  Avatar,
  BaseIcon,
  Button,
  CloseButton,
  Dialog,
  EmptyState,
  ErrorState,
  SearchIcon,
} from '@/shared/ui'
import { usePeerPicker } from '../model/usePeerPicker.ts'

type PeerPickerProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
}

/** Поиск человека и переход к пустому диалогу с ним. */
export function PeerPicker({ is_open, onOpenChange }: PeerPickerProps) {
  const { t } = useT()
  const { query, setQuery, input_ref, can_search, search, people, handleSelect, handleClear } =
    usePeerPicker(onOpenChange)

  return (
    <Dialog
      is_open={is_open}
      onOpenChange={onOpenChange}
      size="sm"
      aria-label={t('messages.new')}
      className="peer-picker gap-0 overflow-hidden p-0"
    >
      <Dialog.Header className="relative gap-1 px-5 pt-5 pb-4 pr-14">
        <Dialog.Heading>{t('messages.new')}</Dialog.Heading>
        <p className="text-sm text-muted">{t('messages.new_hint')}</p>
        <CloseButton
          aria-label={t('common.close')}
          className="absolute top-4 right-4"
          onPress={() => onOpenChange(false)}
        />
      </Dialog.Header>
      <Dialog.Body className="gap-0 px-5 pt-0 pb-5">
        <Input
          size="base"
          variant="secondary"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          ref={input_ref}
          autoFocus
          maxLength={100}
          autoComplete="off"
          aria-label={t('messages.search_people')}
          placeholder={t('messages.search_placeholder')}
          prefix={<SearchIcon className="shrink-0 text-muted" />}
          suffix={
            query ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t('header.search_clear_query')}
                onPress={handleClear}
              >
                <BaseIcon name="close" size={16} />
              </Button>
            ) : null
          }
        />
        <div
          className="mt-3 max-h-[min(360px,45dvh)] min-h-40 overflow-y-auto overscroll-contain"
          aria-busy={search.is_searching}
        >
          {!can_search ? (
            <p className="px-3 py-8 text-center text-sm text-muted">{t('messages.search_hint')}</p>
          ) : search.is_searching ? (
            <div
              role="status"
              aria-label={t('common.loading')}
              className="flex justify-center py-12"
            >
              <Spinner size="md" />
            </div>
          ) : search.isError ? (
            <ErrorState
              title={t('search.error')}
              onRetry={() => void search.refetch()}
              className="py-6"
            />
          ) : people.length === 0 ? (
            <EmptyState
              title={t('messages.no_people')}
              description={t('messages.no_people_hint')}
              icon={<SearchIcon />}
              className="bg-transparent py-6 shadow-none"
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {people.map((person) => (
                <li key={person.user_id}>
                  <Button
                    variant="ghost"
                    aria-label={person.display_name}
                    className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-left"
                    onPress={() => handleSelect(person)}
                  >
                    <Avatar
                      src={person.avatar_url}
                      name={person.display_name}
                      size="md"
                      className="shrink-0"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium">{person.display_name}</span>
                      <span className="truncate text-xs font-normal text-muted">
                        @{person.slug}
                      </span>
                    </span>
                    <BaseIcon name="right" size={16} className="shrink-0 text-muted" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog.Body>
    </Dialog>
  )
}
