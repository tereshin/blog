import { describe, expect, it } from 'vitest';
import { MemoryProfileStore } from '../src/profile/memory-profile-store';
import { ProfileService } from '../src/profile/profile-service';

const firebase_uid = 'firebase-uid-1';
const other_uid = 'firebase-uid-2';

function service(): ProfileService {
  return new ProfileService(new MemoryProfileStore());
}

describe('user profile', () => {
  it('records a unique username and a guest can read it', async () => {
    const profiles = service();

    const saved = await profiles.saveProfile({
      firebase_uid,
      username: 'Ada',
    });

    expect(saved.id).not.toBe(firebase_uid);
    expect(saved.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(saved.username).toBe('Ada');

    const guest = await profiles.readPublic('Ada');
    expect(guest.username).toBe('Ada');
    expect(guest).not.toHaveProperty('display_name');
    expect(guest).not.toHaveProperty('biography');
    expect(guest).not.toHaveProperty('avatar_url');
  });

  it('blocks a username that differs only by case', async () => {
    const profiles = service();
    await profiles.saveProfile({ firebase_uid, username: 'Ada' });

    await expect(
      profiles.saveProfile({ firebase_uid: other_uid, username: 'ada' }),
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
  });

  it('omits a profile field that was not saved', async () => {
    const profiles = service();
    await profiles.saveProfile({
      firebase_uid,
      username: 'Ada',
      display_name: 'Ada Lovelace',
    });

    const guest = await profiles.readPublic('Ada');
    expect(guest.display_name).toBe('Ada Lovelace');
    expect(guest).not.toHaveProperty('biography');
    expect(guest).not.toHaveProperty('avatar_url');
  });

  it('stores a content-language limit and writes null when it is cleared', async () => {
    const profiles = service();
    await profiles.saveProfile({ firebase_uid, username: 'Ada' });

    const limited = await profiles.setContentLanguages(firebase_uid, ['en', 'ru']);
    expect(limited.content_languages).toEqual(['en', 'ru']);

    const cleared = await profiles.setContentLanguages(firebase_uid, null);
    expect(cleared.content_languages).toBeNull();

    const me = await profiles.readMe(firebase_uid);
    expect(me.content_languages).toBeNull();
  });

  it('records one sign-in row for the UTC day', async () => {
    const store = new MemoryProfileStore();
    const profiles = new ProfileService(store);
    profiles.now = () => new Date('2026-09-30T23:30:00.000Z');
    await profiles.saveProfile({ firebase_uid, username: 'Ada' });
    await profiles.saveProfile({
      firebase_uid,
      username: 'Ada',
      biography: 'Notes',
    });

    expect(store.signIns(firebase_uid)).toEqual(['2026-09-30']);
  });
});
