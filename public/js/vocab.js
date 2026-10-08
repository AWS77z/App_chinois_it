// Dati: aggiungi qui le tue parole. { hanzi, pinyin, fr } (fr = significato in italiano)
const VOCAB = [
  { hanzi: "你好", pinyin: "nǐ hǎo", fr: "ciao" },
  { hanzi: "谢谢", pinyin: "xièxie", fr: "grazie" },
  { hanzi: "我", pinyin: "wǒ", fr: "io" },
  { hanzi: "你", pinyin: "nǐ", fr: "tu" },
  { hanzi: "他", pinyin: "tā", fr: "lui" },
  { hanzi: "是", pinyin: "shì", fr: "essere" },
  { hanzi: "人", pinyin: "rén", fr: "persona" },
  { hanzi: "大", pinyin: "dà", fr: "grande" },
  { hanzi: "小", pinyin: "xiǎo", fr: "piccolo" },
  { hanzi: "水", pinyin: "shuǐ", fr: "acqua" },
  { hanzi: "火", pinyin: "huǒ", fr: "fuoco" },
  { hanzi: "学习", pinyin: "xuéxí", fr: "studiare" },
  { hanzi: "中国", pinyin: "Zhōngguó", fr: "Cina" },
  { hanzi: "朋友", pinyin: "péngyou", fr: "amico" },
  { hanzi: "再见", pinyin: "zàijiàn", fr: "arrivederci" }
];

// Caratteri unici per l'area di scrittura
const CHARS = [...new Set(VOCAB.flatMap(v => [...v.hanzi]))].map(c => {
  const single = VOCAB.find(v => v.hanzi === c);
  const inWord = VOCAB.find(v => v.hanzi.includes(c));
  return { hanzi: c, pinyin: single ? single.pinyin : "", fr: single ? single.fr : `in ${inWord.hanzi} (${inWord.fr})` };
});
