// Migration script: adds bare adjective fields and English example phrases to words.json
// New fields added per adjective entry:
//   fr_adj_m, fr_adj_f  — bare French adjective (masc/fem)
//   es_adj_m, es_adj_f  — bare Spanish adjective (masc/fem)
//   it_adj_m, it_adj_f  — bare Italian adjective (masc/fem)
//   en_m, en_f          — English example phrases (masc/fem noun context)
// Existing *_m / *_f fields (full example phrases) are preserved unchanged.

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "words.json");
const words = JSON.parse(fs.readFileSync(filePath, "utf8"));

// Strip article + noun (first two words) to get the bare adjective.
// Handles multi-word adjectives like "bon marché" or "en retard".
const stripAdj = s => {
  const parts = s.trim().split(/\s+/);
  return parts.slice(2).join(" ") || parts[parts.length - 1];
};

// French pre-noun adjectives: the adjective comes BEFORE the noun,
// so we can't use "strip first two words". Extract by last word instead.
// These are identified by checking if strip-2 gives the noun rather than the adj.
// We identify them manually since it's a small, well-known list.
// French BANGS adjectives that precede the noun in the data:
// article[0] + adj[1] + noun[2+]
const FR_PRE_NOUN = new Set([
  "big", "small", "good", "bad", "new", "old", "beautiful",
  // "young" → "un homme jeune" (post-noun), "long" → "un voyage long" (post-noun)
]);

// Spanish pre-noun adjectives in the data:
const ES_PRE_NOUN = new Set([
  "good",  // "un buen día"
  "bad",   // "un mal día"
]);

// Italian pre-noun adjectives in the data:
const IT_PRE_NOUN = new Set([
  "big", "small", "good", "bad", "beautiful", "old",
  // "new" → "un ristorante nuovo" (post-noun in IT data)
]);

// For FR, if the adjective is pre-noun, take last word; otherwise strip first two.
// But looking at the data, "warm" (chaleureux/chaude) — chaleureux IS the last word (post-noun in fr_m),
// and chaude is also last word in fr_f. So last-word works for warm too.
// The issue is only when pre-noun adjs are NOT the last word, which never happens in this dataset
// because the noun always comes after the pre-noun adj.
// Actually re-examining: "un grand hôtel" → grand is word[1], hôtel is word[2]. strip(2) gives "hôtel".
// "un train rapide" → rapide is word[2]. strip(2) gives "rapide". ✓
// So for FR pre-noun words, we need lastWord instead of strip(2).

const lastWord = s => s.trim().split(/\s+/).pop();
const preNounAdj = s => s.trim().split(/\s+/)[1]; // article[0] + adj[1] + noun[2+]

