const GAME_CONFIG = {
  // --- Configure your puzzles here ---
  wordleSolution: "retinal", // must be exactly 7 letters
  spellingBeeCenter: "a", // must be a single letter and should appear in wordleSolution
  connections: [
    {
      category: "4-Letter Words",
      color: "#f9df6d",
      words: ["rain", "rail", "real", "rate"],
    },
    {
      category: "Letter Mixes",
      color: "#a0c35a",
      words: ["alert", "alter", "later", "artel"],
    },
    {
      category: "Trail Family",
      color: "#b0c4ef",
      words: ["trail", "trial", "retail", "entail"],
    },
    {
      category: "Longer Words",
      color: "#ba81c5",
      words: ["retain", "retina", "linear", "renal"],
    },
  ],
  acceptableWords: [
    "retinal",
    "rain",
    "rail",
    "real",
    "rate",
    "alert",
    "alter",
    "later",
    "artel",
    "trail",
    "trial",
    "retail",
    "entail",
    "retain",
    "retina",
    "linear",
    "renal",
    "alien",
    "alerting",
    "tailer",
    "tailer",
    "inert",
    "learn",
    "near",
    "earl",
    "lair",
    "tear",
    "tale",
    "late",
    "renal",
  ],
};

const WORDLE_LEN = 7;
const WORDLE_GUESSES = 6;

const normalizedWords = new Set(GAME_CONFIG.acceptableWords.map((w) => normalize(w)));
const allConnectionWords = GAME_CONFIG.connections.flatMap((group) => group.words.map(normalize));

const state = {
  phase: 1,
  wordle: {
    attempts: [],
    solved: false,
  },
  bee: {
    letters: [],
    found: new Set(),
  },
  connections: {
    selected: new Set(),
    solvedCategories: new Set(),
  },
};

const elements = {
  wordleGrid: document.getElementById("wordle-grid"),
  wordleInput: document.getElementById("wordle-input"),
  wordleSubmit: document.getElementById("wordle-submit"),
  wordleMessage: document.getElementById("wordle-message"),
  wordleStatus: document.getElementById("wordle-status"),
  beeStatus: document.getElementById("bee-status"),
  beeHive: document.getElementById("bee-hive"),
  beeInput: document.getElementById("bee-input"),
  beeSubmit: document.getElementById("bee-submit"),
  beeShuffle: document.getElementById("bee-shuffle"),
  beeMessage: document.getElementById("bee-message"),
  foundWords: document.getElementById("found-words"),
  connectionsStatus: document.getElementById("connections-status"),
  connectionsGrid: document.getElementById("connections-grid"),
  connectionsSubmit: document.getElementById("connections-submit"),
  connectionsClear: document.getElementById("connections-clear"),
  connectionsMessage: document.getElementById("connections-message"),
  solvedGroups: document.getElementById("solved-groups"),
  phaseWordle: document.getElementById("phase-wordle"),
  phaseBee: document.getElementById("phase-bee"),
  phaseConnections: document.getElementById("phase-connections"),
};

function normalize(value) {
  return (value || "").toLowerCase().replace(/[^a-z]/g, "");
}

function getWordleTarget() {
  const n = normalize(GAME_CONFIG.wordleSolution);
  if (n.length !== WORDLE_LEN) {
    throw new Error("Wordle solution must be exactly 7 letters.");
  }
  return n;
}

function uniqueLetters(word) {
  return [...new Set(word.split(""))];
}

function getBeeLetters() {
  const center = normalize(GAME_CONFIG.spellingBeeCenter);
  const core = uniqueLetters(normalize(GAME_CONFIG.wordleSolution));
  if (!center || center.length !== 1) {
    throw new Error("Spelling Bee center letter must be one letter.");
  }

  const withCenter = [center, ...core.filter((l) => l !== center)];
  return withCenter.slice(0, 7);
}

function init() {
  validateConfig();
  state.bee.letters = getBeeLetters();

  renderWordle();
  renderBeeHive();
  renderConnectionsGrid();
  bindEvents();
  setPhaseUI();
}

function validateConfig() {
  const target = getWordleTarget();
  if (!normalizedWords.has(target)) {
    normalizedWords.add(target);
  }

  const categories = GAME_CONFIG.connections;
  if (categories.length !== 4) {
    throw new Error("Connections requires exactly 4 categories.");
  }

  for (const category of categories) {
    if (!category.words || category.words.length !== 4) {
      throw new Error("Each Connections category must contain exactly 4 words.");
    }
    for (const word of category.words) {
      normalizedWords.add(normalize(word));
    }
  }
}

