# Word Triathlon

A static, mobile-friendly NYT-style word game mashup with 3 gated phases:

1. **7-letter Wordle clone**
2. **Spelling Bee** (uses letters derived from the Wordle solution)
3. **Connections** (unlocks only after all 16 target words are found in Spelling Bee)

## Run locally

Because this is a static site, you can open `index.html` directly or run a tiny local server:

```bash
python -m http.server 4173
```

Then visit: `http://localhost:4173`

## Configuration

Edit `GAME_CONFIG` in `script.js`:

- `wordleSolution`: exact 7-letter answer for phase 1.
- `spellingBeeCenter`: required center letter for phase 2.
- `connections`: exactly 4 categories, each with exactly 4 words.
- `acceptableWords`: full dictionary list used by Wordle and Spelling Bee validation.

### Important rules

- Wordle accepts only 7-letter words from `acceptableWords`.
- Spelling Bee letters are built from unique letters in `wordleSolution` plus `spellingBeeCenter` (up to 7 letters total).
- Spelling Bee words must:
  - be at least 4 letters,
  - include the center letter,
  - use only hive letters,
  - exist in `acceptableWords`.
- Connections tiles remain hidden/locked until their word is discovered in Spelling Bee.
- Connections phase remains locked until all 16 connection words are found.

## Files

- `index.html` — app structure and phase sections.
- `styles.css` — responsive NYT-inspired styling.
- `script.js` — game state, validation, rendering, and puzzle gating logic.
