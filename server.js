const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const SCHEMA = require("./schema");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_DAYS = 30;

// Middlewares
app.use(cors());
app.use(express.json());
// En local, Express sert public/. Sur Vercel, c'est le CDN qui sert public/ (cette ligne y est ignorée).
app.use(express.static(path.join(__dirname, "public")));

// --- BASE DE DONNÉES POSTGRESQL ---
// Vercel (intégration Neon) fournit DATABASE_URL ; en local, mets-la dans le fichier .env
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) console.error("⚠ DATABASE_URL manquante : la base de données n'est pas configurée.");
const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10000 });
pool.on("error", (err) => console.error("Erreur du pool Postgres :", err.message));

// Création des tables au premier appel (sans danger si elles existent déjà).
// Le verrou évite les conflits si plusieurs instances démarrent en même temps.
let ready = null;
function initDb() {
  if (!ready) {
    ready = (async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(727274)");
        await client.query(SCHEMA);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    })().catch((err) => { ready = null; throw err; }); // en cas d'échec, on réessaiera
  }
  return ready;
}

// Gestion d'erreurs commune aux routes async
const wrap = (fn) => (req, res, next) =>
  fn(req, res, next).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Errore del server" });
  });

app.use("/api", wrap(async (req, res, next) => { await initDb(); next(); }));

// --- OUTILS D'AUTHENTIFICATION ---

function bearer(req) {
  return (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
}

async function openSession(userId, res, message) {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)`, [token, userId, Date.now()]);
  res.json({ userId, token, message });
}

// Vérifie que le jeton existe, n'est pas expiré, et appartient bien à :userId
const requireAuth = wrap(async (req, res, next) => {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Non connesso" });
  const { rows } = await pool.query(`SELECT user_id, created_at FROM sessions WHERE token = $1`, [token]);
  const row = rows[0];
  const expired = row && Date.now() - Number(row.created_at) > SESSION_DAYS * 24 * 3600 * 1000;
  if (!row || expired || String(row.user_id) !== String(req.params.userId)) {
    return res.status(401).json({ error: "Sessione non valida o scaduta" });
  }
  req.userId = row.user_id;
  next();
});

// --- ROUTES API ---

// Test rapide : la base répond-elle ?
app.get("/api/health", wrap(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

// Route de connexion ou d'inscription automatique
app.post("/api/login", wrap(async (req, res) => {
  const username = String((req.body && req.body.username) || "").trim();
  const password = String((req.body && req.body.password) || "");
  if (!username || !password) return res.status(400).json({ error: "Campi obbligatori" });
  if (username.length > 40) return res.status(400).json({ error: "Nome utente troppo lungo (massimo 40 caratteri)" });

  // On en profite pour supprimer les sessions expirées
  await pool.query(`DELETE FROM sessions WHERE created_at < $1`, [Date.now() - SESSION_DAYS * 24 * 3600 * 1000]);

  const { rows } = await pool.query(`SELECT id, password FROM users WHERE username = $1`, [username]);
  const user = rows[0];

  if (!user) {
    // Inscription si l'utilisateur n'existe pas encore
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const ins = await pool.query(`INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id`, [username, hashedPassword]);
      return openSession(ins.rows[0].id, res, "Account creato e accesso effettuato!");
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ error: "Nome utente già in uso, riprova" });
      throw err;
    }
  }

  // Vérification du mot de passe
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Password errata" });
  return openSession(user.id, res, "Accesso riuscito!");
}));

// Déconnexion : on supprime le jeton
app.post("/api/logout", wrap(async (req, res) => {
  const token = bearer(req);
  if (token) await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
  res.json({ success: true });
}));

// Récupérer les flashcards d'un utilisateur (jeton obligatoire)
app.get("/api/flashcards/:userId", requireAuth, wrap(async (req, res) => {
  const { rows } = await pool.query(`SELECT hanzi, pinyin, fr, score FROM flashcards WHERE user_id = $1 ORDER BY id`, [req.userId]);
  res.json(rows);
}));

// Sauvegarder / synchroniser les flashcards d'un utilisateur (jeton obligatoire)
app.post("/api/flashcards/:userId", requireAuth, wrap(async (req, res) => {
  const cards = (Array.isArray(req.body && req.body.cards) ? req.body.cards : [])
    .filter((c) => c && typeof c.hanzi === "string" && typeof c.fr === "string" && c.hanzi && c.fr)
    .slice(0, 5000)
    .map((c) => ({
      hanzi: c.hanzi.slice(0, 50),
      pinyin: String(c.pinyin || "").slice(0, 200),
      fr: c.fr.slice(0, 200),
      score: Math.min(Math.max(parseInt(c.score, 10) || 1, 1), 4)
    }));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM flashcards WHERE user_id = $1`, [req.userId]);
    if (cards.length) {
      await client.query(
        `INSERT INTO flashcards (user_id, hanzi, pinyin, fr, score)
         SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::int[])`,
        [req.userId, cards.map((c) => c.hanzi), cards.map((c) => c.pinyin), cards.map((c) => c.fr), cards.map((c) => c.score)]
      );
    }
    await client.query("COMMIT");
    res.json({ success: true, count: cards.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// Sur Vercel, l'application est exportée ; en local, on lance le serveur.
module.exports = app;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`App avviata: http://localhost:${PORT}`));
}
