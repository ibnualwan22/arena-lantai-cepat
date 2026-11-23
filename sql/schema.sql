-- Schema SQL untuk Neon PostgreSQL (otomatis dibuat oleh app saat pertama kali jalan,
-- tapi file ini juga bisa dijalankan manual lewat Neon SQL Editor jika diinginkan).

CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
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
  latin TEXT NOT NULL,
  meaning TEXT NOT NULL,
  tip TEXT DEFAULT '',
  sub_group VARCHAR(64) DEFAULT 'Umum',
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
  show_latin_hint BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
