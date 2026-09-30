DROP TRIGGER IF EXISTS admin_audit_log_append_only ON users.admin_audit_log;
DROP FUNCTION IF EXISTS users.reject_audit_mutation();

DROP INDEX IF EXISTS users.users_admin_audit_log_actor_created_idx;
DROP INDEX IF EXISTS users.users_admin_audit_log_created_at_idx;
DROP INDEX IF EXISTS users.users_blocks_lifted_by_idx;
DROP INDEX IF EXISTS users.users_blocks_actor_id_idx;
DROP INDEX IF EXISTS users.users_blocks_one_active_idx;
DROP INDEX IF EXISTS users.users_blocks_user_id_idx;
DROP INDEX IF EXISTS users.users_user_sign_ins_signed_on_idx;
DROP INDEX IF EXISTS users.users_users_administrator_idx;
DROP INDEX IF EXISTS users.users_users_created_at_idx;

DROP TABLE IF EXISTS users.admin_audit_log;
DROP TABLE IF EXISTS users.rate_limit_settings;
DROP TABLE IF EXISTS users.blocks;
DROP TABLE IF EXISTS users.user_sign_ins;
DROP TABLE IF EXISTS users.users;

DROP SCHEMA IF EXISTS users;
