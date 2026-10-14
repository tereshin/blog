export type VerifiedEmailGate = { allowed: true } | { allowed: false; code: 'email_unverified' }
