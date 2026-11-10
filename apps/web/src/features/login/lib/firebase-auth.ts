import type { Auth, AuthProvider } from 'firebase/auth'
import type { AuthConfig } from '@blog/contracts'
import { signInWithIdToken } from '../api/auth-api.ts'

type FirebaseSdk = typeof import('firebase/auth')
type PreparedClient = { auth: Auth; sdk: FirebaseSdk }
let prepared_client: PreparedClient | null = null
let preparation: Promise<void> | null = null

/** Prepare before a click: popup opening must stay inside the browser's user activation. */
export function prepareFirebaseAuth(config: AuthConfig): Promise<void> {
  if (preparation) return preparation
  preparation = (async () => {
    const [apps, sdk] = await Promise.all([import('firebase/app'), import('firebase/auth')])
    const app =
      apps.getApps()[0] ??
      apps.initializeApp({
        apiKey: config.api_key,
        authDomain: config.auth_domain,
        projectId: config.project_id,
      })
    const auth = sdk.initializeAuth(app, {
      persistence: sdk.inMemoryPersistence,
      popupRedirectResolver: sdk.browserPopupRedirectResolver,
    })
    if (config.emulator_host) {
      const host = config.emulator_host
      sdk.connectAuthEmulator(auth, host.includes('://') ? host : `http://${host}`, {
        disableWarnings: true,
      })
    }
    prepared_client = { auth, sdk }
  })().catch((error) => {
    preparation = null
    throw error
  })
  return preparation
}

function providerFor(provider_id: string, sdk: FirebaseSdk): AuthProvider {
  if (provider_id === 'google.com') return new sdk.GoogleAuthProvider()
  if (provider_id === 'github.com') return new sdk.GithubAuthProvider()
  return new sdk.OAuthProvider(provider_id)
}

/** Firebase credentials live only in memory and are cleared after the cookie exchange. */
export async function signInWithProvider(provider_id: string): Promise<void> {
  if (!prepared_client) throw new Error('Firebase Auth is not ready')
  const { auth, sdk } = prepared_client
  const provider = providerFor(provider_id, sdk)
  try {
    // No import or network await before opening the provider window.
    const result = await sdk.signInWithPopup(auth, provider)
    const id_token = await sdk.getIdToken(result.user)
    await signInWithIdToken(id_token)
  } finally {
    await sdk.signOut(auth)
  }
}
