import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { ProfileStore, StoredUser } from './profile-store';
import { blocks, user_sign_ins, users_table } from './users-schema';

type UserRow = typeof users_table.$inferSelect;

function toStored(row: UserRow, blocked: boolean): StoredUser {
  return {
    id: row.id,
    firebase_uid: row.firebase_uid,
    username: row.username,
    display_name: row.display_name,
    biography: row.biography,
    avatar_url: row.avatar_url,
    content_languages: row.content_languages,
    blocked,
  };
}

export class DrizzleProfileStore implements ProfileStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async findByFirebaseUid(firebase_uid: string): Promise<StoredUser | null> {
    const rows = await this.db
      .select()
      .from(users_table)
      .where(eq(users_table.firebase_uid, firebase_uid))
      .limit(1);
    const row = rows[0];
    return row ? toStored(row, await this.hasActiveBlock(row.id)) : null;
  }

  async findByUsername(username: string): Promise<StoredUser | null> {
    const rows = await this.db
      .select()
      .from(users_table)
      .where(eq(users_table.username, username))
      .limit(1);
    const row = rows[0];
    return row ? toStored(row, await this.hasActiveBlock(row.id)) : null;
  }

  private async hasActiveBlock(user_id: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: blocks.id })
      .from(blocks)
      .where(and(eq(blocks.user_id, user_id), isNull(blocks.lifted_at)))
      .limit(1);
    return rows.length > 0;
  }

  async usernameTaken(username: string, except_user_id: string | null): Promise<boolean> {
    const rows = await this.db
      .select({ id: users_table.id })
      .from(users_table)
      .where(
        and(
          sql`lower(${users_table.username}) = lower(${username})`,
          except_user_id ? ne(users_table.id, except_user_id) : undefined,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async insertUser(user: StoredUser): Promise<void> {
    await this.db.insert(users_table).values({
      id: user.id,
      firebase_uid: user.firebase_uid,
      username: user.username,
      display_name: user.display_name,
      biography: user.biography,
      avatar_url: user.avatar_url,
      content_languages: user.content_languages,
    });
  }

  async updateUser(user: StoredUser): Promise<void> {
    await this.db
      .update(users_table)
      .set({
        username: user.username,
        display_name: user.display_name,
        biography: user.biography,
        avatar_url: user.avatar_url,
        content_languages: user.content_languages,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users_table.id, user.id));
  }

  async recordSignIn(user_id: string, signed_on: string): Promise<void> {
    await this.db
      .insert(user_sign_ins)
      .values({ user_id, signed_on })
      .onConflictDoNothing();
  }
}
