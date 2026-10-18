// Flashcard: accesso, creazione assistita (traduzione italiano → cinese + pinyin automatici), test casuali e gestione dei set.
// Le carte sono salvate sul server (SQLite), per utente. Il campo « fr » contiene ora il significato in italiano.
// Nessuna correzione automatica: è l'utente che confronta e giudica.
const Flashcards = (() => {
  const SESSION_KEY = "hanzi-session";
  const LEGACY_KEY = "hanzi-flashcards-db"; // anciennes cartes stockées dans le navigateur
  const SETS_KEY = "hanzi-flashcards-sets";   // clé locale pour les sets de cartes
  const TYPES = ["recognize", "speak", "draw"];
  const $ = id => document.getElementById(id);

  let deck = [];
  let sets = [];            // [{ id, name, cardIds: [] }]
  let session = null;       // { userId, username, token }
  let loaded = false;       // vrai seulement quand les cartes du serveur sont chargées
  let syncNote = "";
  let current = null, type = "";
  let ctx = null, drawing = false, last = null;
  let activeSetId = null;   // null = toutes les cartes

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

  /* ---------- Gestion locale des Sets ---------- */
  function loadSets() {
    try {
      const saved = localStorage.getItem(SETS_KEY + (session ? "_" + session.userId : ""));
      sets = saved ? JSON.parse(saved) : [];
    } catch {
      sets = [];
    }
  }

  function saveSets() {
    try {
      localStorage.setItem(SETS_KEY + (session ? "_" + session.userId : ""), JSON.stringify(sets));
    } catch {}
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

    // Ajout d'un bouton pour gestire les sets dans la barre d'outils
    const toolbar = main.querySelector(".fc-toolbar");
    const setsBtn = document.createElement("button");
    setsBtn.id = "fc-open-sets";
    setsBtn.type = "button";
    setsBtn.className = "btn";
    setsBtn.textContent = "📁 Set";
    setsBtn.addEventListener("click", openSetsModal);
    toolbar.insertBefore(setsBtn, toolbar.firstChild);

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
    toolbar.append(chip, out);

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
      deck = rows.map((r, idx) => ({ id: r.id || idx + "_" + r.hanzi, hanzi: r.hanzi, pinyin: r.pinyin, fr: r.fr, score: r.score || 1 }));
    } catch (err) {
      logout(err.status === 401 ? "Sessione scaduta: accedi di nuovo." : "Impossibile caricare le tue carte: " + err.message, false);
      return;
    }
    loaded = true;
    syncNote = "";
    loadSets();
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
      deck = old.map((c, idx) => ({ id: idx + "_" + c.hanzi, hanzi: c.hanzi, pinyin: c.pinyin, fr: c.fr, score: c.score || 1 }));
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
    deck = []; sets = []; current = null; activeSetId = null;
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
    const setNotice = $("fc-form-set-notice");
    if (setNotice) setNotice.remove();
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
    
    const newCard = { id: Date.now() + "_" + Math.random().toString(36).substr(2, 5), hanzi, pinyin, fr, score: 1 };
    deck.push(newCard);
    save();
    $("fc-dialog").close();

    // Afficher une option pour l'ajouter directement à un set si des sets existent
    showAddToSetPrompt(newCard);

    if (!current) next(); else updateStats();
  }

  function showAddToSetPrompt(card) {
    if (!sets.length) return;
    const dialog = $("fc-dialog");
    // On crée temporairement une pop-up ou notification rapide d'ajout au set
    const container = document.createElement("dialog");
    container.id = "fc-set-quick-dialog";
    container.className = "auth-card";
    container.style.cssText = "padding: 20px; border-radius: 12px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.2);";
    
    let html = `<h3>Aggiungi a un set</h3><p class="hint">Vuoi aggiungere «${card.hanzi}» a uno dei tuoi set?</p><div style="display:flex; flex-direction:column; gap:8px; margin: 15px 0;">`;
    sets.forEach(s => {
      const included = s.cardIds && s.cardIds.includes(card.id);
      html += `<button type="button" class="btn ${included ? 'primary' : ''}" data-set-id="${s.id}">📁 ${s.name} ${included ? '✓' : '+'}</i></button>`;
    });
    html += `</div><button type="button" class="btn" id="fc-quick-close">Chiudi</button>`;
    container.innerHTML = html;
    document.body.appendChild(container);
    container.showModal();

    container.querySelectorAll("[data-set-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const setId = btn.getAttribute("data-set-id");
        const setObj = sets.find(s => s.id === setId);
        if (setObj) {
          if (!setObj.cardIds) setObj.cardIds = [];
          if (!setObj.cardIds.includes(card.id)) {
            setObj.cardIds.push(card.id);
            saveSets();
            btn.className = "btn primary";
            btn.textContent = `📁 ${setObj.name} ✓`;
          }
        }
      });
    });

    container.querySelector("#fc-quick-close").addEventListener("click", () => {
      container.close();
      container.remove();
    });
  }

  /* ---------- Gestion des Sets (Modale) ---------- */
  function ensureSetsModal() {
    let modal = $("fc-sets-dialog");
    if (modal) return modal;
    modal = document.createElement("dialog");
    modal.id = "fc-sets-dialog";
    modal.className = "auth-card";
    modal.style.cssText = "padding: 20px; border-radius: 16px; border: none; max-width: 450px; width: 90%;";
    modal.innerHTML = `
      <h2>Gestione Set</h2>
      <p class="hint">Crea e organizza le tue flashcard in set tematici.</p>
      <div style="display: flex; gap: 8px; margin-bottom: 15px;">
        <input type="text" id="fc-new-set-name" placeholder="Nome del nuovo set..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border-soft);">
        <button type="button" id="fc-create-set-btn" class="btn primary">Crea</button>
      </div>
      <div id="fc-sets-list" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;"></div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button type="button" id="fc-sets-all-btn" class="btn">Mostra tutte le carte</button>
        <button type="button" id="fc-sets-close" class="btn primary">Chiudi</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#fc-create-set-btn").addEventListener("click", () => {
      const nameInput = modal.querySelector("#fc-new-set-name");
      const name = nameInput.value.trim();
      if (!name) return;
      sets.push({ id: "set_" + Date.now(), name, cardIds: [] });
      saveSets();
      nameInput.value = "";
      renderSetsList();
    });

    modal.querySelector("#fc-sets-close").addEventListener("click", () => modal.close());
    modal.querySelector("#fc-sets-all-btn").addEventListener("click", () => {
      activeSetId = null;
      modal.close();
      current = null;
      next();
    });

    return modal;
  }

  function renderSetsList() {
    const listContainer = document.getElementById("fc-sets-list");
    if (!listContainer) return;
    listContainer.textContent = "";

    if (!sets.length) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "Nessun set creato. Creane uno qui sopra!";
      listContainer.appendChild(empty);
      return;
    }

    sets.forEach(s => {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: var(--card-bg, #f9f9f9); padding: 10px; border-radius: 8px; border: 1px solid var(--border-soft, #ddd);";
      
      const info = document.createElement("div");
      const count = s.cardIds ? s.cardIds.length : 0;
      const isActive = activeSetId === s.id;
      info.innerHTML = `<strong>${s.name}</strong> <span style="font-size: 0.85rem; color: #666;">(${count} ${count === 1 ? 'carta' : 'carte'})</span> ${isActive ? '<span style="color:var(--primary); font-weight:bold;">[Attivo]</span>' : ''}`;
      
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";

      const playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "btn primary";
      playBtn.textContent = "Usa";
      playBtn.style.padding = "4px 10px";
      playBtn.addEventListener("click", () => {
        activeSetId = s.id;
        document.getElementById("fc-sets-dialog").close();
        current = null;
        next();
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn del";
      delBtn.textContent = "Elimina";
      delBtn.style.padding = "4px 10px";
      delBtn.addEventListener("click", () => {
        if (confirm(`Eliminare il set «${s.name}»?`)) {
          sets = sets.filter(x => x.id !== s.id);
          if (activeSetId === s.id) activeSetId = null;
          saveSets();
          renderSetsList();
          next();
        }
      });

      actions.append(playBtn, delBtn);
      row.append(info, actions);
      listContainer.appendChild(row);
    });
  }

  function openSetsModal() {
    const modal = ensureSetsModal();
    renderSetsList();
    modal.showModal();
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
  function getActiveDeck() {
    if (!activeSetId) return deck;
    const setObj = sets.find(s => s.id === activeSetId);
    if (!setObj || !setObj.cardIds) return [];
    return deck.filter(c => setObj.cardIds.includes(c.id));
  }

  function pickCard() {
    const activeDeck = getActiveDeck();
    const pool = activeDeck.length > 1 ? activeDeck.filter(c => c !== current) : activeDeck;
    const weights = pool.map(c => 5 - c.score);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  function next() {
    const activeDeck = getActiveDeck();
    if (!activeDeck.length) { 
      $("fc-card").hidden = true; 
      $("fc-empty").hidden = false; 
      $("fc-empty").textContent = activeSetId ? "Questo set è vuoto o non contiene carte." : "Nessuna carta.";
      updateStats(); 
      return; 
    }
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
    const activeSet = sets.find(s => s.id === activeSetId);
    const activeDeck = getActiveDeck();
    $("fc-list-title").textContent = activeSet ? `Set: ${activeSet.name} (${activeDeck.length})` : `Le mie flashcard (${deck.length})`;
    
    const make = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      e.textContent = text;
      return e;
    };
    
    const listToDisplay = activeSet ? activeDeck : deck;
    if (!listToDisplay.length) {
      ul.appendChild(make("li", "empty", "Nessuna carta."));
      return;
    }

    listToDisplay.forEach(c => {
      const li = document.createElement("li");
      const zh = make("span", "li-zh", c.hanzi);
      zh.lang = "zh";
      const mid = document.createElement("div");
      mid.append(make("span", "li-py", c.pinyin), make("span", "li-fr", c.fr));
      
      const level = c.score >= 3 ? ["ok", "imparata"] : c.score === 2 ? ["mid", "in corso"] : ["todo", "da ripassare"];
      
      // Bouton pour gérer les sets de cette carte individuelle
      const setMenuBtn = make("button", "btn", "📁 Set");
      setMenuBtn.type = "button";
      setMenuBtn.style.padding = "4px 8px";
      setMenuBtn.addEventListener("click", () => openCardSetsManager(c));

      const del = make("button", "btn del", "Elimina");
      del.type = "button";
      del.setAttribute("aria-label", `Elimina la carta ${c.hanzi}`);
      del.addEventListener("click", () => removeCard(c));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "4px";
      actions.append(setMenuBtn, del);

      li.append(zh, mid, make("span", "badge " + level[0], level[1]), actions);
      ul.appendChild(li);
    });
  }

  function openCardSetsManager(card) {
    if (!sets.length) {
      alert("Crea prima almeno un set tramite il pulsante «📁 Set» in alto.");
      return;
    }

    // Supprime l'ancienne modale si elle est encore là
    let existing = document.getElementById("fc-card-set-manager");
    if (existing) existing.remove();

    // Crée une belle modale cliquable
    const container = document.createElement("dialog");
    container.id = "fc-card-set-manager";
    container.className = "auth-card";
    container.style.cssText = "padding: 20px; border-radius: 12px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.2); max-width: 400px; width: 90%;";

    let html = `<h3>Gestisci Set</h3><p class="hint">Aggiungi o rimuovi «${card.hanzi}» dai tuoi set.</p><div style="display:flex; flex-direction:column; gap:8px; margin: 15px 0;">`;
    
    // Génère un bouton pour chaque set
    sets.forEach(s => {
      const included = s.cardIds && s.cardIds.includes(card.id);
      html += `<button type="button" class="btn ${included ? 'primary' : ''}" data-toggle-set="${s.id}">📁 ${s.name} ${included ? '✓' : '+'}</button>`;
    });
    
    html += `</div><button type="button" class="btn" id="fc-close-card-manager">Chiudi</button>`;
    container.innerHTML = html;
    document.body.appendChild(container);
    container.showModal();

    // Rend les boutons cliquables pour ajouter/retirer
    container.querySelectorAll("[data-toggle-set]").forEach(btn => {
      btn.addEventListener("click", () => {
        const setId = btn.getAttribute("data-toggle-set");
        const setObj = sets.find(s => s.id === setId);
        
        if (setObj) {
          if (!setObj.cardIds) setObj.cardIds = [];
          const idx = setObj.cardIds.indexOf(card.id);
          
          if (idx > -1) {
            // Si la carte y est déjà, on la retire
            setObj.cardIds.splice(idx, 1);
            btn.className = "btn";
            btn.textContent = `📁 ${setObj.name} +`;
          } else {
            // Sinon, on l'ajoute
            setObj.cardIds.push(card.id);
            btn.className = "btn primary";
            btn.textContent = `📁 ${setObj.name} ✓`;
          }
          saveSets();
          renderList(); // Met à jour la liste derrière
        }
      });
    });

    // Fermeture de la modale
    container.querySelector("#fc-close-card-manager").addEventListener("click", () => {
      container.close();
      container.remove();
    });
  }

  function openList() {
    renderList();
    $("fc-list-dialog").showModal();
  }

  function removeCard(card) {
    if (!confirm(`Eliminare la carta «${card.hanzi} — ${card.fr}»?`)) return;
    deck = deck.filter(c => c !== card);
    // Nettoyer des sets
    sets.forEach(s => {
      if (s.cardIds) s.cardIds = s.cardIds.filter(id => id !== card.id);
    });
    saveSets();
    save();
    renderList();
    if (card === current) { current = null; next(); } else updateStats();
  }

  function updateStats() {
    const activeDeck = getActiveDeck();
    const known = activeDeck.filter(c => c.score >= 3).length;
    const n = activeDeck.length;
    const activeSet = sets.find(s => s.id === activeSetId);
    const setNameStr = activeSet ? ` [Set: ${activeSet.name}]` : "";
    $("fc-stats").textContent = `${n} ${n === 1 ? "carta" : "carte"} · ${known} ${known === 1 ? "imparata" : "imparate"}${setNameStr}${syncNote}`;
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