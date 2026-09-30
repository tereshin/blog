import type { ProfileStore, StoredUser } from './profile-store';

type SignIn = {
  user_id: string;
  signed_on: string;
};

export class MemoryProfileStore implements ProfileStore {
  private readonly users: StoredUser[] = [];
  private readonly sign_ins: SignIn[] = [];

  async findByFirebaseUid(firebase_uid: string): Promise<StoredUser | null> {
    return this.users.find((user) => user.firebase_uid === firebase_uid) ?? null;
  }

  async findByUsername(username: string): Promise<StoredUser | null> {
    return this.users.find((user) => user.username === username) ?? null;
  }

  async usernameTaken(username: string, except_user_id: string | null): Promise<boolean> {
    const folded = username.toLowerCase();
    return this.users.some(
      (user) =>
        user.username !== null &&
        user.username.toLowerCase() === folded &&
        user.id !== except_user_id,
    );
  }

  async insertUser(user: StoredUser): Promise<void> {
    this.users.push({ ...user });
  }

  async updateUser(user: StoredUser): Promise<void> {
    const index = this.users.findIndex((row) => row.id === user.id);
    if (index >= 0) {
      this.users[index] = { ...user };
    }
  }

  async recordSignIn(user_id: string, signed_on: string): Promise<void> {
    const already = this.sign_ins.some(
      (row) => row.user_id === user_id && row.signed_on === signed_on,
    );
    if (!already) {
      this.sign_ins.push({ user_id, signed_on });
    }
  }

  signIns(firebase_uid: string): string[] {
    const user = this.users.find((row) => row.firebase_uid === firebase_uid);
    if (!user) {
      return [];
    }
    return this.sign_ins
      .filter((row) => row.user_id === user.id)
      .map((row) => row.signed_on);
  }
}
