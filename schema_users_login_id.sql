-- Align science_sims users.email with QSIS user.username (no @qos.edu.hk).
-- Existing DBs:  mysql -u USER -p DB_NAME < schema_users_login_id.sql
-- Idempotent: only rewrites school-domain emails; skips when target username already exists.

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- Strip @qos.edu.hk / legacy student domains when the bare username is free.
UPDATE users u
INNER JOIN (
    SELECT id,
           LOWER(SUBSTRING_INDEX(email, '@', 1)) AS login_id
    FROM users
    WHERE email LIKE '%@%'
      AND (
          LOWER(SUBSTRING_INDEX(email, '@', -1)) IN (
              'qos.edu.hk',
              'student.qos.edu.hk',
              'student.qsis.local',
              'qsis.local'
          )
      )
) x ON x.id = u.id
LEFT JOIN users taken ON taken.email = x.login_id AND taken.id <> u.id
SET u.email = x.login_id,
    u.updated_at = CURRENT_TIMESTAMP
WHERE taken.id IS NULL
  AND u.email <> x.login_id;
