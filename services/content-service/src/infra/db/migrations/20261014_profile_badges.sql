ALTER TABLE settings ADD COLUMN profile_badges jsonb NOT NULL DEFAULT '[{"id": "first_post", "label": "Первая публикация", "image_url": "/badges/first_post.svg", "status": "active", "trigger": {"metric": "published_posts", "threshold": 1}}, {"id": "ten_reactions", "label": "Десять реакций", "image_url": "/badges/ten_reactions.svg", "status": "active", "trigger": {"metric": "reputation", "threshold": 10}}, {"id": "one_year", "label": "Год на площадке", "image_url": "/badges/one_year.svg", "status": "active", "trigger": {"metric": "membership_months", "threshold": 12}}]'::jsonb;
CREATE TABLE profile_badge_awards (
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
INSERT INTO profile_badge_awards(user_id, badge_id)
SELECT user_id, 'first_post' FROM profiles p
WHERE EXISTS (SELECT 1 FROM articles a WHERE a.author_id = p.user_id AND a.status = 'published')
UNION ALL
SELECT user_id, 'ten_reactions' FROM profiles WHERE reputation >= 10
UNION ALL
SELECT p.user_id, 'one_year' FROM profiles p JOIN users_copy u USING (user_id)
WHERE (u.created_at AT TIME ZONE 'UTC') + interval '12 months' <= (now() AT TIME ZONE 'UTC');
