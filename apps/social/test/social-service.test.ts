import { describe, expect, it } from 'vitest';
import { MemorySocialStore } from '../src/memory-social-store';
import type { KnownCategories, KnownUsers } from '../src/social-ports';
import { SocialService } from '../src/social-service';

const follower_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const following_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const category_id = '018f3c2a-7b10-7c3e-8f21-0000000000c1';
const missing_id = '018f3c2a-7b10-7c3e-8f21-0000000000ff';

const users: KnownUsers = {
  async exists(user_id) {
    return user_id === following_id;
  },
};

const categories: KnownCategories = {
  async exists(id) {
    return id === category_id;
  },
};

describe('follows', () => {
  it('keeps the remaining follow and drops the one that stopped', async () => {
    const store = new MemorySocialStore();
    const social = new SocialService(store, users, categories);

    await social.followUser(follower_id, following_id);
    await social.followCategory(follower_id, category_id);
    await social.unfollowUser(follower_id, following_id);

    expect(await store.followsUser(follower_id, following_id)).toBe(false);
    expect(await store.followsCategory(follower_id, category_id)).toBe(true);
    expect(store.outbox).toHaveLength(1);
    expect(store.outbox[0]?.event_type).toBe('social.user.followed');
    expect(store.outbox[0]?.payload).toEqual({ follower_id, following_id });
  });

  it('refuses an unknown user and does not write a follow', async () => {
    const store = new MemorySocialStore();
    const social = new SocialService(store, users, categories);
    await expect(social.followUser(follower_id, missing_id)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
    expect(store.user_follows).toHaveLength(0);
    expect(store.outbox).toHaveLength(0);
  });
});
