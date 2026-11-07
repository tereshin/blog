import { useT } from '@/shared/i18n'
import { ArrowLeftIcon, Button, Dialog } from '@/shared/ui'
import { useLoginDialogView } from '../model/useLoginDialogView.ts'
import { AuthForm } from './AuthForm.tsx'
import { AuthStepTransition } from './AuthStepTransition.tsx'
import './auth-dialog.css'

export function LoginDialog() {
  const { t } = useT()
  const view = useLoginDialogView()
  const is_initial = view.panel.phase === 'email'
  return (
    <Dialog is_open={view.is_open} onOpenChange={view.handleOpenChange} size="sm" className="auth-dialog" aria-label={t(view.title_key)}>
      <Dialog.CloseTrigger className="auth-close" aria-label={t('common.close')} />
      {view.panel.phase !== 'email' && !view.is_unverified ? (
        <Button className="auth-back" variant="secondary" isIconOnly aria-label={t('common.back')}
          onPress={view.panel.handleBack}><ArrowLeftIcon /></Button>
      ) : null}
      <AuthStepTransition step={view.panel.phase} direction={view.panel.direction}>
        <Dialog.Header className="auth-header" data-initial={is_initial}>
          {is_initial ? <div className="auth-brand" aria-hidden="true">
            {view.logo_url ? <img src={view.logo_url} alt="" className="h-14 max-w-40 object-contain" />
              : <span className="text-3xl font-semibold text-accent">{view.brand.slice(0, 2)}</span>}
          </div> : null}
          <Dialog.Heading className="text-center text-2xl font-semibold">{t(view.title_key)}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body className="auth-body">
          {view.description_key ? <p className={view.is_failure ? 'text-center text-danger' : 'text-center text-muted'}>{t(view.description_key)}</p> : null}
          {view.has_config_error ? <Button variant="secondary" onPress={view.retryConfig}>{t('login.retry')}</Button> : null}
          {view.is_pending ? <div className="flex flex-col gap-4"><p>{t('login.pending')}</p>
            <Button variant="primary" onPress={view.handleContinue}>{t('login.submit')}</Button></div> : null}
          {view.is_form_shown ? <AuthForm panel={view.panel} is_unverified={view.is_unverified} /> : null}
        </Dialog.Body>
      </AuthStepTransition>
    </Dialog>
  )
}
