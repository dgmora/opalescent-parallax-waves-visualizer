# AGENTS.md

Guidance for coding agents working in this repository.

## Commands

```sh
npm start                                                  # serve on http://localhost:8000 (PORT overrides)
npm test                                                   # node --test test/*.test.js
node --test --test-name-pattern="conservative-stalemate" test/engine.test.js   # one scenario
```

No build step, no dependencies, no linter. The page is plain HTML plus ES modules and is published by GitHub Pages straight from the repository root, so imports must stay relative and keep their `.js` extension, and anything left in the root is shipped.

## Architecture

Six files, one direction of flow: `src/engine.js` → `src/parallax-wave.js` and `src/creatures.js` → `src/scenarios.js` → `src/ui.js` → `index.html`.

- **`src/engine.js`** — the rules core, deliberately DOM-free and card-free. `newGame(SETUP)` builds a state; `apply(state, action)` returns the next state, leaving the one it was given untouched. It owns zones, counters, the stack and the `ACTIONS` table (`upkeep`, `act`, `resolve`), and knows nothing about what any ability does. Every way off the battlefield goes through `leave`, so a sacrifice triggers leave abilities like any other departure.
- **`src/parallax-wave.js`** — the card, registered with `defineCard`, as a list of abilities: one `static` (enters with five fade counters), one `triggered: "upkeep"` (spend a fade counter, or sacrifice), one `triggered: "leave"` (return everything this object exiled), and one `activated` (pay a fade counter, exile target). Each ability carries its own `resolve` and its own stack `text`, and reaches the game only through the small API the engine hands it: `object`, `exile`, `sacrifice`, `restore`, `exiledWith`.
- **`src/creatures.js`** — Grizzly Bears and Mahamoti Djinn, registered the same way with `abilities: []`. A permanent that cannot reset is what makes a board wipe visible, so a scenario adds one only when it needs one.
- **`src/scenarios.js`** — the scenario data and the small action DSL (`act`, `upkeep`, `resolve`, plus `unwind` and `auto`). Scenarios are lists of named `SEGMENTS`, each `{ label, summary, steps }`, so branching lines share an opening: scenarios with the same first segment are one tab, and where their segment lists diverge (`nextSegments(path)` returns more than one) the UI stops and offers the branches by label. `compileSegments(path)` replays the actions through the engine and returns `[{ state, segment, title, note }]`; `compileScenario(id)` does it for one full line, which is what the tests replay.
- **`src/ui.js`** — walks the segment tree: `path` is the segments taken so far, extended automatically while there is no choice, and the URL is `#<line>/<branch taken>…/<step>`. Renders one compiled step: cards, stack list, narration, and the SVG arrow layer. One card per *object*, not per code, so a Wave that returned sits under the object it replaced, and every card, pill, stack line and arrow is keyed on `data-obj`. Arrows are drawn from measured DOM rectangles, so `drawArrows` runs inside `requestAnimationFrame` after the HTML is in place, and a resize re-renders.
- **`index.html`** — all styling and the element IDs `ui.js` writes into.

## Invariants worth knowing before editing

- **Object identity is the whole point.** An exiled permanent that returns comes back as a *new* object (`revive` marks the old one `zone: "gone"` and creates a fresh one), so an ability still pointing at the old object does nothing. `exiledBy` records which object exiled it, and a leave trigger returns only what that same object holds. Both objects stay on the board: `displayName` numbers the generations (`T2¹`, `T2²`) and the older ones render dimmed.
- **One step is one thing happening**, an action or a single resolution off the top of the stack — never a sweep, and never half of one. A return trigger brings everything back in the same step, because that is one resolution with no priority window inside it. `unwind` stands for however many resolutions the rest of the stack takes, one step each, and `auto` narrates a step from what the resolution did, for the ones where that is the whole story.
- **A title carries no step number**; `render()` numbers the steps, so inserting one does not renumber the prose.
- **`[[T2]]` in a narration is whichever object the code stands for now; `[[T2¹]]` names one generation exactly.** Use the numbered form whenever the text is about an object that has been replaced.
- **`[[n]]` in a narration is stack entry `n`**, rendered as a coloured pill by `prose()` in `ui.js`. The entry must be on the stack at that step; the first test in `test/engine.test.js` enforces it.
- **`test/golden.js` is the frozen spec**, hand-authored before the engine existed. Changing scenarios or engine behaviour means updating it in the same change, and any correction to it belongs in the commit message.