// English example phrases: {en: [m_phrase, f_phrase]}
// Using travel-context nouns consistent with the other languages.
const EN_PHRASES = {
  "big":         ["a big hotel",          "a big city"],
  "small":       ["a small café",         "a small street"],
  "hot":         ["a hot tea",            "a hot soup"],
  "cold":        ["a cold wind",          "a cold night"],
  "good":        ["a good meal",          "a good day"],
  "bad":         ["bad weather",          "a bad idea"],
  "new":         ["a new restaurant",     "a new room"],
  "old":         ["an old bridge",        "an old church"],
  "beautiful":   ["a beautiful garden",   "a beautiful view"],
  "fast":        ["a fast train",         "a fast car"],
  "slow":        ["a slow bus",           "a slow walk"],
  "open":        ["an open shop",         "an open door"],
  "closed":      ["a closed museum",      "a closed pharmacy"],
  "clean":       ["a clean hotel",        "a clean room"],
  "dirty":       ["a dirty glass",        "a dirty street"],
  "expensive":   ["an expensive restaurant", "an expensive shop"],
  "cheap":       ["a cheap ticket",       "a cheap room"],
  "full":        ["a full bus",           "a full room"],
  "empty":       ["an empty glass",       "an empty street"],
  "heavy":       ["heavy luggage",        "a heavy suitcase"],
  "long":        ["a long journey",       "a long road"],
  "short":       ["a short trip",         "a short visit"],
  "wide":        ["a wide boulevard",     "a wide avenue"],
  "narrow":      ["a narrow passage",     "a narrow alley"],
  "near":        ["a near park",          "a near station"],
  "far":         ["a far village",        "a far beach"],
  "safe":        ["a safe neighbourhood", "a safe city"],
  "dangerous":   ["a dangerous path",     "a dangerous road"],
  "quiet":       ["a quiet hotel",        "a quiet beach"],
  "sweet":       ["a sweet cake",         "a sweet cream"],
  "sour":        ["a sour lemon",         "a sour apple"],
  "bitter":      ["a bitter coffee",      "a bitter beer"],
  "salty":       ["a salty dish",         "a salty soup"],
  "spicy":       ["a spicy dish",         "a spicy sauce"],
  "fresh":       ["fresh bread",          "a fresh salad"],
  "delicious":   ["a delicious meal",     "a delicious tart"],
  "free":        ["a free seat",          "a free table"],
  "ready":       ["a ready meal",         "a ready room"],
  "late":        ["a late train",         "a late arrival"],
  "early":       ["an early flight",      "an early hour"],
  "possible":    ["a possible choice",    "a possible option"],
  "necessary":   ["a necessary document", "a necessary booking"],
  "important":   ["an important monument","an important date"],
  "red":         ["red wine",             "a red rose"],
  "blue":        ["a blue sky",           "a blue sea"],
  "green":       ["a green park",         "a green forest"],
  "yellow":      ["a yellow sun",         "a yellow flower"],
  "white":       ["a white wall",         "white snow"],
  "black":       ["a black cat",          "a black night"],
  "happy":       ["a happy man",          "a happy woman"],
  "sad":         ["a sad boy",            "a sad girl"],
  "tired":       ["a tired traveller",    "a tired traveller"],
  "hungry":      ["a hungry man",         "a hungry woman"],
  "sick":        ["a sick passenger",     "a sick passenger"],
  "comfortable": ["a comfortable bed",    "a comfortable room"],
  "difficult":   ["a difficult path",     "a difficult language"],
  "easy":        ["an easy trip",         "an easy recipe"],
  "strong":      ["a strong coffee",      "a strong beer"],
  "deep":        ["a deep lake",          "a deep pool"],
  "soft":        ["a soft pillow",        "a soft blanket"],
  "hard":        ["a hard bed",           "a hard chair"],
  "warm":        ["a warm welcome",       "a warm day"],
  "cool":        ["a cool evening",       "a cool breeze"],
  "local":       ["a local market",       "a local beer"],
  "typical":     ["a typical dish",       "a typical house"],
  "traditional": ["a traditional costume","a traditional festival"],
  "famous":      ["a famous monument",    "a famous square"],
  "ancient":     ["an ancient temple",    "an ancient ruin"],
  "modern":      ["a modern building",    "a modern city"],
  "bright":      ["a bright sun",         "a bright light"],
  "dark":        ["a dark sky",           "a dark night"],
  "dry":         ["a dry climate",        "a dry season"],
  "young":       ["a young man",          "a young woman"],
  "round":       ["a round loaf",         "a round square"],
  "flat":        ["a flat terrain",       "a flat road"],
  "straight":    ["a straight path",      "a straight line"],
  "frozen":      ["a frozen lake",        "a frozen road"],
  "noisy":       ["a noisy bar",          "a noisy street"],
  "rich":        ["a rich neighbourhood", "a rich city"],
  "poor":        ["a poor neighbourhood", "a poor region"],
};

let migrated = 0;

const updated = words.map(w => {
  if (w.type !== "adj") return w;

  const en = w.en;
  const isFrPreNoun = FR_PRE_NOUN.has(en);
  const isEsPreNoun = ES_PRE_NOUN.has(en);
  const isItPreNoun = IT_PRE_NOUN.has(en);

  const fr_adj_m = isFrPreNoun ? preNounAdj(w.fr_m) : stripAdj(w.fr_m);
  const fr_adj_f = isFrPreNoun ? preNounAdj(w.fr_f) : stripAdj(w.fr_f);
  const es_adj_m = isEsPreNoun ? preNounAdj(w.es_m) : stripAdj(w.es_m);
  const es_adj_f = isEsPreNoun ? preNounAdj(w.es_f) : stripAdj(w.es_f);
  const it_adj_m = isItPreNoun ? preNounAdj(w.it_m) : stripAdj(w.it_m);
  const it_adj_f = isItPreNoun ? preNounAdj(w.it_f) : stripAdj(w.it_f);

  const enPhrases = EN_PHRASES[en];
  if (!enPhrases) {
    console.warn(`⚠ No English phrases defined for: "${en}"`);
  }
  const [en_m, en_f] = enPhrases ?? [`a ${en} one`, `a ${en} one`];

  migrated++;
  return { ...w, fr_adj_m, fr_adj_f, es_adj_m, es_adj_f, it_adj_m, it_adj_f, en_m, en_f };
});

fs.writeFileSync(filePath, JSON.stringify(updated, null, 4), "utf8");
console.log(`✓ Migrated ${migrated} adjectives.`);
