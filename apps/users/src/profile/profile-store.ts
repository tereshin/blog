export type StoredUser = {
  id: string;
  firebase_uid: string;
  username: string | null;
  display_name: string | null;
  biography: string | null;
  avatar_url: string | null;
  content_languages: string[] | null;
  blocked: boolean;
};

export interface ProfileStore {
  findByFirebaseUid(firebase_uid: string): Promise<StoredUser | null>;
  findByUsername(username: string): Promise<StoredUser | null>;
  usernameTaken(username: string, except_user_id: string | null): Promise<boolean>;
  insertUser(user: StoredUser): Promise<void>;
  updateUser(user: StoredUser): Promise<void>;
  recordSignIn(user_id: string, signed_on: string): Promise<void>;
}
