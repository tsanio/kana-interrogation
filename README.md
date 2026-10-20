# KANA — The Interrogation

A browser-based hiragana learning game built with plain HTML, CSS, and JavaScript.

**[Play the game](https://tsanio.github.io/kana-interrogation/)**

## Run locally

Serve this repository folder with any static web server, for example `python -m http.server 8000`, then open `http://localhost:8000`. You can also open `index.html` directly. No npm installation or build step is needed.

## How it works

- Choose the reading with mouse, touch, or keys 1–3. The daily goal is user-selected (1–46 kana), each with five credited spaced correct recalls and at least three consecutive correct recalls of that character. There is no fixed answer-count ending or mistake limit. Mistakes cause cartoon damage and relearning.
- Today's selected targets and their progress persist across pauses, reloads, and retries. The session stops when all five are completed; re-entering the game shows the same completed daily result. The goal can be raised or reduced from the briefing, and increased after completion using Study more today, without losing recall history. A new browser-local calendar day uses the saved goal size, continuing unfinished learning before introducing new kana. Once all kana are introduced, known kana become daily consolidation targets.
- Actual non-target kana questions are interleaved about every third prompt and to fill spacing gaps, with due reviews preferred in those mixed slots. They record long-term practice but do not count toward the selected target goal. If all kana in the file are targets, the mix necessarily uses that full target set. `practice.js` retains per-kana learning and review intervals across many days, with migration from the old v1 history. Long-term review successes expand the interval, while mistakes restart short relearning. `daily.js` adds today's focused learning steps (2–5 intervening questions or short timed delays) and daily progress. Early filler practice does not earn recall credit unless it is a genuinely due scheduled review.
- A new story card requires eight credited recalls of the same kana, on at least three different browser-local dates, with a current per-kana streak of three correct credited recalls. A kana can earn only one card. Ordinary answer streaks and quick repeated taps cannot unlock cards. Previous story cards are retained.
- `kana-room04-daily-v1` stores daily targets, counters, and per-kana card progress. `kana-room04-practice-v2` stores the long-term schedule, and `kana-room04-memories-v1` stores the story collection. Progress is browser-local. The exponential decay score is a scheduling heuristic, not a measured forgetting curve.
- A correct answer automatically plays its bundled Japanese pronunciation clip. The Sound toggle controls pronunciation and game effects. `game.js` controls the interface, `story.js` contains the story, and `audio.js` synthesizes the answer cues, slap, groan, card reveal, and daily completion sound.

Pronunciation files in `audio/` are Japanese Google Translate TTS clips retrieved 2026-10-20. Isolated ハ and ヘ are used for the ha/he syllables to avoid particle readings. The object particle を is pronounced /o/ and labeled `wo` in the quiz to distinguish it from お.

The character art is original inline SVG. Fonts load from Google Fonts with local fallbacks. The quiz, sound effects, and pronunciation clips do not need an external API at runtime.

## Deployment

GitHub Pages publishes the root of the `main` branch. The `.nojekyll` file keeps the site as plain static assets. Push changes to `main` to publish updates. All asset links are relative so the game works at its repository subpath.

## Saved progress

Practice history, daily goals, and story cards are stored only in each visitor's browser localStorage. They are not uploaded to this repository or synchronized between devices. Progress from a different hosting domain stays on that domain and does not automatically transfer to GitHub Pages.
