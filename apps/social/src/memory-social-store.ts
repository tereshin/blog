import type { FollowEvent, SocialStore } from './social-store';

type Pair = { left: string; right: string };

export class MemorySocialStore implements SocialStore {
  readonly user_follows: Pair[] = [];
  readonly category_follows: Pair[] = [];
  readonly outbox: FollowEvent[] = [];

  async followUser(follower_id: string, following_id: string, event: FollowEvent): Promise<boolean> {
    const exists = this.user_follows.some((pair) => pair.left === follower_id && pair.right === following_id);
    if (exists) {
      return false;
    }
    this.user_follows.push({ left: follower_id, right: following_id });
    this.outbox.push(event);
    return true;
  }

  async unfollowUser(follower_id: string, following_id: string): Promise<void> {
    const index = this.user_follows.findIndex(
      (pair) => pair.left === follower_id && pair.right === following_id,
    );
    if (index >= 0) {
      this.user_follows.splice(index, 1);
    }
  }

  async followCategory(user_id: string, category_id: string): Promise<void> {
    const exists = this.category_follows.some((pair) => pair.left === user_id && pair.right === category_id);
    if (!exists) {
      this.category_follows.push({ left: user_id, right: category_id });
    }
  }

  async unfollowCategory(user_id: string, category_id: string): Promise<void> {
    const index = this.category_follows.findIndex(
      (pair) => pair.left === user_id && pair.right === category_id,
    );
    if (index >= 0) {
      this.category_follows.splice(index, 1);
    }
  }

  async followsUser(follower_id: string, following_id: string): Promise<boolean> {
    return this.user_follows.some((pair) => pair.left === follower_id && pair.right === following_id);
  }

  async followsCategory(user_id: string, category_id: string): Promise<boolean> {
    return this.category_follows.some((pair) => pair.left === user_id && pair.right === category_id);
  }
}
