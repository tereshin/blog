'use client';

import { translate, type Locale } from '@blog/i18n';
import { profile_catalog } from '@blog/i18n/features/profile';
import { Button, Toast, toast } from '@heroui/react';
import { useEffect } from 'react';

export function signInPath(code: string | undefined): string | null {
  return code === 'AUTH_REQUIRED' ? '/sign-in' : null;
}

export function SignInScreen({
  locale,
  status,
  error_code,
  on_sign_in,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'error';
  error_code?: string;
  on_sign_in: () => void;
}) {
  const message =
    status === 'error' && error_code === 'AUTH_REQUIRED'
      ? translate(locale, 'profile.sign_in.rejected', profile_catalog)
      : null;

  return (
    <>
      <Toast.Provider />
      <Notice message={message} />
      <main>
        <Button variant="primary" onPress={on_sign_in}>
          {translate(locale, 'profile.sign_in', profile_catalog)}
        </Button>
      </main>
    </>
  );
}

function Notice({ message }: { message: string | null }) {
  useEffect(() => {
    if (!message) {
      return;
    }
    toast.danger(message);
  }, [message]);

  return null;
}
