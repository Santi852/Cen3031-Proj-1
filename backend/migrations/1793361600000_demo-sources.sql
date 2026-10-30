-- Up Migration
ALTER TABLE discussion_unlocks ADD COLUMN data_source text NOT NULL DEFAULT 'leetcode' CHECK (data_source IN ('leetcode','demo'));
ALTER TABLE discussion_unlocks DROP CONSTRAINT discussion_unlocks_pkey;
ALTER TABLE discussion_unlocks ADD PRIMARY KEY (user_id,problem_id,data_source);
ALTER TABLE weekly_scores ADD COLUMN data_source text NOT NULL DEFAULT 'leetcode' CHECK (data_source IN ('leetcode','demo'));
ALTER TABLE weekly_scores DROP CONSTRAINT weekly_scores_pkey;
ALTER TABLE weekly_scores ADD PRIMARY KEY (user_id,week_start,data_source);
-- Down Migration
-- Only disposable databases: removing fixture rows is destructive.
DELETE FROM discussion_unlocks WHERE data_source='demo';
DELETE FROM weekly_scores WHERE data_source='demo';
ALTER TABLE discussion_unlocks DROP CONSTRAINT discussion_unlocks_pkey;
ALTER TABLE discussion_unlocks DROP COLUMN data_source;
ALTER TABLE discussion_unlocks ADD PRIMARY KEY (user_id,problem_id);
ALTER TABLE weekly_scores DROP CONSTRAINT weekly_scores_pkey;
ALTER TABLE weekly_scores DROP COLUMN data_source;
ALTER TABLE weekly_scores ADD PRIMARY KEY (user_id,week_start);