function bindEvents() {
  elements.wordleSubmit.addEventListener("click", handleWordleSubmit);
  elements.wordleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleWordleSubmit();
  });

  elements.beeSubmit.addEventListener("click", handleBeeSubmit);
  elements.beeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleBeeSubmit();
  });
  elements.beeShuffle.addEventListener("click", () => {
    shuffleBeeLetters();
    renderBeeHive();
  });

  elements.connectionsSubmit.addEventListener("click", handleConnectionsSubmit);
  elements.connectionsClear.addEventListener("click", () => {
    state.connections.selected.clear();
    renderConnectionsGrid();
    setMessage(elements.connectionsMessage, "Selection cleared.");
  });
}

function handleWordleSubmit() {
  if (state.wordle.solved) return;

  const guess = normalize(elements.wordleInput.value);
  if (guess.length !== WORDLE_LEN) {
    setMessage(elements.wordleMessage, `Enter exactly ${WORDLE_LEN} letters.`);
    return;
  }

  if (!normalizedWords.has(guess)) {
    setMessage(elements.wordleMessage, "Not in acceptable word list.");
    return;
  }

  if (state.wordle.attempts.length >= WORDLE_GUESSES) return;

  const result = scoreWordleGuess(guess, getWordleTarget());
  state.wordle.attempts.push({ guess, result });
  elements.wordleInput.value = "";

  renderWordle();

  if (guess === getWordleTarget()) {
    state.wordle.solved = true;
    state.phase = Math.max(state.phase, 2);
    setMessage(elements.wordleMessage, "Solved! Spelling Bee unlocked.");
    setPhaseUI();
    return;
  }

  const remaining = WORDLE_GUESSES - state.wordle.attempts.length;
  if (remaining === 0) {
    setMessage(elements.wordleMessage, `Out of guesses. Answer: ${getWordleTarget().toUpperCase()}`);
    elements.wordleSubmit.disabled = true;
    elements.wordleInput.disabled = true;
  } else {
    setMessage(elements.wordleMessage, `${remaining} guesses remaining.`);
  }
}

