import { describe, expect, it } from 'vitest';
import { TokenRejected, verifyAccessToken } from '../src/verify-token';

describe('firebase id token', () => {
  it('rejects a missing token', async () => {
    await expect(
      verifyAccessToken(undefined, async () => ({ uid: 'uid-1' })),
    ).rejects.toBeInstanceOf(TokenRejected);
    await expect(
      verifyAccessToken('   ', async () => ({ uid: 'uid-1' })),
    ).rejects.toBeInstanceOf(TokenRejected);
  });

  it('rejects a token the verifier refuses', async () => {
    await expect(
      verifyAccessToken('not-a-token', async () => {
        throw new Error('invalid');
      }),
    ).rejects.toBeInstanceOf(TokenRejected);
  });

  it('reads the second-factor claim when it is present', async () => {
    await expect(
      verifyAccessToken('good-token', async () => ({
        uid: 'firebase-uid-1',
        firebase: { sign_in_second_factor: 'phone' },
      })),
    ).resolves.toEqual({
      firebase_uid: 'firebase-uid-1',
      second_factor: 'phone',
    });
  });

  it('returns no second factor for a public sign-in', async () => {
    await expect(
      verifyAccessToken('good-token', async () => ({
        uid: 'firebase-uid-1',
        firebase: { sign_in_provider: 'password' },
      })),
    ).resolves.toEqual({
      firebase_uid: 'firebase-uid-1',
      second_factor: null,
    });
  });
});
