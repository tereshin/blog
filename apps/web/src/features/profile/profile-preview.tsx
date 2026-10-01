'use client';

import { useState } from 'react';
import { ProfileScreen, type PublicProfile } from './profile-screen';

export function ProfilePreview({ profile }: { profile: PublicProfile }) {
  const [following, set_following] = useState(profile.following ?? false);

  return (
    <ProfileScreen
      locale="en"
      status={following ? 'following' : 'default'}
      profile={{ ...profile, following }}
      on_follow={() => set_following(true)}
      on_unfollow={() => set_following(false)}
    />
  );
}
