// Copie les comptes et les flashcards de l'ancienne base SQLite vers PostgreSQL.
// À lancer UNE FOIS, en local :
//   npm install --no-save sqlite3
//   node --env-file=.env scripts/migrate-sqlite-to-postgres.js [chemin/vers/database.sqlite]
// Sans risque si on le relance : un compte déjà présent n'est pas dupliqué, et ses cartes
// ne sont importées que s'il n'en a encore aucune dans PostgreSQL.
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const SCHEMA = require("../schema");

const file = path.resolve(process.argv[2] || path.join(__dirname, "..", "database.sqlite"));
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!url) { console.error("DATABASE_URL manquante (fichier .env)."); process.exit(1); }
if (!fs.existsSync(file)) { console.error("Fichier SQLite introuvable :", file); process.exit(1); }

let sqlite3;
try { sqlite3 = require("sqlite3"); }
catch { console.error("Module sqlite3 absent. Lance d'abord : npm install --no-save sqlite3"); process.exit(1); }

const lite = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
const all = (sql) => new Promise((ok, ko) => lite.all(sql, (e, rows) => (e ? ko(e) : ok(rows))));

(async () => {
  const users = await all("SELECT id, username, password FROM users");
  const cards = await all("SELECT user_id, hanzi, pinyin, fr, score FROM flashcards ORDER BY id");
  console.log(`SQLite : ${users.length} compte(s), ${cards.length} carte(s).`);

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  let newUsers = 0, importedCards = 0, skippedUsers = 0;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(727274)");
    await client.query(SCHEMA);

    for (const u of users) {
      const ins = await client.query(
        `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING id`,
        [u.username, u.password]
      );
      let pgId;
      if (ins.rows[0]) { pgId = ins.rows[0].id; newUsers++; }
      else pgId = (await client.query(`SELECT id FROM users WHERE username = $1`, [u.username])).rows[0].id;

      const have = (await client.query(`SELECT COUNT(*)::int AS n FROM flashcards WHERE user_id = $1`, [pgId])).rows[0].n;
      if (have > 0) { skippedUsers++; continue; }

      const mine = cards.filter((c) => c.user_id === u.id && c.hanzi && c.fr);
      if (mine.length) {
        await client.query(
          `INSERT INTO flashcards (user_id, hanzi, pinyin, fr, score)
           SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::int[])`,
          [pgId, mine.map((c) => c.hanzi), mine.map((c) => c.pinyin || ""), mine.map((c) => c.fr), mine.map((c) => Math.min(Math.max(parseInt(c.score, 10) || 1, 1), 4))]
        );
        importedCards += mine.length;
      }
    }
    await client.query("COMMIT");
    console.log(`PostgreSQL : ${newUsers} compte(s) créé(s), ${importedCards} carte(s) importée(s)` +
      (skippedUsers ? `, ${skippedUsers} compte(s) déjà garni(s) laissé(s) intact(s).` : "."));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Échec, rien n'a été modifié :", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    lite.close();
  }
})();
