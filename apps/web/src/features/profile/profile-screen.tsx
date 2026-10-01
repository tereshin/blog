'use client';

import { translate, type Locale } from '@blog/i18n';
import { profile_catalog } from '@blog/i18n/features/profile';
import { Button } from '@heroui/react';
import Image from 'next/image';
import { EmptyState } from '../../shared/empty-state';

export type PublicProfile = {
  username: string;
  display_name?: string;
  biography?: string;
  avatar_url?: string;
  following?: boolean;
  is_owner?: boolean;
};

export function ProfileScreen({
  locale,
  status,
  profile,
  on_follow,
  on_unfollow,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'not-found' | 'following' | 'not-following' | 'account-blocked';
  profile: PublicProfile | null;
  on_follow?: () => void;
  on_unfollow?: () => void;
}) {
  if (status === 'not-found' || !profile) {
    return (
      <main>
        <EmptyState title={translate(locale, 'profile.not_found', profile_catalog)} />
      </main>
    );
  }

  const following = profile.following || status === 'following';

  return (
    <main>
      {profile.avatar_url ? (
        <Image src={profile.avatar_url} alt={profile.username} width={64} height={64} unoptimized />
      ) : null}
      <h1>{profile.username}</h1>
      {profile.display_name ? <p>{profile.display_name}</p> : null}
      {profile.biography ? <p>{profile.biography}</p> : null}
      {profile.is_owner ? <a href="/me">{translate(locale, 'profile.edit', profile_catalog)}</a> : null}
      {profile.is_owner ? null : (
        <Button variant="primary" onPress={following ? on_unfollow : on_follow}>
          {translate(locale, following ? 'profile.unfollow' : 'profile.follow', profile_catalog)}
        </Button>
      )}
    </main>
  );
}
