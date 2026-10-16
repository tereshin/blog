INSERT INTO outbox (id, name, payload)
SELECT event_id, 'identity.user.restricted', jsonb_build_object(
  'event_id', event_id, 'name', 'identity.user.restricted', 'version', 1,
  'occurred_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'correlation_id', 'deleted-users-backfill', 'causation_id', null,
  'user_id', id, 'public_number', public_number, 'role', role,
  'can_publish', false, 'is_restricted', true, 'is_deleted', true, 'created_at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)
FROM (SELECT gen_random_uuid() AS event_id, users.* FROM users WHERE deleted_at IS NOT NULL) deleted;
