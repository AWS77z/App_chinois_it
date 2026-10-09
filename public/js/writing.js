// Scrittura: Gestione modalità Scorrimento e Allenamento con mini-guida visiva.
const Writing = (() => {
  let writer = null, current = null;
  let miniWriter = null, miniTimer = null;
  const msg = document.getElementById("writing-msg");
  
 const CHARS_1500 = "的一是不了在人有我他这个们中来上大为和国地到以说时要就出会可也你对生能而子那得于着下自之年过发后作里用道行所然家种事成方多经么去法学如都同现当没动面起看定天分还进好小部其些主样理心她本前开但因只从想实日军者意无力它与长把机十民第公此已工使情明性知全三又关点正业外将两高间由问很最重并物手应战向头文体政美相见被利什二等产或新己制身果加西斯月话合回特代内信表化老给世位次度门任常先海教儿原东声提立及比员解水名真论处走义各入几口认条平系气题活尔更别打女变四神总何电数安少报才结反受目太量再感建务做接必场件计管期市直德资命山金指克许统区保至队形社便空决治展马科司五基眼书非则听白却界达光放强即像难且权思王象完设式色路记南品住告类求据程北边死张该交规万取拉格望觉术领共确传师观清今切院让识候带导争运笑飞风步改收根干造言联持组每济车亲极林服快办议往元英士证近失转夫令准布始怎呢存未远叫台单影具罗字爱击流备兵连调深商算质团集百需价花党华城石级整府离况亚请技际约示复病息究线似官火断精满支视消越器容照须九增研写称企八功吗包片史委乎查轻易早曾除农找装广显吧阿李标谈吃图念六引历首医局突专费号尽另周较注语仅考落青随选列武红响虽推势参希古众构房半节土投某案黑维革划敌致陈律足态护七兴派孩验责营星够章音跟志底站严巴例防族供效续施留讲型料终答紧黄绝奇察母京段依批群项故按河米围江织害斗双境客纪采举杀攻父苏密低朝友诉止细愿千值仍男钱破网热助倒育属坐帝限船脸职速刻乐否刚威毛状率甚独球般普怕弹校苦创假久错承印晚兰试股拿脑预谁益阳若哪微尼继送急血惊伤素药适波夜省初喜卫源食险待述陆习置居劳财环排福纳欢雷警获模充负云停木游龙树疑层冷洲冲射略范竟句室异激汉村哈策演简卡罪判担州静退既衣您宗积余痛检差富灵协角占配征修皮挥胜降阶审沉坚善妈刘读啊超免压银买皇养伊怀执副乱抗犯追帮宣佛岁航优怪香著田铁控税左右份穿艺背阵草脚概恶块顿敢守酒岛托央户烈洋哥索胡款靠评版宝座释景顾弟登货互付伯慢欧换闻危忙核暗姐介坏讨丽良序升监临亮露永呼味野架域沙掉括舰鱼杂误湾吉减编楚肯测败屋跑梦散温困剑渐封救贵枪缺楼县尚毫移娘朋画班智亦耳恩短掌恐遗固席松秘谢鲁遇康虑幸均销钟诗藏赶剧票损忽巨炮旧端探湖录叶春乡附吸予礼港雨呀板庭妇归睛饭额含顺输摇招婚脱补谓督毒油疗旅泽材灭逐莫笔亡鲜词圣择寻厂睡博勒烟授诺伦岸奥唐卖俄炸载洛健堂旁宫喝借君禁阴园谋宋避抓荣姑孙逃牙束跳顶玉镇雪午练迫爷篇肉嘴馆遍凡础洞卷坦牛宁纸诸训私庄祖丝翻暴森塔默握戏隐熟骨访弱蒙歌店鬼软典欲萨伙遭盘爸扩盖弄雄稳忘亿刺拥徒姆杨齐赛趣曲刀床迎冰虚玩析窗醒妻透购替塞努休虎扬途侵刑绿兄迅套贸毕唯谷轮库迹尤竞街促延震弃甲伟麻川申缓潜闪售灯针哲络抵朱埃抱鼓植纯夏忍页杰筑折郑贝尊吴秀混臣雅振染盛怒舞圆搞狂措姓残秋培迷诚宽宇猛摆梅毁伸摩盟末乃悲拍丁赵硬麦蒋操耶阻订彩抽赞魔纷沿喊违妹浪汇币丰蓝殊献桌啦瓦莱援译夺汽烧距裁偏符勇触课敬哭懂墙袭召罚侠厅拜巧侧韩冒债曼融惯享戴童犹乘挂奖绍厚纵障讯涉彻刊丈爆乌役描洗玛患妙镜唱烦签仙彼弗症仿倾牌陷鸟轰咱菜闭奋庆撤泪茶疾缘播朗杜奶季丹狗尾仪偷奔珠虫驻孔宜艾桥淡翼恨繁寒伴叹旦愈潮粮缩罢聚径恰挑袋灰捕徐珍幕映裂泰隔启尖忠累炎暂估泛荒偿横拒瑞忆孤鼻闹羊呆厉衡胞零穷舍码赫婆魂灾洪腿胆津俗辩胸晓劲贫仁偶辑邦恢赖圈摸仰润堆碰艇稍迟辆废净凶署壁御奉旋冬矿抬蛋晨伏吹鸡倍糊秦盾杯租骑乏隆诊奴摄丧污渡旗甘耐凭扎抢绪粗肩梁幻菲皆碎宙叔岩荡综爬荷悉蒂返井壮薄悄扫敏碍殖详迪矛霍允幅撒剩凯颗骂赏液番箱贴漫酸郎腰舒眉忧浮辛恋餐吓挺励辞艘键伍峰尺昨黎辈贯侦滑券崇扰宪绕趋慈乔阅汗枝拖墨胁插箭腊粉泥氏彭";
  
let currentIndex = 0;
  let audioTimeout = null;
  
  let customQueue = [];
  let currentWordChars = [];
  let currentWordIndex = 0;
  let currentWordPinyin = ""; 
  let currentWordIt = "";     
  
  let currentMode = "scroll"; // "scroll" o "train"

  // 1. GESTION DU GRAND DESSIN PRINCIPAL
  function renderWriter(hanzi) {
    const box = document.getElementById("writer");
    box.innerHTML = "";
    writer = HanziWriter.create(box, hanzi, {
      width: box.clientWidth, height: box.clientWidth, padding: 20,
      showCharacter: false, showOutline: true,
      strokeColor: "#333333", outlineColor: "#FFE0EB", highlightColor: "#FF4B8C",
      drawingWidth: 14, strokeAnimationSpeed: 1.2, delayBetweenStrokes: 250,
      onLoadCharDataError: function(reason) {
          msg.textContent = "Errore: impossibile caricare il tratto.";
          setTimeout(nextChar, 1000);
      }
    });
  }

  // 2. GESTION DU MINI-ANIMATEUR EN HAUT
  function playMini() {
    if (!miniWriter) return;
    miniWriter.animateCharacter({
      onComplete: () => {
        miniTimer = setTimeout(playMini, 1200);
      }
    });
  }

  function initMiniWriter(hanzi) {
    clearTimeout(miniTimer);
    const box = document.getElementById("w-mini-animator");
    box.innerHTML = "";
    miniWriter = HanziWriter.create(box, hanzi, {
      width: box.clientWidth, height: box.clientHeight, padding: 8,
      showCharacter: false, showOutline: true,
      strokeColor: "#FF4B8C", outlineColor: "#FFE0EB",
      strokeAnimationSpeed: 1.5, delayBetweenStrokes: 150
    });
    playMini();
  }

  // 3. AFFICHAGE DU MOT COMPLET SOUS LA GRILLE
  function updateWordDisplay() {
    let displayDiv = document.getElementById("w-word-display");
    
    if (!displayDiv) {
      displayDiv = document.createElement("div");
      displayDiv.id = "w-word-display";
      displayDiv.style.cssText = "text-align: center; margin: 12px 0 20px 0; min-height: 4rem; transition: all 0.3s;";
      const msgEl = document.getElementById("writing-msg");
      msgEl.parentNode.insertBefore(displayDiv, msgEl);
    }

    if (currentWordChars.length > 1) {
      let html = `<div style="font-family: var(--serif); font-size: 2.2rem; margin-bottom: 10px;">`;
      currentWordChars.forEach((char, idx) => {
        if (idx === currentWordIndex) {
          html += `<span style="color: var(--primary); border-bottom: 4px solid var(--primary); padding-bottom: 2px; margin: 0 6px; font-weight: bold;">${char}</span>`;
        } else if (idx < currentWordIndex) {
          html += `<span style="color: var(--text-muted); opacity: 0.4; margin: 0 6px;">${char}</span>`;
        } else {
          html += `<span style="color: var(--text-main); margin: 0 6px;">${char}</span>`;
        }
      });
      html += `</div>`;
      
      html += `<div style="font-size: 1.1rem; font-family: var(--sans); color: var(--text-muted); font-weight: 700; background: var(--card-bg); padding: 6px 18px; border-radius: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.04); border: 2px solid var(--border-soft);">
                  <span style="color: var(--primary-dark);">${currentWordPinyin}</span> <span style="margin: 0 6px; opacity: 0.5;">•</span> ${currentWordIt}
               </div>`;
               
      displayDiv.innerHTML = html;
      displayDiv.style.display = "block";
    } else {
      displayDiv.style.display = "none";
    }
  }

  // 4. API TRADUCTION IT -> ZH
  async function fetchTranslation(hanzi) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=it&dt=t&dt=rm&q=${encodeURIComponent(hanzi)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      const it = data[0][0][0] || "Traduzione introvabile";
      let pinyin = "Pinyin introvabile";
      if (data[0] && data[0][1]) {
         pinyin = data[0][1][3] || data[0][1][2] || pinyin;
      }
      return { pinyin: pinyin.toLowerCase(), it: it };
    } catch (error) {
      return { pinyin: "?", it: "?" };
    }
  }

  async function fetchHanziFromItalian(word) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=zh-CN&dt=t&q=${encodeURIComponent(word)}`;
      const response = await fetch(url);
      const data = await response.json();
      return data[0][0][0]; 
    } catch (error) {
      console.error("Errore di traduzione IT verso ZH:", error);
      return null;
    }
  }

  function speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN'; 
      utterance.rate = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('ZH') || v.lang.includes('cmn'));
      if (zhVoice) utterance.voice = zhVoice;
      window.speechSynthesis.speak(utterance);
    }
  }

  // 5. CHARGEMENT D'UN CARACTÈRE UNIQUE
  async function loadCustomCharacter(hanzi, autoStartQuiz = false) {
    if (!hanzi) return;

    document.getElementById("w-pinyin").textContent = "...";
    document.getElementById("w-meaning").textContent = "Traduzione...";
    
    renderWriter(hanzi);
    initMiniWriter(hanzi);
    current = { hanzi: hanzi };

    const translation = await fetchTranslation(hanzi);
    current.pinyin = translation.pinyin;
    current.it = translation.it;
    
    document.getElementById("w-pinyin").textContent = translation.pinyin;
    document.getElementById("w-meaning").textContent = translation.it;

    if (audioTimeout) clearTimeout(audioTimeout);
    audioTimeout = setTimeout(() => speak(hanzi), 1500);

    if (autoStartQuiz) {
      setTimeout(quiz, 300);
    } else {
      msg.textContent = "Clicca su « Traccio » per iniziare.";
    }
  }

  // 6. GESTION DE LA SUITE (Modes Scroll ou Train)
  function nextChar() {
    if (customQueue.length > 0) {
      // Continue le mot en cours
      currentWordIndex++; 
      updateWordDisplay(); 
      loadCustomCharacter(customQueue.shift(), true);
    } else {
      // Le mot est fini.
      if (currentMode === "train") {
        // MODE ENTRAÎNEMENT : On boucle sur la même séquence !
        if (currentWordChars.length > 1) {
            customQueue = [...currentWordChars];
            currentWordIndex = 0;
            updateWordDisplay();
            loadCustomCharacter(customQueue.shift(), true);
        } else {
            loadCustomCharacter(CHARS_1500[currentIndex], true);
        }
      } else {
        // MODE DÉFILEMENT : On passe au suivant.
        currentWordChars = [];
        updateWordDisplay();
        currentIndex++;
        if (currentIndex >= CHARS_1500.length) currentIndex = 0;
        loadCustomCharacter(CHARS_1500[currentIndex], true);
      }
    }
  }

  function quiz() {
    if (!writer) return;
    msg.textContent = "Traccia il primo tratto.";
    writer.quiz({
      onCorrectStroke: d => { 
        msg.textContent = `Bene! Mancano ${d.strokesRemaining} tratto(i).`; 
      },
      onMistake: d => { 
        msg.textContent = `Non proprio: verifica l'ordine e la direzione.`; 
      },
      onComplete: d => { 
        if (customQueue.length > 0) {
            msg.textContent = `Bravo! Passiamo al carattere successivo...`; 
        } else if (currentMode === "train") {
            msg.textContent = `Bravo! Ricominciamo l'allenamento in 1 sec...`; 
        } else {
            msg.textContent = `Bravo! Passiamo al successivo in 1 sec...`; 
        }
        setTimeout(nextChar, 1000);
      }
    });
  }

  function animate() {
    if (!writer) return;
    writer.cancelQuiz();
    msg.textContent = "Guarda l'ordine e il senso dei tratti.";
    writer.animateCharacter();
  }

  function toggleCharList() {
    const listDiv = document.getElementById("full-char-list");
    if (listDiv.style.display === "none") {
      listDiv.style.display = "flex";
      if (listDiv.innerHTML === "") {
        for (let i = 0; i < CHARS_1500.length; i++) {
          const ch = CHARS_1500[i];
          const btn = document.createElement("button");
          btn.className = "char-btn";
          btn.textContent = ch;
          
          btn.addEventListener("click", () => {
            currentIndex = i; 
            customQueue = []; 
            currentWordChars = []; 
            currentWordPinyin = "";
            currentWordIt = "";
            updateWordDisplay();
            
            loadCustomCharacter(ch, false);
            listDiv.style.display = "none"; 
            document.getElementById("w-search").value = "";
          });
          listDiv.appendChild(btn);
        }
      }
    } else {
      listDiv.style.display = "none";
    }
  }

  async function handleSearch() {
    const val = document.getElementById("w-search").value.trim();
    if (val.length === 0) return;

    document.getElementById("full-char-list").style.display = "none";
    customQueue = []; 
    currentWordChars = []; 
    currentWordPinyin = "";
    currentWordIt = "";
    updateWordDisplay();
    
    const isChinese = /[\u4e00-\u9fa5]/.test(val);

    if (isChinese) {
      const chars = val.match(/[\u4e00-\u9fa5]/g);
      if (chars && chars.length > 0) {
        if (chars.length > 1) {
            const fullTrans = await fetchTranslation(val);
            currentWordPinyin = fullTrans.pinyin;
            currentWordIt = fullTrans.it;
        }

        currentWordChars = [...chars];
        currentWordIndex = 0;
        customQueue = [...chars]; 
        
        const firstChar = customQueue.shift();
        if (customQueue.length === 0) {
            const idx = CHARS_1500.indexOf(firstChar);
            if (idx !== -1) currentIndex = idx;
        }
        
        updateWordDisplay();
        loadCustomCharacter(firstChar, false);
      }
    } else {
      document.getElementById("w-pinyin").textContent = "...";
      document.getElementById("w-meaning").textContent = "Traduzione...";
      
      const translatedWord = await fetchHanziFromItalian(val);
      
      if (translatedWord) {
        const chars = translatedWord.match(/[\u4e00-\u9fa5]/g);
        if (chars && chars.length > 0) {
          if (chars.length > 1) {
              const fullTrans = await fetchTranslation(translatedWord);
              currentWordPinyin = fullTrans.pinyin;
              currentWordIt = val.charAt(0).toUpperCase() + val.slice(1);
          }

          currentWordChars = [...chars];
          currentWordIndex = 0;
          customQueue = [...chars]; 
          
          const firstChar = customQueue.shift(); 
          
          updateWordDisplay();
          msg.textContent = `Traccia il primo carattere di: ${translatedWord}`;
          loadCustomCharacter(firstChar, false);
        } else {
          document.getElementById("w-meaning").textContent = "Caratteri introvabili";
          document.getElementById("w-pinyin").textContent = "";
        }
      } else {
        document.getElementById("w-meaning").textContent = "Parola introvabile";
        document.getElementById("w-pinyin").textContent = "";
      }
    }
    document.getElementById("w-search").value = ""; 
  }

  // 7. INITIALISATION ET CHANGEMENT DE MODE
  function setMode(mode) {
    currentMode = mode;
    if (mode === "scroll") {
       document.getElementById("w-mode-scroll").classList.add("primary");
       document.getElementById("w-mode-train").classList.remove("primary");
    } else {
       document.getElementById("w-mode-train").classList.add("primary");
       document.getElementById("w-mode-scroll").classList.remove("primary");
    }
  }

  function init() {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();

    updateWordDisplay();

    document.getElementById("w-quiz").addEventListener("click", quiz);
    document.getElementById("w-animate").addEventListener("click", animate);
    document.getElementById("w-clear").addEventListener("click", () => loadCustomCharacter(current.hanzi, true));
    
    document.getElementById("w-listen").addEventListener("click", () => {
        if (current && current.hanzi) speak(current.hanzi);
    });
    
    document.getElementById("w-btn-list").addEventListener("click", toggleCharList);
    document.getElementById("w-btn-search").addEventListener("click", handleSearch);
    
    document.getElementById("w-search").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSearch();
    });

    document.getElementById("w-mode-scroll").addEventListener("click", () => setMode("scroll"));
    document.getElementById("w-mode-train").addEventListener("click", () => setMode("train"));

    setMode("scroll");
    currentIndex = 0;
    loadCustomCharacter(CHARS_1500[currentIndex], false);
  }
  
  return { init };
})();