// Flashcard: accesso, creazione assistita (traduzione italiano → cinese + pinyin automatici) e test casuali.
// Le carte sono salvate sul server (SQLite), per utente. Il campo « fr » contiene ora il significato in italiano.
// Nessuna correzione automatica: è l'utente che confronta e giudica.
const Flashcards = (() => {
  const SESSION_KEY = "hanzi-session";
  const LEGACY_KEY = "hanzi-flashcards-db"; // anciennes cartes stockées dans le navigateur
  const TYPES = ["recognize", "speak", "draw"];
  const $ = id => document.getElementById(id);

  let deck = [];
  let session = null;       // { userId, username, token }
  let loaded = false;       // vrai seulement quand les cartes du serveur sont chargées
  let syncNote = "";
  let current = null, type = "";
  let ctx = null, drawing = false, last = null;

  /* ---------- Appels au serveur ---------- */
  async function api(path, opts = {}) {
    const headers = { "Content-Type": "application/json" };
    if (session) headers.Authorization = "Bearer " + session.token;
    let r;
    try {
      r = await fetch(path, { ...opts, headers });
    } catch {
      throw new Error("Server non raggiungibile: controlla che «npm start» sia in esecuzione.");
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(data.error || "Errore del server");
      e.status = r.status;
      throw e;
    }
    return data;
  }

  /* ---------- Sauvegarde (envoyée au serveur, en file d'attente) ---------- */
  let chain = Promise.resolve(), saveTimer = null, dirty = false;

  function save() {
    if (!loaded) return; // jamais d'envoi tant que les cartes du serveur ne sont pas chargées
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  }

  function flush() {
    clearTimeout(saveTimer);
    if (!dirty || !session) return chain;
    dirty = false;
    const body = JSON.stringify({ cards: deck });
    const userId = session.userId;
    chain = chain
      .then(() => api(`/api/flashcards/${userId}`, { method: "POST", body }))
      .then(() => { syncNote = ""; updateStats(); })
      .catch(err => {
        if (err.status === 401) { logout("Sessione scaduta: accedi di nuovo.", false); return; }
        dirty = true;
        syncNote = " · ⚠ salvataggio non riuscito";
        updateStats();
      });
    return chain;
  }

  /* ---------- Connexion ---------- */
  function buildAuth() {
    const root = $("fc-card").parentElement; // le bloc .fc

    // Tout le contenu existant est rangé dans #fc-main, caché tant qu'on n'est pas connecté
    const main = document.createElement("div");
    main.id = "fc-main";
    main.hidden = true;
    [root.querySelector(".fc-toolbar"), $("fc-empty"), $("fc-card")].forEach(el => main.appendChild(el));
    root.insertBefore(main, root.firstChild);

    const auth = document.createElement("section");
    auth.id = "fc-auth";
    auth.className = "auth-card";
    auth.hidden = true;
    auth.innerHTML = `
      <h2>Accesso</h2>
      <p class="hint">Accedi per ritrovare le tue flashcard. Se il nome utente non esiste ancora, l'account viene creato automaticamente.</p>
      <form id="fc-auth-form">
        <label class="field">Nome utente
          <input id="fc-auth-user" type="text" autocomplete="username" maxlength="40" required>
        </label>
        <label class="field">Password
          <input id="fc-auth-pass" type="password" autocomplete="current-password" required>
        </label>
        <p id="fc-auth-msg" class="msg" aria-live="polite"></p>
        <button id="fc-auth-submit" class="btn primary" type="submit">Accedi</button>
      </form>`;
    root.insertBefore(auth, main);

    // Nom de l'utilisateur et bouton de déconnexion dans la barre d'outils
    const chip = document.createElement("span");
    chip.id = "fc-user";
    chip.className = "user-chip";
    const out = document.createElement("button");
    out.id = "fc-logout";
    out.type = "button";
    out.className = "btn";
    out.textContent = "Esci";
    main.querySelector(".fc-toolbar").append(chip, out);

    $("fc-auth-form").addEventListener("submit", submitLogin);
    out.addEventListener("click", () => logout());
  }

  function showAuth(message) {
    $("fc-main").hidden = true;
    $("fc-auth").hidden = false;
    $("fc-auth-msg").textContent = message || "";
    $("fc-auth-pass").value = "";
  }

  function showApp() {
    $("fc-auth").hidden = true;
    $("fc-main").hidden = false;
    $("fc-user").textContent = session.username;
  }

  async function submitLogin(e) {
    e.preventDefault();
    const username = $("fc-auth-user").value.trim();
    const password = $("fc-auth-pass").value;
    const msg = $("fc-auth-msg"), btn = $("fc-auth-submit");
    if (!username || !password) { msg.textContent = "Inserisci nome utente e password."; return; }
    btn.disabled = true;
    msg.textContent = "Accesso in corso…";
    try {
      session = null;
      const data = await api("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
      session = { userId: data.userId, username, token: data.token };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
      await startSession();
    } catch (err) {
      msg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }

  async function startSession() {
    loaded = false;
    try {
      const rows = await api(`/api/flashcards/${session.userId}`);
      deck = rows.map(r => ({ hanzi: r.hanzi, pinyin: r.pinyin, fr: r.fr, score: r.score || 1 }));
    } catch (err) {
      logout(err.status === 401 ? "Sessione scaduta: accedi di nuovo." : "Impossibile caricare le tue carte: " + err.message, false);
      return;
    }
    loaded = true;
    syncNote = "";
    showApp();
    importLegacyCards();
    current = null;
    next();
  }

  // Une seule fois : propose de récupérer les cartes enregistrées avant la connexion
  function importLegacyCards() {
    if (deck.length) return;
    let old = [];
    try { old = JSON.parse(localStorage.getItem(LEGACY_KEY)); } catch {}
    if (!Array.isArray(old)) return;
    old = old.filter(c => c && c.hanzi && c.pinyin && c.fr);
    if (!old.length) return;
    if (confirm(`Importare le ${old.length} carte salvate su questo computer nel tuo account?`)) {
      deck = old.map(c => ({ hanzi: c.hanzi, pinyin: c.pinyin, fr: c.fr, score: c.score || 1 }));
      try { localStorage.removeItem(LEGACY_KEY); } catch {}
      save();
    }
  }

  async function logout(message, remote = true) {
    if (remote && session) {
      await flush(); // on envoie d'abord les dernières modifications
      api("/api/logout", { method: "POST" }).catch(() => {});
    }
    session = null; loaded = false; dirty = false;
    clearTimeout(saveTimer);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    deck = []; current = null;
    if ($("fc-dialog").open) $("fc-dialog").close();
    if ($("fc-list-dialog").open) $("fc-list-dialog").close();
    showAuth(message);
  }

  /* ---------- Pinyin + traduction automatiques ---------- */
  const hasChinese = s => /[\u4e00-\u9fff]/.test(s || "");
  const toPinyin = hanzi => {
    try { return window.pinyinPro ? pinyinPro.pinyin(hanzi) : ""; } catch { return ""; }
  };

  async function translate(text) {
    const q = encodeURIComponent(text);
    try {
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=zh-CN&dt=t&q=${q}`, { signal: AbortSignal.timeout(6000) });
      const d = await r.json();
      const out = d[0].map(s => s[0]).join("");
      if (hasChinese(out)) return out;
    } catch {}
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${q}&langpair=it|zh-CN`, { signal: AbortSignal.timeout(6000) });
      const d = await r.json();
      if (hasChinese(d.responseData.translatedText)) return d.responseData.translatedText;
    } catch {}
    return "";
  }

  /* ---------- Formulaire de création ---------- */
  let reqId = 0, timer = null;

  function openForm() {
    ["fc-add-fr", "fc-add-zh", "fc-add-py"].forEach(id => { $(id).value = ""; });
    $("fc-form-msg").textContent = "Scrivi la parola in italiano: il cinese e il pinyin si compilano da soli.";
    $("fc-dialog").showModal();
    $("fc-add-fr").focus();
  }

  async function autoFill(word) {
    const id = ++reqId;
    $("fc-form-msg").textContent = "Traduzione in corso…";
    const zh = await translate(word);
    if (id !== reqId) return;
    if (!zh) {
      $("fc-form-msg").textContent = "Traduzione non riuscita: scrivi il cinese a mano, il pinyin si compilerà da solo.";
      return;
    }
    const py = toPinyin(zh);
    $("fc-add-zh").value = zh;
    $("fc-add-py").value = py;
    $("fc-form-msg").textContent = py
      ? "Controlla la traduzione, puoi correggerla."
      : "Pinyin automatico non disponibile (js/pinyin-pro.js non caricato): scrivilo a mano.";
  }

  function onFrenchInput() {
    clearTimeout(timer);
    const word = $("fc-add-fr").value.trim();
    if (!word) { reqId++; return; }
    timer = setTimeout(() => autoFill(word), 600);
  }

  function submitForm(e) {
    e.preventDefault();
    const fr = $("fc-add-fr").value.trim();
    const hanzi = $("fc-add-zh").value.trim();
    const pinyin = $("fc-add-py").value.trim();
    if (!fr || !hanzi || !pinyin) { $("fc-form-msg").textContent = "Compila tutti e tre i campi."; return; }
    deck.push({ hanzi, pinyin, fr, score: 1 });
    save();
    $("fc-dialog").close();
    if (!current) next(); else updateStats();
  }

  /* ---------- Zone de dessin ---------- */
  function setupCanvas() {
    const c = $("fc-canvas");
    const ratio = window.devicePixelRatio || 1;
    c.width = Math.round(c.clientWidth * ratio);
    c.height = Math.round(c.clientHeight * ratio);
    ctx = c.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1b2340";
  }

  function bindCanvas() {
    const c = $("fc-canvas");
    const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    c.addEventListener("pointerdown", e => {
      if (!ctx || !c.width) setupCanvas();
      drawing = true;
      c.setPointerCapture(e.pointerId);
      last = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x + 0.01, last.y); ctx.stroke();
    });
    c.addEventListener("pointermove", e => {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    });
    const stop = () => { drawing = false; };
    c.addEventListener("pointerup", stop);
    c.addEventListener("pointercancel", stop);
    // La zone de dessin est invisible tant que l'onglet n'est pas ouvert : on la
    // (re)dimensionne dès qu'elle devient visible ou qu'elle change de taille.
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { if (c.clientWidth && !$("fc-draw").hidden) setupCanvas(); }).observe(c);
    }
    $("fc-clear").addEventListener("click", () => {
      if (ctx) ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
    });
  }

  /* ---------- Voix ---------- */
  function speak(text) {
    if (!("speechSynthesis" in window)) { $("fc-help").textContent = "Sintesi vocale non disponibile su questo browser."; return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN"; u.rate = 0.8;
    const zh = speechSynthesis.getVoices().find(v => v.lang.replace("_", "-").startsWith("zh"));
    if (zh) u.voice = zh;
    speechSynthesis.speak(u);
  }

  /* ---------- Tests ---------- */
  function pickCard() {
    const pool = deck.length > 1 ? deck.filter(c => c !== current) : deck;
    const weights = pool.map(c => 5 - c.score);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  function next() {
    if (!deck.length) { $("fc-card").hidden = true; $("fc-empty").hidden = false; updateStats(); return; }
    current = pickCard();
    type = TYPES[Math.floor(Math.random() * TYPES.length)];

    $("fc-empty").hidden = true;
    $("fc-card").hidden = false;
    $("fc-back").hidden = true;
    $("fc-front").hidden = false;
    $("fc-card").style.setProperty("--n", Math.min([...current.hanzi].length, 5));
    $("fc-input").value = "";

    const main = $("fc-q-main"), sub = $("fc-q-sub");
    if (type === "recognize") {
      $("fc-type").textContent = "Cosa significa questa parola?";
      main.className = "q-main zh"; main.textContent = current.hanzi; sub.textContent = "";
      $("fc-check").textContent = "Gira la carta";
    } else if (type === "speak") {
      $("fc-type").textContent = "Pronuncia questa parola ad alta voce";
      main.className = "q-main zh"; main.textContent = current.hanzi; sub.textContent = "";
      $("fc-check").textContent = "Ascolta la pronuncia";
    } else {
      $("fc-type").textContent = "Disegna questa parola in cinese";
      main.className = "q-main py"; main.textContent = current.pinyin; sub.textContent = current.fr;
      $("fc-check").textContent = "Conferma il disegno";
    }
    $("fc-input").hidden = type !== "recognize";
    $("fc-draw").hidden = type !== "draw";
    if (type === "draw") setupCanvas();
    if (type === "recognize") $("fc-input").focus();
    updateStats();
  }

  function check() {
    if (!current) return;
    $("fc-sol-zh").textContent = current.hanzi;
    $("fc-sol-py").textContent = current.pinyin;
    $("fc-sol-fr").textContent = current.fr;

    $("fc-compare").classList.toggle("single", type === "speak");
    $("fc-mine").hidden = type === "speak";
    $("fc-mine-text").hidden = type !== "recognize";
    $("fc-mine-img-wrap").hidden = type !== "draw";
    if (type === "recognize") $("fc-mine-text").textContent = $("fc-input").value.trim() || "—";
    if (type === "draw") $("fc-mine-img").src = $("fc-canvas").toDataURL("image/png");

    $("fc-help").textContent = type === "speak"
      ? "Confronta con la tua pronuncia, poi dì se avevi ragione."
      : "Confronta la tua risposta con la soluzione, poi dì se avevi ragione.";
    $("fc-front").hidden = true;
    $("fc-back").hidden = false;
    if (type === "speak") speak(current.hanzi);
  }

  function answer(ok) {
    current.score = ok ? Math.min(current.score + 1, 4) : 1;
    save();
    next();
  }

  /* ---------- Liste de toutes les cartes ---------- */
  function renderList() {
    const ul = $("fc-list");
    ul.textContent = "";
    $("fc-list-title").textContent = `Le mie flashcard (${deck.length})`;
    const make = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      e.textContent = text;
      return e;
    };
    if (!deck.length) {
      ul.appendChild(make("li", "empty", "Nessuna carta."));
      return;
    }
    deck.forEach(c => {
      const li = document.createElement("li");
      const zh = make("span", "li-zh", c.hanzi);
      zh.lang = "zh";
      const mid = document.createElement("div");
      mid.append(make("span", "li-py", c.pinyin), make("span", "li-fr", c.fr));
      const level = c.score >= 3 ? ["ok", "imparata"] : c.score === 2 ? ["mid", "in corso"] : ["todo", "da ripassare"];
      const del = make("button", "btn del", "Elimina");
      del.type = "button";
      del.setAttribute("aria-label", `Elimina la carta ${c.hanzi}`);
      del.addEventListener("click", () => removeCard(c));
      li.append(zh, mid, make("span", "badge " + level[0], level[1]), del);
      ul.appendChild(li);
    });
  }

  function openList() {
    renderList();
    $("fc-list-dialog").showModal();
  }

  function removeCard(card) {
    if (!confirm(`Eliminare la carta «${card.hanzi} — ${card.fr}»?`)) return;
    deck = deck.filter(c => c !== card);
    save();
    renderList();
    if (card === current) { current = null; next(); } else updateStats();
  }

  function updateStats() {
    const known = deck.filter(c => c.score >= 3).length;
    const n = deck.length;
    $("fc-stats").textContent = `${n} ${n === 1 ? "carta" : "carte"} · ${known} ${known === 1 ? "imparata" : "imparate"}${syncNote}`;
  }

  function init() {
    buildAuth();
    bindCanvas();
    $("fc-open-form").addEventListener("click", openForm);
    $("fc-open-list").addEventListener("click", openList);
    $("fc-list-close").addEventListener("click", () => $("fc-list-dialog").close());
    $("fc-cancel").addEventListener("click", () => $("fc-dialog").close());
    $("fc-dialog").addEventListener("close", () => { reqId++; clearTimeout(timer); });
    $("fc-form").addEventListener("submit", submitForm);
    $("fc-add-fr").addEventListener("input", onFrenchInput);
    $("fc-add-fr").addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); const w = $("fc-add-fr").value.trim(); if (w) autoFill(w); }
    });
    $("fc-add-zh").addEventListener("input", () => { $("fc-add-py").value = toPinyin($("fc-add-zh").value.trim()); });

    $("fc-check").addEventListener("click", check);
    $("fc-input").addEventListener("keydown", e => { if (e.key === "Enter") check(); });
    $("fc-listen").addEventListener("click", () => current && speak(current.hanzi));
    $("fc-yes").addEventListener("click", () => answer(true));
    $("fc-no").addEventListener("click", () => answer(false));

    try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { session = null; }
    if (session && session.token && session.userId) startSession();
    else { session = null; showAuth(); }
  }
  return { init };
})();