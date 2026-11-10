import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: {},
  app: {},
  user: {},
  initializeAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  signInWithPopup: vi.fn(),
  getIdToken: vi.fn(),
  signOut: vi.fn(),
  exchange: vi.fn(),
}))
vi.mock('firebase/app', () => ({ getApps: () => [mocks.app], initializeApp: vi.fn() }))
vi.mock('firebase/auth', () => ({
  initializeAuth: mocks.initializeAuth,
  inMemoryPersistence: 'memory',
  browserPopupRedirectResolver: 'popup-resolver',
  connectAuthEmulator: mocks.connectAuthEmulator,
  signInWithPopup: mocks.signInWithPopup,
  getIdToken: mocks.getIdToken,
  signOut: mocks.signOut,
  GoogleAuthProvider: vi.fn(function () {}),
  GithubAuthProvider: vi.fn(function () {}),
  OAuthProvider: vi.fn(function () {}),
}))
vi.mock('../api/auth-api.ts', () => ({ signInWithIdToken: mocks.exchange }))
const config = {
  api_key: 'public',
  auth_domain: 'demo.firebaseapp.com',
  project_id: 'demo',
  providers: [{ id: 'google.com' }],
  emulator_host: null,
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.initializeAuth.mockReturnValue(mocks.auth)
  mocks.signInWithPopup.mockResolvedValue({ user: mocks.user })
  mocks.getIdToken.mockResolvedValue('temporary-token')
  mocks.signOut.mockResolvedValue(undefined)
  mocks.exchange.mockResolvedValue(undefined)
})

describe('Firebase popup sign-in', () => {
  it('prepares once with an explicit resolver and memory-only persistence', async () => {
    const { prepareFirebaseAuth } = await import('./firebase-auth.ts')
    await Promise.all([prepareFirebaseAuth(config), prepareFirebaseAuth(config)])
    expect(mocks.initializeAuth).toHaveBeenCalledExactlyOnceWith(mocks.app, {
      persistence: 'memory',
      popupRedirectResolver: 'popup-resolver',
    })
  })

  it('opens the popup synchronously inside the click, exchanges the token and signs out', async () => {
    const { prepareFirebaseAuth, signInWithProvider } = await import('./firebase-auth.ts')
    await prepareFirebaseAuth(config)
    const request = signInWithProvider('google.com')
    expect(mocks.signInWithPopup).toHaveBeenCalledOnce()
    await request
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith('temporary-token')
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith(mocks.auth)
  })

  it('clears Firebase credentials when the session exchange fails', async () => {
    const { prepareFirebaseAuth, signInWithProvider } = await import('./firebase-auth.ts')
    await prepareFirebaseAuth(config)
    mocks.exchange.mockRejectedValueOnce(new Error('Exchange rejected'))
    await expect(signInWithProvider('github.com')).rejects.toThrow('Exchange rejected')
    expect(mocks.signOut).toHaveBeenCalledOnce()
  })

  it('uses the emulator only when it was provided by the server', async () => {
    const { prepareFirebaseAuth } = await import('./firebase-auth.ts')
    await prepareFirebaseAuth({ ...config, emulator_host: 'localhost:9099' })
    expect(mocks.connectAuthEmulator).toHaveBeenCalledExactlyOnceWith(
      mocks.auth,
      'http://localhost:9099',
      { disableWarnings: true },
    )
  })
})