function scoreWordleGuess(guess, target) {
  const result = Array(WORDLE_LEN).fill("absent");
  const targetChars = target.split("");
  const used = Array(WORDLE_LEN).fill(false);

  for (let i = 0; i < WORDLE_LEN; i += 1) {
    if (guess[i] === targetChars[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }

  for (let i = 0; i < WORDLE_LEN; i += 1) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < WORDLE_LEN; j += 1) {
      if (!used[j] && guess[i] === targetChars[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

function renderWordle() {
  elements.wordleGrid.innerHTML = "";
  for (let r = 0; r < WORDLE_GUESSES; r += 1) {
    const row = document.createElement("div");
    row.className = "wordle-row";
    const attempt = state.wordle.attempts[r];

    for (let c = 0; c < WORDLE_LEN; c += 1) {
      const tile = document.createElement("div");
      tile.className = "wordle-tile";
      if (attempt) {
        tile.textContent = attempt.guess[c];
        tile.classList.add(attempt.result[c]);
      }
      row.appendChild(tile);
    }

    elements.wordleGrid.appendChild(row);
  }
}

function shuffleBeeLetters() {
  const [center, ...outer] = state.bee.letters;
  for (let i = outer.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [outer[i], outer[j]] = [outer[j], outer[i]];
  }
  state.bee.letters = [center, ...outer];
}

function renderBeeHive() {
  const [center, ...outer] = state.bee.letters;
  const layout = [outer[0], outer[1], outer[2], outer[3], center, outer[4], outer[5]];

  elements.beeHive.innerHTML = "";

  layout.forEach((letter, index) => {
    const cell = document.createElement("div");
    cell.className = "bee-cell";
    if (index === 4) cell.classList.add("center");
    cell.textContent = (letter || "").toUpperCase();
    elements.beeHive.appendChild(cell);
  });
}

function handleBeeSubmit() {
  if (state.phase < 2) return;

  const word = normalize(elements.beeInput.value);
  elements.beeInput.value = "";

  if (word.length < 4) {
    setMessage(elements.beeMessage, "Word must be at least 4 letters.");
    return;
  }

  const center = state.bee.letters[0];
  if (!word.includes(center)) {
    setMessage(elements.beeMessage, `Word must include center letter "${center.toUpperCase()}".`);
    return;
  }

  const allowed = new Set(state.bee.letters);
  if (![...word].every((letter) => allowed.has(letter))) {
    setMessage(elements.beeMessage, "Word uses letters outside the hive.");
    return;
  }

  if (!normalizedWords.has(word)) {
    setMessage(elements.beeMessage, "Not in acceptable word list.");
    return;
  }

  if (state.bee.found.has(word)) {
    setMessage(elements.beeMessage, "Already found.");
    return;
  }

  state.bee.found.add(word);
  renderFoundWords();
  renderConnectionsGrid();

  if (allConnectionWords.every((w) => state.bee.found.has(w))) {
    state.phase = Math.max(state.phase, 3);
    setMessage(elements.beeMessage, "All connection words found. Connections unlocked.");
    setPhaseUI();
  } else {
    const remaining = allConnectionWords.filter((w) => !state.bee.found.has(w)).length;
    setMessage(elements.beeMessage, `Nice! ${remaining} connection words remaining.`);
  }
}

function renderFoundWords() {
  elements.foundWords.innerHTML = "";
  const found = [...state.bee.found].sort();
  for (const word of found) {
    const li = document.createElement("li");
    li.textContent = word;
    elements.foundWords.appendChild(li);
  }
}

function renderConnectionsGrid() {
  elements.connectionsGrid.innerHTML = "";

  const words = GAME_CONFIG.connections.flatMap((group) => group.words.map((word) => ({
    word: normalize(word),
    category: group.category,
    color: group.color,
  })));

  words.sort((a, b) => a.word.localeCompare(b.word));

  words.forEach((entry) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "connections-tile";
    tile.textContent = entry.word;

    const found = state.bee.found.has(entry.word);
    const solved = state.connections.solvedCategories.has(entry.category);

    if (!found) {
      tile.classList.add("locked");
      tile.disabled = true;
    }

    if (solved) {
      tile.classList.add("solved");
      tile.style.background = entry.color;
      tile.disabled = true;
    }

    if (state.connections.selected.has(entry.word)) {
      tile.classList.add("selected");
    }

    tile.addEventListener("click", () => {
      if (state.phase < 3 || solved || !found) return;
      toggleConnectionSelection(entry.word);
    });

    elements.connectionsGrid.appendChild(tile);
  });
}

function toggleConnectionSelection(word) {
  if (state.connections.selected.has(word)) {
    state.connections.selected.delete(word);
  } else {
    if (state.connections.selected.size >= 4) {
      setMessage(elements.connectionsMessage, "Select up to 4 words.");
      return;
    }
    state.connections.selected.add(word);
  }

  renderConnectionsGrid();
}

function handleConnectionsSubmit() {
  if (state.phase < 3) return;
  if (state.connections.selected.size !== 4) {
    setMessage(elements.connectionsMessage, "Pick exactly 4 words.");
    return;
  }

  const picked = [...state.connections.selected].sort();

  const matched = GAME_CONFIG.connections.find((group) => {
    if (state.connections.solvedCategories.has(group.category)) return false;
    const words = group.words.map(normalize).sort();
    return words.every((word, index) => word === picked[index]);
  });

  if (!matched) {
    setMessage(elements.connectionsMessage, "Not a valid group. Try again.");
    return;
  }

  state.connections.solvedCategories.add(matched.category);
  state.connections.selected.clear();

  const div = document.createElement("div");
  div.className = "solved-group";
  div.style.background = matched.color;
  div.innerHTML = `<strong>${matched.category}</strong><br/>${matched.words.map(normalize).join(" · ")}`;
  elements.solvedGroups.appendChild(div);

  renderConnectionsGrid();

  if (state.connections.solvedCategories.size === 4) {
    setMessage(elements.connectionsMessage, "You solved all Connections groups! 🏆");
    elements.connectionsSubmit.disabled = true;
    elements.connectionsClear.disabled = true;
    elements.connectionsStatus.textContent = "Complete";
  } else {
    const left = 4 - state.connections.solvedCategories.size;
    setMessage(elements.connectionsMessage, `Correct! ${left} groups remaining.`);
  }
}

function setPhaseUI() {
  const wordleDone = state.wordle.solved;
  const beeOpen = state.phase >= 2;
  const connectionsOpen = state.phase >= 3;

  elements.wordleStatus.textContent = wordleDone ? "Complete" : "In Progress";
  elements.beeStatus.textContent = beeOpen ? "In Progress" : "Locked";
  elements.connectionsStatus.textContent = connectionsOpen ? "In Progress" : "Locked";

  elements.phaseBee.classList.toggle("is-locked", !beeOpen);
  elements.phaseConnections.classList.toggle("is-locked", !connectionsOpen);

  elements.beeSubmit.disabled = !beeOpen;
  elements.beeShuffle.disabled = !beeOpen;
  elements.beeInput.disabled = !beeOpen;

  elements.connectionsSubmit.disabled = !connectionsOpen;
  elements.connectionsClear.disabled = !connectionsOpen;
}

function setMessage(node, text) {
  node.textContent = text;
}

init();
