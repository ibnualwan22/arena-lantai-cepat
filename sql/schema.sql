-- Schema SQL untuk Neon PostgreSQL (otomatis dibuat/dimigrasi oleh app saat pertama kali jalan).

CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT DEFAULT '',
  color VARCHAR(16) DEFAULT '#10B981',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  program_id INT REFERENCES programs(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL DEFAULT 1,
  slug VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT DEFAULT '',
  color VARCHAR(16) DEFAULT '#10B981',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vocabularies (
  id SERIAL PRIMARY KEY,
  chapter_id INT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  arabic TEXT NOT NULL,
  latin TEXT DEFAULT '',
  meaning TEXT NOT NULL,
  tip TEXT DEFAULT '',
  sub_group VARCHAR(64) DEFAULT 'Umum',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_sessions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(16) UNIQUE NOT NULL,
  title VARCHAR(120) NOT NULL,
  program_id INT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  chapter_from INT NOT NULL DEFAULT 1,
  chapter_to INT NOT NULL DEFAULT 1,
  difficulty_preset VARCHAR(32) DEFAULT 'sedang',
  correct_tiles_per_round INT DEFAULT 4,
  choices_per_round INT DEFAULT 4,
  round_time_seconds DOUBLE PRECISION DEFAULT 8.0,
  time_decay_per_round DOUBLE PRECISION DEFAULT 0.3,
  min_round_time_seconds DOUBLE PRECISION DEFAULT 5.0,
  max_rounds INT DEFAULT 10,
  intermission_seconds INT DEFAULT 8,
  question_mode VARCHAR(32) DEFAULT 'auto',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_settings (
  id INT PRIMARY KEY DEFAULT 1,
  difficulty_preset VARCHAR(32) DEFAULT 'sedang',
  correct_tiles_per_round INT DEFAULT 4,
  choices_per_round INT DEFAULT 4,
  round_time_seconds DOUBLE PRECISION DEFAULT 8.0,
  time_decay_per_round DOUBLE PRECISION DEFAULT 0.3,
  min_round_time_seconds DOUBLE PRECISION DEFAULT 4.5,
  max_rounds INT DEFAULT 10,
  intermission_seconds INT DEFAULT 8,
  question_mode VARCHAR(32) DEFAULT 'auto',
  show_latin_hint BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_stats (
  roblox_user_id BIGINT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  rank_points INT DEFAULT 0,
  rank_title VARCHAR(48) DEFAULT 'Mubtadi''',
  dinar INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  wins INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_player_stats (
  program_id INT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  roblox_user_id BIGINT NOT NULL,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  rank_points INT DEFAULT 0,
  rank_title VARCHAR(48) DEFAULT 'Mubtadi''',
  total_correct INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  wins INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (program_id, roblox_user_id)
);
