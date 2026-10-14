import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { providerLabel } from '../model/useAuthPanel.ts'
import type { AuthPanel } from '../model/useLoginDialogView.ts'

type AuthProvidersProps = { panel: AuthPanel }

/** Вход через внешних провайдеров и тестовых участников эмулятора. */
export function AuthProviders({ panel }: AuthProvidersProps) {
  const { t } = useT()
  return (
    <div className="mt-8 flex flex-col gap-3">
      {panel.oauth_providers.length > 0 ? (
        <p className="text-center text-sm text-muted">{t('login.sso')}</p>
      ) : null}
      {panel.oauth_providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          className="h-12 w-full text-base"
          variant="secondary"
          isDisabled={panel.is_submitting}
          onPress={() => void panel.handleSubmitProvider(provider.id)}
        >
          {t('login.provider', { name: providerLabel(provider.id) })}
        </Button>
      ))}
      {panel.test_participants.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t('login.test_participants')}</p>
          {panel.test_participants.map((participant) => (
            <Button
              key={participant.email}
              type="button"
              variant="ghost"
              onPress={() => void panel.handleSubmitTestParticipant(participant.email)}
            >
              {participant.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
