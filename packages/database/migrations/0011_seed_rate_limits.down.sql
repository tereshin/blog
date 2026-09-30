DELETE FROM users.rate_limit_settings
WHERE action IN (
  'comment',
  'like',
  'follow',
  'direct_message',
  'article_edit',
  'image_attachment',
  'anonymous_read'
);
