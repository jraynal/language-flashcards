const App = (() => {
  const state = {
    words: [],
    deck: [],
    currentIndex: 0,
    seen: new Set(),
    filter: "all",

    // Applies ONLY to adjectives (type === "adj")
    adjGender: "both" // "both" | "m" | "f"
  };

  const dom = {};

  function cacheDom() {
    [
      "card", "cardWrap", "typeBadge", "frontWord",
      "backEcho", "backContent",
      "cardNum", "totalCards", "seenCount", "progressFill",
      "btnNext", "btnPrev", "btnShuffle",
      "genderBar"
    ].forEach(id => dom[id] = document.getElementById(id));

    dom.filterButtons = document.querySelectorAll(".filter-btn");
    dom.genderButtons = document.querySelectorAll(".gender-btn");
  }

  async function loadWords() {
    try {
      const res = await fetch("words.json");
      state.words = await res.json();
      initializeDeck();
    } catch {
      dom.frontWord.textContent = "Failed to load words.json";
    }
  }

  function initializeDeck() {
    const indices = state.words
      .map((_, i) => i)
      .filter(i =>
        state.filter === "all" ||
        state.words[i].type === state.filter
      );

    state.deck = shuffle(indices);
    state.currentIndex = 0;

    dom.totalCards.textContent = state.deck.length;

    if (state.deck.length) render();
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function currentWord() {
    const idx = state.deck[state.currentIndex];
    return state.words[idx];
  }

  function render() {
    const word = currentWord();
    if (!word) return;

    dom.card.classList.remove("flipped");

    renderFront(word);
    renderBack(word);

    dom.cardNum.textContent = state.currentIndex + 1;

    state.seen.add(state.deck[state.currentIndex]);
    dom.seenCount.textContent = state.seen.size;
    dom.progressFill.style.width =
      (state.seen.size / state.words.length) * 100 + "%";
  }

  function renderFront(word) {
    dom.typeBadge.textContent = word.type;
    dom.typeBadge.className = `type-badge ${word.type}`;

    dom.frontWord.textContent =
      word.type === "noun"
        ? word.en.replace(/^the\s+/i, "")
        : word.en;
  }

  function renderBack(word) {
    dom.backEcho.textContent = word.en;
    dom.backContent.innerHTML = buildBack(word);
  }

  function buildBack(word) {
    const builders = {
      noun: buildNoun,
      adj: buildAdjective,
      verb: buildPhrase,
      phrase: buildPhrase
    };
    return (builders[word.type] || buildPhrase)(word);
  }

  function translationRow(label, cls, html, speakText, speakLang) {
    const speakBtn = speakLang
      ? `<button class="speak-btn" data-text="${escapeAttr(speakText)}" data-lang="${escapeAttr(speakLang)}" title="Listen">🔊</button>`
      : "";

    return `
      <div class="translation-row">
        <div class="flag-label ${cls}">${label}</div>
        <div class="translation-text">${html}</div>
        ${speakBtn}
      </div>
    `;
  }

  function adjectiveRow(label, cls, mText, fText, speakLang) {
    if (state.adjGender === "m") {
      const html = `<div class="adj-pair"><div><span class="gl">M</span>${escapeHtml(mText)}</div></div>`;
      return translationRow(label, cls, html, mText, speakLang);
    }

    if (state.adjGender === "f") {
      const html = `<div class="adj-pair"><div><span class="gl">F</span>${escapeHtml(fText)}</div></div>`;
      return translationRow(label, cls, html, fText, speakLang);
    }

    // both: show both + provide two speak buttons (M and F) so you can actually study separately
    const html = `
      <div class="adj-pair">
        <div><span class="gl">M</span>${escapeHtml(mText)}</div>
        <div><span class="gl">F</span>${escapeHtml(fText)}</div>
      </div>
    `;

    const speakButtons = speakLang
      ? `
        <div class="adj-speak">
          <button class="speak-btn" data-text="${escapeAttr(mText)}" data-lang="${escapeAttr(speakLang)}" title="Listen (M)">🔊</button>
          <button class="speak-btn" data-text="${escapeAttr(fText)}" data-lang="${escapeAttr(speakLang)}" title="Listen (F)">🔊</button>
        </div>
      `
      : "";

    return `
      <div class="translation-row">
        <div class="flag-label ${cls}">${label}</div>
        <div class="translation-text">${html}</div>
        ${speakButtons}
      </div>
    `;
  }

  function buildNoun(w) {
    return [
      translationRow("French", "fr", `<span class="art">${escapeHtml(w.fr_art)}</span> ${escapeHtml(w.fr)}`, `${w.fr_art} ${w.fr}`, "fr-FR"),
      translationRow("Spanish", "es", `<span class="art">${escapeHtml(w.es_art)}</span> ${escapeHtml(w.es)}`, `${w.es_art} ${w.es}`, "es-ES"),
      translationRow("Italian", "it", `<span class="art">${escapeHtml(w.it_art)}</span> ${escapeHtml(w.it)}`, `${w.it_art} ${w.it}`, "it-IT"),
      translationRow("Latin", "lat", escapeHtml(w.lat || ""), "", "")
    ].join("");
  }

  function buildAdjective(w) {
    return [
      adjectiveRow("French", "fr", w.fr_m || "", w.fr_f || "", "fr-FR"),
      adjectiveRow("Spanish", "es", w.es_m || "", w.es_f || "", "es-ES"),
      adjectiveRow("Italian", "it", w.it_m || "", w.it_f || "", "it-IT"),
      translationRow("Root", "lat", escapeHtml(w.lat || ""), "", "")
    ].join("");
  }

  function buildPhrase(w) {
    return [
      translationRow("French", "fr", escapeHtml(w.fr || ""), w.fr || "", "fr-FR"),
      translationRow("Spanish", "es", escapeHtml(w.es || ""), w.es || "", "es-ES"),
      translationRow("Italian", "it", escapeHtml(w.it || ""), w.it || "", "it-IT"),
      translationRow("Latin", "lat", escapeHtml(w.lat || ""), "", "")
    ].join("");
  }

  function speak(text, lang) {
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.85;

    // Voice selection is browser-dependent; keep it simple and reliable.
    speechSynthesis.speak(u);
  }

  function bindEvents() {
    dom.cardWrap.addEventListener("click", () =>
      dom.card.classList.toggle("flipped")
    );

    dom.btnNext.addEventListener("click", e => { e.stopPropagation(); next(); });
    dom.btnPrev.addEventListener("click", e => { e.stopPropagation(); prev(); });
    dom.btnShuffle.addEventListener("click", e => { e.stopPropagation(); reshuffle(); });

    dom.filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        dom.filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        state.filter = btn.dataset.type;
        initializeDeck();
      });
    });

    // Gender toggle (affects adjectives only)
    dom.genderButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        dom.genderButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        state.adjGender = btn.dataset.gender;
        // Only re-render; deck doesn't change.
        render();
      });
    });

    // Speak buttons (delegated)
    dom.backContent.addEventListener("click", e => {
      const btn = e.target.closest(".speak-btn");
      if (!btn) return;

      e.stopPropagation();
      const text = btn.dataset.text || "";
      const lang = btn.dataset.lang || "";
      if (text && lang) speak(text, lang);
    });

    // Keyboard
    document.addEventListener("keydown", e => {
      if (e.key === " ") {
        e.preventDefault();
        dom.card.classList.toggle("flipped");
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "s" || e.key === "S") reshuffle();
    });

    // Touch swipe
    let tx = 0;
    dom.cardWrap.addEventListener("touchstart", e => {
      tx = e.changedTouches[0].screenX;
    }, { passive: true });

    dom.cardWrap.addEventListener("touchend", e => {
      const d = e.changedTouches[0].screenX - tx;
      if (Math.abs(d) > 60) (d < 0 ? next() : prev());
    }, { passive: true });
  }

  function next() {
    if (!state.deck.length) return;
    state.currentIndex = (state.currentIndex + 1) % state.deck.length;
    render();
  }

  function prev() {
    if (!state.deck.length) return;
    state.currentIndex = (state.currentIndex - 1 + state.deck.length) % state.deck.length;
    render();
  }

  function reshuffle() {
    state.deck = shuffle(state.deck);
    state.currentIndex = 0;
    if (state.deck.length) render();
  }

  // Minimal escaping to reduce injection risk (your original used innerHTML everywhere).
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(s) {
    // For attribute values used in data-*; escape quotes and ampersands.
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function init() {
    cacheDom();
    bindEvents();
    loadWords();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
