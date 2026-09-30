export type FollowEvent = {
  id: string;
  event_type: 'social.user.followed';
  aggregate_id: string;
  payload: { follower_id: string; following_id: string };
  producer: 'social';
  event_version: 1;
};

export interface SocialStore {
  followUser(follower_id: string, following_id: string, event: FollowEvent): Promise<boolean>;
  unfollowUser(follower_id: string, following_id: string): Promise<void>;
  followCategory(user_id: string, category_id: string): Promise<void>;
  unfollowCategory(user_id: string, category_id: string): Promise<void>;
  followsUser(follower_id: string, following_id: string): Promise<boolean>;
  followsCategory(user_id: string, category_id: string): Promise<boolean>;
}
