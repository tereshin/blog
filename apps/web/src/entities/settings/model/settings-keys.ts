export const settingsKeys = {
  all: ['settings'] as const,
  public: () => [...settingsKeys.all, 'public'] as const,
  admin: () => [...settingsKeys.all, 'admin'] as const,
}
