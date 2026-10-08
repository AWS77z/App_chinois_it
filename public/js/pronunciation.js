// Pronuncia: traduzione dinamica (italiano → cinese), sintesi vocale e verifica.
const Pronunciation = (() => {
  let currentPhraseZh = "";
  let currentPhraseFr = "";
  let currentPinyin = "";
  let recognizer = null;
  
  const $ = id => document.getElementById(id);
  const norm = s => s.replace(/[\s，。！？,.!?]/g, "");

  async function fetchTranslation(text, sourceLang = 'it', targetLang = 'zh-CN') {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();

      let translatedText = "";
      data[0].forEach(segment => {
        if (segment[0]) translatedText += segment[0];
      });

      let pinyin = "";
      if (targetLang === 'zh-CN' && data[0] && data[0][1]) {
         pinyin = data[0][1][3] || data[0][1][2] || "";
      }

      return { text: translatedText, pinyin: pinyin.toLowerCase() };
    } catch (error) {
      console.error("Errore di traduzione:", error);
      return null;
    }
  }

  async function handleTranslate() {
    const input = $("p-input").value.trim();
    if (!input) return;

    $("p-meaning").textContent = "Traduzione in corso...";
    $("p-pinyin").textContent = "...";
    $("p-hanzi").textContent = "";
    $("p-result").textContent = "";

    const isChinese = /[\u4e00-\u9fa5]/.test(input);

    if (isChinese) {
       currentPhraseZh = input;
       const result = await fetchTranslation(input, 'zh-CN', 'it');
       if (result) {
           currentPhraseFr = result.text;
           const pinyinResult = await fetchTranslation(input, 'zh-CN', 'zh-CN');
           currentPinyin = pinyinResult ? pinyinResult.pinyin : "";
       }
    } else {
       currentPhraseFr = input;
       const result = await fetchTranslation(input, 'it', 'zh-CN');
       if (result) {
           currentPhraseZh = result.text;
           currentPinyin = result.pinyin;
       }
    }

    $("p-hanzi").textContent = currentPhraseZh;
    $("p-pinyin").textContent = currentPinyin;
    $("p-meaning").textContent = currentPhraseFr;

    setTimeout(listen, 1000);
  }

  function listen() {
    if (!("speechSynthesis" in window) || !currentPhraseZh) return;
    speechSynthesis.resume();
    speechSynthesis.cancel();
    
    const u = new SpeechSynthesisUtterance(currentPhraseZh);
    u.lang = "zh-CN"; 
    u.rate = 0.8; 
    
    const voices = speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes("zh") || v.lang.includes("ZH") || v.lang.includes("cmn"));
    if (zhVoice) u.voice = zhVoice;
    
    speechSynthesis.speak(u);
  }

  function record() {
    if (!currentPhraseZh) {
        $("p-result").textContent = "Traduci prima una frase!";
        return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const out = $("p-result");
    const btn = $("p-record");
    
    if (!SR) { 
        out.textContent = "Riconoscimento vocale non disponibile: prova con Google Chrome."; 
        return; 
    }
    
    if (recognizer) { 
        recognizer.stop(); 
        return; 
    }

    recognizer = new SR();
    recognizer.lang = "zh-CN"; 
    recognizer.maxAlternatives = 5; 
    
    btn.classList.add("recording"); 
    btn.innerHTML = "🎤 Ascolto in corso…";
    out.style.color = "var(--text-main)";
    out.textContent = "Ti ascolto! Pronuncia la frase...";

    recognizer.onresult = async e => {
      const alts = [...e.results[0]].map(a => norm(a.transcript));
      const heard = alts[0];
      const target = norm(currentPhraseZh);

      if (alts.includes(target) || heard === target) {
        out.style.color = "#1f8a70"; 
        
        out.innerHTML = `
          <div style="animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <img src="happy-kitty.gif" alt="Bravo!" style="height: 120px; display: block; margin: 0 auto 10px auto;">
            ✅ <strong>Perfetto!</strong> Hai un'ottima pronuncia.
          </div>
        `;
        btn.innerHTML = "✨ Ottimo!";
      } else {
        out.style.color = "var(--primary)"; 
        out.innerHTML = `❌ <strong>Quasi!</strong> Analizzo quello che ho sentito...`;
        
        const resultFr = await fetchTranslation(heard, 'zh-CN', 'it');
        const resultPy = await fetchTranslation(heard, 'zh-CN', 'zh-CN');
        
        const hFr = resultFr ? resultFr.text : "Sconosciuto";
        const hPy = resultPy ? resultPy.pinyin : "";
        
        out.innerHTML = `
          <div style="animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <img src="sad-kitty.gif" alt="Ops!" style="height: 110px; display: block; margin: 0 auto 10px auto;">
            ❌ <strong>Quasi!</strong> Ho sentito:<br>
            <div style="background: var(--card-bg); border: 2px solid var(--border-soft); border-radius: 12px; padding: 12px; margin: 12px auto; max-width: 400px; box-shadow: 0 4px 0 var(--border-soft);">
              <span style="font-size:1.6rem; color:var(--text-main); font-family:var(--serif); font-weight:bold;">${heard}</span><br>
              <span style="color:var(--primary-dark); font-weight:bold;">${hPy}</span> <span style="opacity:0.5; margin: 0 4px;">•</span> <span style="color:var(--text-muted);">${hFr}</span>
            </div>
            Ascolta bene il modello e riprova!
          </div>
        `;
      }
    };

    recognizer.onerror = e => { 
        out.style.color = "var(--primary)";
        out.textContent = e.error === "not-allowed" ? "Devi autorizzare il microfono!" : `Errore: ${e.error}`; 
    };
    
    recognizer.onend = () => { 
        recognizer = null; 
        btn.classList.remove("recording"); 
        if (btn.innerHTML !== "✨ Ottimo!") {
            btn.innerHTML = "🎤 Riprova"; 
        } else {
            setTimeout(() => { btn.innerHTML = "🎤 Parlo"; }, 2000);
        }
    };
    
    recognizer.start();
  }

  function init() {
    $("p-btn-translate").addEventListener("click", handleTranslate);
    
    $("p-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleTranslate();
    });
    
    $("p-listen").addEventListener("click", listen);
    $("p-record").addEventListener("click", record);

    if ("speechSynthesis" in window) speechSynthesis.getVoices();
  }
  
  return { init };
})();