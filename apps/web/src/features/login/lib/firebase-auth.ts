import type { Auth, AuthProvider } from 'firebase/auth'
import { signInWithIdToken } from '../api/auth-api.ts'
import { getAuthConfig } from '../api/auth-api.ts'

let auth_instance: Auth | null = null
let emulator_connected = false

function emulatorUrl(host: string): string {
  return host.includes('://') ? host : `http://${host}`
}

/** SDK Firebase грузится только при входе через поставщика и не попадает в начальный бандл. */
async function authClient(): Promise<Auth> {
  if (auth_instance) return auth_instance
  const config = await getAuthConfig()
  const { initializeApp, getApps } = await import('firebase/app')
  const { initializeAuth, inMemoryPersistence, connectAuthEmulator } = await import('firebase/auth')
  const app = getApps()[0] ?? initializeApp({ apiKey: config.api_key, authDomain: config.auth_domain, projectId: config.project_id })
  let auth: Auth
  try {
    auth = initializeAuth(app, { persistence: inMemoryPersistence })
  } catch {
    const { getAuth } = await import('firebase/auth')
    auth = getAuth(app)
  }
  if (config.emulator_host && !emulator_connected) {
    connectAuthEmulator(auth, emulatorUrl(config.emulator_host), { disableWarnings: true })
    emulator_connected = true
  }
  auth_instance = auth
  return auth
}

async function providerFor(provider_id: string): Promise<AuthProvider> {
  const { GoogleAuthProvider, GithubAuthProvider, OAuthProvider } = await import('firebase/auth')
  if (provider_id === 'google.com') return new GoogleAuthProvider()
  if (provider_id === 'github.com') return new GithubAuthProvider()
  return new OAuthProvider(provider_id)
}

export function isPopupCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = String(error.code)
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/popup-blocked'
}

/**
 * Окно поставщика, обмен ID-токена на cookie площадки и немедленный signOut.
 * Токен не пишется в storage: persistence только в памяти процесса.
 */
export async function signInWithProvider(provider_id: string): Promise<void> {
  const { getIdToken, signInWithPopup, signOut } = await import('firebase/auth')
  const auth = await authClient()
  const provider = await providerFor(provider_id)
  try {
    const result = await signInWithPopup(auth, provider)
    const id_token = await getIdToken(result.user)
    await signInWithIdToken(id_token)
  } finally {
    await signOut(auth).catch(() => undefined)
  }
}
