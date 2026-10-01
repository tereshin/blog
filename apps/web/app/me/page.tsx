'use client';

import { useState } from 'react';
import { ProfileForm } from '../../src/features/profile/profile-form';

export default function MePage() {
  const [error_code, set_error_code] = useState<string | undefined>();

  return (
    <ProfileForm
      locale="en"
      status={error_code === 'USERNAME_TAKEN' ? 'username-taken' : 'default'}
      username=""
      error_code={error_code}
      on_save={(profile) => {
        set_error_code(profile.username.toLowerCase() === 'ada' ? 'USERNAME_TAKEN' : undefined);
      }}
    />
  );
}
