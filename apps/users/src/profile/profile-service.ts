import { ProfileError } from './profile-error';
import type { ProfileStore, StoredUser } from './profile-store';
import { uuidV7 } from './uuid-v7';

const content_language_codes = ['en', 'sr-Latn', 'ru'] as const;

export type MeProfile = {
  id?: string;
  username?: string;
  blocked: boolean;
  content_languages: string[] | null;
  display_name?: string;
  biography?: string;
  avatar_url?: string;
};

export type PublicProfile = {
  username: string;
  display_name?: string;
  biography?: string;
  avatar_url?: string;
};

export type ProfileSave = {
  firebase_uid: string;
  username: string;
  display_name?: string;
  biography?: string;
  avatar_url?: string;
};

function withSavedFields(
  profile: MeProfile | PublicProfile,
  user: StoredUser,
): void {
  if (user.display_name !== null) {
    profile.display_name = user.display_name;
  }
  if (user.biography !== null) {
    profile.biography = user.biography;
  }
  if (user.avatar_url !== null) {
    profile.avatar_url = user.avatar_url;
  }
}

function meFromUser(user: StoredUser): MeProfile {
  const profile: MeProfile = {
    id: user.id,
    username: user.username ?? undefined,
    blocked: user.blocked,
    content_languages: user.content_languages,
  };
  withSavedFields(profile, user);
  return profile;
}

export class ProfileService {
  now: () => Date = () => new Date();

  constructor(private readonly store: ProfileStore) {}

  async readMe(firebase_uid: string): Promise<MeProfile> {
    const user = await this.store.findByFirebaseUid(firebase_uid);
    if (!user || user.username === null) {
      return { blocked: false, content_languages: null };
    }
    return meFromUser(user);
  }

  async readPublic(username: string): Promise<PublicProfile> {
    const user = await this.store.findByUsername(username);
    if (!user || user.username === null) {
      throw new ProfileError('USER_NOT_FOUND');
    }
    const profile: PublicProfile = { username: user.username };
    withSavedFields(profile, user);
    return profile;
  }

  async saveProfile(input: ProfileSave): Promise<MeProfile> {
    const username = input.username.trim();
    if (username.length === 0) {
      throw new ProfileError('USERNAME_REQUIRED');
    }

    const existing = await this.store.findByFirebaseUid(input.firebase_uid);
    const taken = await this.store.usernameTaken(username, existing?.id ?? null);
    if (taken) {
      throw new ProfileError('USERNAME_TAKEN');
    }

    const user = existing ?? this.newUser(input.firebase_uid);
    user.username = username;
    if (input.display_name !== undefined) {
      user.display_name = input.display_name;
    }
    if (input.biography !== undefined) {
      user.biography = input.biography;
    }
    if (input.avatar_url !== undefined) {
      user.avatar_url = input.avatar_url;
    }

    if (existing) {
      await this.store.updateUser(user);
    } else {
      await this.store.insertUser(user);
    }

    await this.store.recordSignIn(user.id, this.utcDay());
    return meFromUser(user);
  }

  async setContentLanguages(
    firebase_uid: string,
    content_languages: string[] | null,
  ): Promise<{ content_languages: string[] | null }> {
    const user = await this.store.findByFirebaseUid(firebase_uid);
    if (!user || user.username === null) {
      throw new ProfileError('USERNAME_REQUIRED');
    }
    user.content_languages = this.limit(content_languages);
    await this.store.updateUser(user);
    return { content_languages: user.content_languages };
  }

  private newUser(firebase_uid: string): StoredUser {
    return {
      id: uuidV7(this.now().getTime()),
      firebase_uid,
      username: null,
      display_name: null,
      biography: null,
      avatar_url: null,
      content_languages: null,
      blocked: false,
    };
  }

  private utcDay(): string {
    return this.now().toISOString().slice(0, 10);
  }

  private limit(content_languages: string[] | null): string[] | null {
    if (content_languages === null) {
      return null;
    }
    if (content_languages.length === 0) {
      throw new ProfileError('CONTENT_LANGUAGE_INVALID');
    }
    const seen = new Set<string>();
    for (const code of content_languages) {
      if (!content_language_codes.includes(code as (typeof content_language_codes)[number])) {
        throw new ProfileError('CONTENT_LANGUAGE_INVALID');
      }
      if (seen.has(code)) {
        throw new ProfileError('CONTENT_LANGUAGE_INVALID');
      }
      seen.add(code);
    }
    return content_languages;
  }
}
