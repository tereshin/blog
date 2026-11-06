import type { MediaSettings } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button, FormTextField, ToggleField } from '@/shared/ui'

type StorageFieldsProps = {
  value: MediaSettings
  onChange: (value: MediaSettings) => void
  access_key: string
  secret_key: string
  onAccessKey: (value: string) => void
  onSecretKey: (value: string) => void
}

export function StorageFields({
  value,
  onChange,
  access_key,
  secret_key,
  onAccessKey,
  onSecretKey,
}: StorageFieldsProps) {
  const { t } = useT()
  const storage = value.storage
  const patch = (fields: Partial<MediaSettings['storage']>) =>
    onChange({ ...value, storage: { ...storage, ...fields } })
  const is_credentials_required = !value.use_custom_storage || !storage.has_credentials
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">{t('media.settings.storage')}</h2>
      <ToggleField
        label={t('media.settings.custom_storage')}
        is_selected={value.use_custom_storage}
        onChange={(use_custom_storage) =>
          onChange({
            ...value,
            use_custom_storage,
            storage: {
              ...storage,
              has_credentials: value.use_custom_storage && storage.has_credentials,
            },
          })
        }
      />
      <p className="text-sm text-muted">{t('media.settings.storage_hint')}</p>
      {value.use_custom_storage ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onPress={() =>
              patch({
                region: 'auto',
                force_path_style: true,
                endpoint: storage.endpoint.includes('.r2.cloudflarestorage.com')
                  ? storage.endpoint
                  : '',
              })
            }
          >
            {t('media.settings.r2_preset')}
          </Button>
          <FormTextField
            label="S3 Endpoint"
            type="url"
            required
            value={storage.endpoint}
            placeholder="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
            hint={t('media.settings.endpoint_hint')}
            onChange={(event) => patch({ endpoint: event.target.value.trim() })}
          />
          <FormTextField
            label={t('media.settings.region')}
            required
            value={storage.region}
            placeholder="auto"
            onChange={(event) => patch({ region: event.target.value.trim() })}
          />
          <FormTextField
            label="Bucket"
            required
            value={storage.bucket}
            onChange={(event) => patch({ bucket: event.target.value.trim() })}
          />
          <FormTextField
            label={t('media.settings.public_url')}
            type="url"
            required
            value={storage.public_url}
            placeholder="https://media.example.com"
            hint={t('media.settings.public_url_hint')}
            onChange={(event) => patch({ public_url: event.target.value.trim() })}
          />
          <FormTextField
            label="Access Key ID"
            type="password"
            autoComplete="off"
            required={is_credentials_required}
            value={access_key}
            placeholder={storage.has_credentials ? t('media.settings.key_saved') : ''}
            onChange={(event) => onAccessKey(event.target.value)}
          />
          <FormTextField
            label="Secret Access Key"
            type="password"
            autoComplete="new-password"
            required={is_credentials_required}
            value={secret_key}
            placeholder={storage.has_credentials ? t('media.settings.key_saved') : ''}
            hint={t('media.settings.secret_hint')}
            onChange={(event) => onSecretKey(event.target.value)}
          />
          <ToggleField
            label={t('media.settings.path_style')}
            is_selected={storage.force_path_style}
            onChange={(force_path_style) => patch({ force_path_style })}
          />
          <a
            href="https://developers.cloudflare.com/r2/get-started/s3/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline"
          >
            {t('media.settings.r2_docs')}
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">{t('media.settings.server_storage')}</p>
      )}
    </section>
  )
}
