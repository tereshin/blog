export class TokenRejected extends Error {
  constructor() {
    super('TOKEN_REJECTED');
    this.name = 'TokenRejected';
  }
}

export type DecodedIdToken = {
  uid: string;
  firebase?: {
    sign_in_provider?: string;
    sign_in_second_factor?: string;
  };
};

export type TokenVerifier = (token: string) => Promise<DecodedIdToken>;

export type VerifiedAccess = {
  firebase_uid: string;
  second_factor: string | null;
};

export async function verifyAccessToken(
  token: string | undefined,
  verify: TokenVerifier,
): Promise<VerifiedAccess> {
  if (token === undefined || token.trim() === '') {
    throw new TokenRejected();
  }

  let decoded: DecodedIdToken;

  try {
    decoded = await verify(token);
  } catch {
    throw new TokenRejected();
  }

  if (decoded.uid.trim() === '') {
    throw new TokenRejected();
  }

  const second_factor = decoded.firebase?.sign_in_second_factor;

  return {
    firebase_uid: decoded.uid,
    second_factor:
      second_factor !== undefined && second_factor.trim() !== ''
        ? second_factor
        : null,
  };
}
