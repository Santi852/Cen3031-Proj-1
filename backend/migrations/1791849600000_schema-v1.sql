-- Up Migration

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = btrim(email) AND email <> ''),
  password_hash text NOT NULL CHECK (btrim(password_hash) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE leetcode_accounts (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  username text NOT NULL CHECK (username = btrim(username) AND username <> ''),
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz
);

CREATE UNIQUE INDEX leetcode_accounts_username_unique
  ON leetcode_accounts (lower(username));

CREATE TABLE problems (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug = lower(btrim(slug)) AND slug <> ''),
  title text NOT NULL CHECK (btrim(title) <> ''),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  problem_id bigint NOT NULL REFERENCES problems (id) ON DELETE RESTRICT,
  first_solved_at timestamptz NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('leetcode', 'demo')),
  source_submission_id text CHECK (btrim(source_submission_id) <> ''),
  PRIMARY KEY (user_id, problem_id),
  CHECK (verified_at >= first_solved_at)
);

CREATE INDEX submissions_user_solved_idx ON submissions (user_id, first_solved_at);
CREATE INDEX submissions_problem_idx ON submissions (problem_id);

CREATE TABLE weekly_scores (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  week_start date NOT NULL CHECK (extract(isodow FROM week_start) = 1),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  score_reached_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start),
  CHECK (
    (points = 0 AND score_reached_at IS NULL)
    OR (points > 0 AND score_reached_at IS NOT NULL)
  ),
  CHECK (
    score_reached_at >= (week_start::timestamp AT TIME ZONE 'UTC')
    AND score_reached_at < ((week_start + 7)::timestamp AT TIME ZONE 'UTC')
  )
);

CREATE INDEX weekly_scores_leaderboard_idx
  ON weekly_scores (week_start, points DESC, score_reached_at);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  problem_id bigint NOT NULL REFERENCES problems (id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (code ~ '[^[:space:]]'),
  language text NOT NULL CHECK (language ~ '[^[:space:]]'),
  time_complexity text NOT NULL CHECK (time_complexity ~ '[^[:space:]]'),
  space_complexity text NOT NULL CHECK (space_complexity ~ '[^[:space:]]'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_problem_created_idx ON posts (problem_id, created_at DESC);
CREATE INDEX posts_user_idx ON posts (user_id);

-- Down Migration

DROP TABLE posts;
DROP TABLE weekly_scores;
DROP TABLE submissions;
DROP TABLE problems;
DROP TABLE leetcode_accounts;
DROP TABLE users;
