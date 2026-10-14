import { cva } from 'class-variance-authority'
import { useT } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'
import { useLoginDialogView } from '../model/useLoginDialogView.ts'
import { AuthForm } from './AuthForm.tsx'

const description_class = cva(undefined, {
  variants: { is_failure: { true: 'text-danger', false: 'text-muted' } },
})

/** Диалог входа поверх текущего раздела; монтируется один раз в `AppProviders`. */
export function LoginDialog() {
  const { t } = useT()
  const view = useLoginDialogView()

  return (
    <Dialog is_open={view.is_open} onOpenChange={view.handleOpenChange} size="sm" className="auth-dialog">
      <Dialog.CloseTrigger aria-label={t('common.close')} />
      <Dialog.Header className="items-center gap-6 pt-10 text-center">
        <div className="flex min-w-20 items-center justify-center rounded-3xl" aria-hidden="true">
          {view.logo_url ? (
            <img loading="lazy" src={view.logo_url} alt="" className="h-14 max-w-40 object-contain" />
          ) : (
            <span className="text-3xl font-semibold text-accent">{view.brand.slice(0, 2)}</span>
          )}
        </div>
        <Dialog.Heading className="text-2xl font-semibold">{t(view.title_key)}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body className="-mx-2 px-2 pb-8 pt-8">
        <div className="flex flex-col gap-3">
          {view.description_key ? (
            <p className={description_class({ is_failure: view.is_failure })}>{t(view.description_key)}</p>
          ) : null}
          {view.is_unverified ? <p className="text-sm text-muted">{t('login.email_unverified')}</p> : null}
          {view.notice_key ? <p className="text-sm text-danger">{t(view.notice_key)}</p> : null}
          {view.has_config_error ? (
            <Button variant="secondary" onPress={view.retryConfig}>
              {t('login.retry')}
            </Button>
          ) : null}
          {view.is_pending ? <p>{t('login.pending')}</p> : null}
          {view.is_form_shown ? <AuthForm panel={view.panel} is_unverified={view.is_unverified} /> : null}
        </div>
      </Dialog.Body>
      <Dialog.Footer className="justify-center">
        {view.is_pending ? (
          <Button variant="primary" onPress={view.handleContinue}>
            {t('login.submit')}
          </Button>
        ) : null}
      </Dialog.Footer>
    </Dialog>
  )
}
