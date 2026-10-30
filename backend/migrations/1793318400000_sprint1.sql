-- Up Migration
ALTER TABLE leetcode_accounts ADD COLUMN profile_counts jsonb NOT NULL DEFAULT '{"easy":0,"medium":0,"hard":0}';
CREATE TABLE discussion_unlocks (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id bigint NOT NULL REFERENCES problems(id) ON DELETE RESTRICT,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, problem_id)
);
INSERT INTO discussion_unlocks(user_id,problem_id,unlocked_at)
SELECT user_id,problem_id,verified_at FROM submissions WHERE source='leetcode';
ALTER TABLE posts ADD COLUMN title text NOT NULL DEFAULT 'Solution';
ALTER TABLE posts ADD COLUMN comment text NOT NULL DEFAULT '';
-- NOT VALID preserves legacy rows while enforcing enums on every new write.
ALTER TABLE posts ADD CONSTRAINT posts_language_enum CHECK (language IN ('python','java','cpp','c','csharp','javascript','typescript','go')) NOT VALID;
ALTER TABLE posts ADD CONSTRAINT posts_time_enum CHECK (time_complexity IN ('O(1)','O(log n)','O(n)','O(n log n)','O(n^2)','O(n^3)','O(2^n)','O(n!)')) NOT VALID;
ALTER TABLE posts ADD CONSTRAINT posts_space_enum CHECK (space_complexity IN ('O(1)','O(log n)','O(n)','O(n log n)','O(n^2)','O(n^3)','O(2^n)','O(n!)')) NOT VALID;
-- Down Migration
ALTER TABLE posts DROP CONSTRAINT posts_space_enum, DROP CONSTRAINT posts_time_enum, DROP CONSTRAINT posts_language_enum;
ALTER TABLE posts DROP COLUMN comment, DROP COLUMN title;
DROP TABLE discussion_unlocks;
ALTER TABLE leetcode_accounts DROP COLUMN profile_counts;
