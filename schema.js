// Schéma PostgreSQL de l'appli. Utilisé par server.js (création automatique)
// et par scripts/migrate-sqlite-to-postgres.js.
module.exports = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hanzi TEXT NOT NULL,
  pinyin TEXT,
  fr TEXT NOT NULL,          -- significato (en italien désormais, le nom de colonne reste « fr »)
  score INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS flashcards_user_idx ON flashcards(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
`;
