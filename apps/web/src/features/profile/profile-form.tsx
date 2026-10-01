'use client';

import { translate, type Locale } from '@blog/i18n';
import { profile_catalog } from '@blog/i18n/features/profile';
import { Button, Toast, toast } from '@heroui/react';
import { useEffect, useState } from 'react';

export function ProfileForm({
  locale,
  username,
  display_name,
  biography,
  avatar_url,
  error_code,
  on_save,
}: {
  locale: Locale;
  status: string;
  username: string;
  display_name?: string;
  biography?: string;
  avatar_url?: string;
  error_code?: string;
  on_save: (profile: { username: string; display_name: string; biography: string; avatar_url: string }) => void;
}) {
  const [next_username, set_username] = useState(username);
  const [next_display_name, set_display_name] = useState(display_name ?? '');
  const [next_biography, set_biography] = useState(biography ?? '');
  const [next_avatar, set_avatar] = useState(avatar_url ?? '');
  const [required, set_required] = useState<string | null>(null);
  const taken = error_code === 'USERNAME_TAKEN' ? translate(locale, 'profile.username_taken', profile_catalog) : null;

  return (
    <>
      <Toast.Provider />
      <Notice message={taken ?? required} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label>
          {translate(locale, 'profile.username', profile_catalog)}
          <input
            aria-label={translate(locale, 'profile.username', profile_catalog)}
            value={next_username}
            onChange={(event) => set_username(event.target.value)}
          />
        </label>
        <label>
          {translate(locale, 'profile.display_name', profile_catalog)}
          <input
            aria-label={translate(locale, 'profile.display_name', profile_catalog)}
            value={next_display_name}
            onChange={(event) => set_display_name(event.target.value)}
          />
        </label>
        <label>
          {translate(locale, 'profile.biography', profile_catalog)}
          <textarea
            aria-label={translate(locale, 'profile.biography', profile_catalog)}
            value={next_biography}
            onChange={(event) => set_biography(event.target.value)}
          />
        </label>
        <label>
          {translate(locale, 'profile.avatar', profile_catalog)}
          <input
            aria-label={translate(locale, 'profile.avatar', profile_catalog)}
            value={next_avatar}
            onChange={(event) => set_avatar(event.target.value)}
          />
        </label>
        <Button
          variant="primary"
          onPress={() => {
            save();
          }}
        >
          {translate(locale, 'profile.save', profile_catalog)}
        </Button>
      </form>
    </>
  );

  function save() {
    if (next_username.trim() === '') {
      set_required(translate(locale, 'profile.username_required', profile_catalog));
      return;
    }
    on_save({
      username: next_username,
      display_name: next_display_name,
      biography: next_biography,
      avatar_url: next_avatar,
    });
  }
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
