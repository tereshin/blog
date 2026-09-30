import { SocialError } from './social-error';
import type { KnownCategories, KnownUsers } from './social-ports';
import type { SocialStore } from './social-store';
import { uuidV7 } from './uuid-v7';

export class SocialService {
  now: () => Date = () => new Date();

  constructor(
    private readonly store: SocialStore,
    private readonly users: KnownUsers,
    private readonly categories: KnownCategories,
  ) {}

  async followUser(follower_id: string, following_id: string): Promise<{ following: true }> {
    if (!(await this.users.exists(following_id))) {
      throw new SocialError('USER_NOT_FOUND');
    }
    await this.store.followUser(follower_id, following_id, {
      id: uuidV7(this.now().getTime()),
      event_type: 'social.user.followed',
      aggregate_id: following_id,
      payload: { follower_id, following_id },
      producer: 'social',
      event_version: 1,
    });
    return { following: true };
  }

  async unfollowUser(follower_id: string, following_id: string): Promise<{ following: false }> {
    await this.store.unfollowUser(follower_id, following_id);
    return { following: false };
  }

  async followCategory(user_id: string, category_id: string): Promise<{ following: true }> {
    if (!(await this.categories.exists(category_id))) {
      throw new SocialError('CATEGORY_NOT_FOUND');
    }
    await this.store.followCategory(user_id, category_id);
    return { following: true };
  }

  async unfollowCategory(user_id: string, category_id: string): Promise<{ following: false }> {
    await this.store.unfollowCategory(user_id, category_id);
    return { following: false };
  }
}
