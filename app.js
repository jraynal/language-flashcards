const App = (() => {
  const state = {
    words: [],
    deck: [],
    currentIndex: 0,
    seen: new Set(),
    filter: "all"
  };

  const dom = {};

  function cacheDom() {
    [
      "card", "cardWrap", "typeBadge", "frontWord",
      "backEcho", "backContent",
      "cardNum", "totalCards", "seenCount", "progressFill",
      "btnNext", "btnPrev", "btnShuffle"
    ].forEach(id => dom[id] = document.getElementById(id));

    dom.filterButtons = document.querySelectorAll(".filter-btn");
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

  function render() {
    const word = state.words[state.deck[state.currentIndex]];
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
    return builders[word.type](word);
  }

  function buildNoun(w) {
    return [
      translationRow("French", "fr", `${w.fr_art} ${w.fr}`, "fr-FR"),
      translationRow("Spanish", "es", `${w.es_art} ${w.es}`, "es-ES"),
      translationRow("Italian", "it", `${w.it_art} ${w.it}`, "it-IT"),
      translationRow("Latin", "lat", w.lat)
    ].join("");
  }

  function buildAdjective(w) {
    return [
      translationRow("French", "fr", `${w.fr_m} / ${w.fr_f}`, "fr-FR"),
      translationRow("Spanish", "es", `${w.es_m} / ${w.es_f}`, "es-ES"),
      translationRow("Italian", "it", `${w.it_m} / ${w.it_f}`, "it-IT"),
      translationRow("Root", "lat", w.lat)
    ].join("");
  }

  function buildPhrase(w) {
    return [
      translationRow("French", "fr", w.fr, "fr-FR"),
      translationRow("Spanish", "es", w.es, "es-ES"),
      translationRow("Italian", "it", w.it, "it-IT"),
      translationRow("Latin", "lat", w.lat)
    ].join("");
  }

  function translationRow(label, cls, text, lang) {
    const speakBtn = lang
      ? `<button class="speak-btn" data-text="${text}" data-lang="${lang}">🔊</button>`
      : "";

    return `
      <div class="translation-row">
        <div class="flag-label ${cls}">${label}</div>
        <div class="translation-text">${text}</div>
        ${speakBtn}
      </div>
    `;
  }

  function speak(text, lang) {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;

    speechSynthesis.speak(utterance);
  }

  function bindEvents() {
    dom.cardWrap.addEventListener("click", () =>
      dom.card.classList.toggle("flipped")
    );

    dom.btnNext.addEventListener("click", next);
    dom.btnPrev.addEventListener("click", prev);
    dom.btnShuffle.addEventListener("click", reshuffle);

    dom.filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        dom.filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        state.filter = btn.dataset.type;
        initializeDeck();
      });
    });

    dom.backContent.addEventListener("click", e => {
      const btn = e.target.closest(".speak-btn");
      if (!btn) return;

      e.stopPropagation();
      speak(btn.dataset.text, btn.dataset.lang);
    });
  }

  function next() {
    if (!state.deck.length) return;
    state.currentIndex =
      (state.currentIndex + 1) % state.deck.length;
    render();
  }

  function prev() {
    if (!state.deck.length) return;
    state.currentIndex =
      (state.currentIndex - 1 + state.deck.length) %
      state.deck.length;
    render();
  }

  function reshuffle() {
    state.deck = shuffle(state.deck);
    state.currentIndex = 0;
    render();
  }

  function init() {
    cacheDom();
    bindEvents();
    loadWords();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
