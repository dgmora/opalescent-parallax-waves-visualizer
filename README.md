# Opalescent Parallax Waves Visualizer

**Public visualization:** https://dgmora.github.io/opalescent-parallax-waves-visualizer/

An interactive visualizer for the **Parallax Wave + Opalescence** stack interactions in Magic: The Gathering.

The goal is to make the multi-Wave sequences easier to follow by showing, for every step:

- each Parallax Wave and its remaining fade counters;
- which Waves are currently exiled and by which Wave;
- the stack from top to bottom;
- persistent action IDs that stay attached to the same activation/trigger;
- color-coded arrows between the source and target Waves;
- several distinct lines from the same initial position.

## Scenarios

The visualizer has three lines. The first starts from the real three-Wave
position and forks twice, once for each player's decision, into four endings.
Where the line forks, the branches take the place of the Next button, and the
URL records the branches taken (`#twin-vs-solo/solo-passes/twin-resets/12`):

```
Opening: seven steps to the key position, T2 → S on top of the stack
├─ Solo lets T2 → S resolve
│   ├─ Twin resets T2           The safe line: Twin resets in response to S→T2
│   │                           and returns S, preserving the two-Wave position.
│   └─ Twin passes, gets greedy Twin fails to reset, T2 is stranded, and the
│                               position collapses toward a 1v1.
└─ Twin sets the trap: T2 → T2  Drops the pending T2→S below T2's own return
    │                           trigger and turns it into a permanent exile.
    ├─ Solo resets S            The exile lands on a card that is already gone,
    │                           and the position loops back.
    └─ Solo counter-attacks     S is exiled for good, and leaving hands T1 back
                                to Twin at five counters.
```

The other two are the same rules with one Wave on each side — Kazz's `K` against
Zakk's `Z` — which is the position the first line passes through once a Wave has
exiled itself. Step 15 of the safe line links straight into them:

- **Duel — the permanent exile backfires**  
  `Z` stacks `Z→K` first and `Z→Z` on top, so its leave trigger resolves before the exile does. While `Z` is away Zakk can answer nothing, and Kazz plays the same trick on the permanent that cannot reset. Both Waves come back at five; that permanent never does.

- **Duel — trading exiles down to the last counter**  
  Kazz on two counters, Zakk on three, trading exiles until both are at one. Zakk spends the last counter on a reset; Kazz resets in response, comes back at five, and spends the refill on exiling Zakk's Wave for good.

## How a scenario is written

Scenarios are not drawn by hand. Each step says what a player *did*, and the
engine in `src/engine.js` works out the board and the stack from there.

```js
{ play: act("B", "B"),
  say: { title: "8. Twin resets T2 correctly",
         note: "Twin responds to [[6]] with [[8]]. [[4]] and [[6]] are still pending." } }
```

A step is a headline and one explanation, shown under the board. `[[6]]` in
either renders as the numbered pill of stack entry 6, in
that entry's colour — the same pill shown in the stack list and on the arrow
that draws it. Prose can name an ability instead of describing it. The entry has
to be on the stack at that step; `npm test` fails otherwise.

There are three things a step can play:

```js
upkeep("solo")     // that player's permanents get their fading trigger
act("B", "C")      // B removes a fade counter to exile C; goes on the stack
resolve            // resolve the top of the stack
```

A step plays one of those and nothing more, so nothing ever happens off-screen
between two pictures. Two shorthands stand in for the parts that need no
commentary: `unwind` runs out the rest of the stack, one step per resolution,
and `auto` writes the narration from what the resolution did.

```js
{ play: resolve, say: auto },
{ play: unwind },
```

Scenarios are built from named segments, so the shared opening lives in one
place and the branches stay easy to compare:

```js
segments: ["twin-vs-solo", "twin-trap", "solo-resets"]
```

Each segment carries a `label` and a `summary`. Scenarios that open with the
same segment are one line and share a tab; where their segment lists diverge,
the page stops and offers the next segments by label, and the summary shown is
the one for the segment on screen.
A scenario can also name its own starting board with `setup:`, which is how the
duel lines put one Wave against one, and any step can offer a `fork:` to another
scenario — a link under the narration, for when the position on screen is better
understood somewhere simpler.

## What the engine models

Every permanent is a game object with an identity. When one is exiled and
returned it comes back as a *new* object, so an ability still pointing at the
old one does nothing when it resolves. Exile remembers which object did it, and
a leave trigger returns whatever that same object had exiled — which is why a
Wave exiled by a Wave that has already gone never comes back.

The card an exiled Wave sits under says which case it is in:

- `EXILED` — it exiled itself, and its own trigger will return it;
- `EXILED BY T2` — T2 can still return it;
- `EXILED FOREVER` — the T2 that exiled it is gone, and nothing will return it;
- `SACRIFICED` — fading ran out of counters and took the Wave, which returns what it was holding.

The engine has no idea what a Parallax Wave is. It knows about counters, a
cost, a targeted exile, and a leave trigger, all described in one `CARDS` entry.

## Running and testing

The page is plain HTML and ES modules, so it needs to be served rather than
opened from disk — the same way GitHub Pages serves it:

```sh
npm start         # http://localhost:8000
npm test          # replays every scenario and checks it against test/golden.js
```

`test/golden.js` is the hand-authored data from before the engine existed. Two
of its boards are corrected against the rules; both corrections are explained
in the commit that adds the file.

## References

The interaction is based on the discussion around **Parallax Wave + Opalescence** and this article. Some of the scenarios are also based on conversations from the **Replenish Discord**:

https://docs.google.com/document/d/e/2PACX-1vQEW3hgl_gxjLwuTjdH5hoIZKxWNXAUotSipazs2pv60AzC0CUuwrjxjINJkgVfnKOquMgIgm6HZHc4/pub

The displayed Parallax Wave card image is loaded from Scryfall.

Magic: The Gathering, Parallax Wave, Opalescence, and related card names are property of Wizards of the Coast. This project is an unofficial rules/strategy visualization.
