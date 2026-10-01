'use client';

import { SignInScreen } from '../../src/features/profile/sign-in-screen';

export default function SignInPage() {
  return <SignInScreen locale="en" status="default" on_sign_in={() => undefined} />;
}
