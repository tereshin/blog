import { ProfileScreen } from '../../../src/features/profile/profile-screen';
import { ProfilePreview } from '../../../src/features/profile/profile-preview';

const ada = {
  username: 'ada',
  display_name: 'Ada Lovelace',
  biography: 'Writes essays',
  avatar_url: 'https://media.local/ada',
};

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  if (username === 'missing') {
    return <ProfileScreen locale="en" status="not-found" profile={null} />;
  }

  if (username === 'ada-plain') {
    return <ProfilePreview profile={{ username: 'ada' }} />;
  }

  return <ProfilePreview profile={username === 'ada' ? ada : { username }} />;
}
