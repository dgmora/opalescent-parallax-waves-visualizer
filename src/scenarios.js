import { MAHAMOTI_DJINN } from "./creatures.js";
import { apply, boardString, displayName, entryText, newGame } from "./engine.js";
import { PARALLAX_WAVE } from "./parallax-wave.js";

export const SETUP = {
  players: [
    { id: "twin", name: "Twin — two-Wave side" },
    { id: "solo", name: "Solo — one-Wave side" },
  ],
  permanents: [
    { code: "A", label: "T1", color: "#45a049", card: PARALLAX_WAVE, controller: "twin" },
    { code: "B", label: "T2", color: "#4f8dff", card: PARALLAX_WAVE, controller: "twin" },
    { code: "C", label: "S", color: "#d94b4b", card: PARALLAX_WAVE, controller: "solo" },
  ],
};

// The same rules with the crowd removed: one Wave each, nothing else on the
// board, which is the position `conservative-stalemate` passes through once a
// Wave has exiled itself.
export const DUEL = {
  players: [
    { id: "kazz", name: "Kazz" },
    { id: "zakk", name: "Zakk" },
  ],
  permanents: [
    { code: "K", label: "K", color: "#d94b4b", card: PARALLAX_WAVE, controller: "kazz" },
    { code: "Z", label: "Z", color: "#4f8dff", card: PARALLAX_WAVE, controller: "zakk" },
  ],
};

// A Wave answers an exile by becoming a new object; a creature cannot. Zakk
// brings one along in the lines where the point is what a wipe takes with it.
export const DUEL_WITH_CREATURE = {
  players: DUEL.players,
  permanents: [
    ...DUEL.permanents,
    { code: "D", label: "D", color: "#c08a3e", card: MAHAMOTI_DJINN, controller: "zakk" },
  ],
};

// The same duel late in the fight, where the counters themselves are the
// position: Kazz on two, Zakk on three.
export const DUEL_ENDGAME = {
  players: DUEL.players,
  permanents: [
    { ...DUEL.permanents[0], counters: { fade: 2 } },
    { ...DUEL.permanents[1], counters: { fade: 3 } },
  ],
};

const act = (src, tgt) => ({ t: "act", src, tgt });
const upkeep = (player) => ({ t: "upkeep", player });
const resolve = { t: "resolve" };

// `unwind` is not an action: it stands for however many resolutions the rest of
// the stack takes, each one its own step. `auto` narrates a resolution from
// what it did, for the steps where that is the whole story.
const unwind = "unwind";
const auto = "auto";

// One entry is one step, and one step is one thing happening: an action, or a
// single resolution off the top of the stack. A segment's label is the choice
// it stands for where lines fork, and the tab name for the segment a line opens with.
export const SEGMENTS = {
  "twin-vs-solo": { label: "Twin vs Solo — two Waves against one",
    summary: "The real initial state: Twin controls [[T1]] and [[T2]], Solo controls [[S]]. Seven steps of threats and counter-threats build the key position, and from there each player in turn has a decision to make.",
    steps: [
    { play: upkeep("solo"),
      say: { title: "Solo's upkeep: fading trigger",
        note: "The start of the interaction. Twin controls [[T1]] and [[T2]], Solo controls [[S]], and the stack is shown TOP → BOTTOM." } },
    { play: act("C","C"),
      say: { title: "[[S]] → [[S]]",
        note: "[[S]] answers [[1]] by resetting itself, paying one counter. If [[2]] resolves cleanly, [[S]] leaves and returns fresh." } },
    { play: act("A","C"),
      say: { title: "[[T1]] → [[S]]",
        note: "[[T1]] attacks [[S]] before [[2]] can resolve, trying to exploit the reset attempt." } },
    { play: act("C","A"),
      say: { title: "[[S]] → [[T1]]",
        note: "[[S]] counter-threatens [[T1]] in response. If [[S]] leaves before [[4]] resolves, [[T1]] is exiled permanently unless [[T1]] resets first." } },
    { play: act("B","C"),
      say: { title: "[[T2]] → [[S]]",
        note: "The second opposing Wave joins the attack: [[T1]] and [[T2]] both pressure the lone [[S]]." } },
    { play: act("C","B"),
      say: { title: "[[S]] → [[T2]]",
        note: "[[S]] counter-threatens [[T2]] as well, so it now has pending threats against both [[T1]] ([[4]]) and [[T2]] ([[6]])." } },
    { play: act("B","C"),
      say: { title: "[[T2]] → [[S]] again",
        note: "[[T2]] attacks [[S]] a second time. This is the key position: A4 / B3 / C2." } },
  ] },
  "solo-passes": { label: "Solo lets T2 → S resolve",
    summary: "The simple line. Solo lets the top [[T2]]→[[S]] resolve, so [[S]] is exiled for the moment, and everything hangs on what Twin does about [[S]]→[[T2]].",
    steps: [
    { play: resolve,
      say: { title: "Solo lets [[T2]] → [[S]] resolve",
        note: "[[S]] is exiled by [[T2]], and leaving the battlefield triggers its own leave trigger, [[8]], which returns nothing because [[S]] has exiled nothing yet. Solo does not need to add anything here: [[6]] exiles [[T2]] in a moment, and [[T2]]'s leave trigger returns everything [[T2]] exiled, [[S]] included. The question is what Twin does about [[6]]." } },
  ] },
  "twin-resets": { label: "Twin resets T2",
    summary: "The safe answer. When [[S]]→[[T2]] becomes dangerous, Twin resets [[T2]] and returns [[S]], preserving the stalemate.",
    steps: [
    { play: act("B","B"),
      say: { title: "Twin resets [[T2]] correctly",
        note: "Twin responds to [[6]] with [[9]]. [[T1]] and [[T2]] must both reset or they are exiled permanently: [[4]] and [[6]] are still pending, and the [[S]] that created them has already left the battlefield — temporarily, but that is enough." } },
    { play: resolve,
      say: { title: "[[T2]] → [[T2]] resolves",
        note: "[[T2]] exiles itself and creates its leave trigger, [[10]]. Because [[S]] is exiled by [[T2]], [[10]] will return [[S]] too." } },
    { play: resolve,
      say: { title: "Return([[T2¹]]) resolves — [[T2²]] and [[S²]] return",
        note: "[[T2]] and [[S]] both return as fresh objects, in one resolution with no priority window in between. Now [[6]] targets [[T2¹]], not the newly returned [[T2²]]." } },
    { play: resolve, say: auto },
    { play: resolve, say: auto },
    { play: act("A","A"),
      say: { title: "[[T1]] resets before [[4]] can strand it",
        note: "[[4]] is still on the stack, and the [[S¹]] that made it has already left the battlefield. Nothing would return [[T1¹]] from that exile, so Twin spends a counter to leave first." } },
    { play: resolve, say: auto,
      fork: { to: "duel-permanent-exile", label: "Two Waves alone: the same fight, stripped down" } },
    { play: unwind },
    { play: null,
      say: { title: "Position stabilizes",
        note: "Every ability left on the stack pointed at an object that no longer exists. The two-Wave side preserved both Waves, and the game remains in the stalemate structure." } },
  ] },
  "twin-greedy": { label: "Twin passes and gets greedy",
    summary: "Twin fails to reset in response to [[S]]→[[T2]]. [[T2]] gets stranded and the two-Wave side collapses toward a 1v1.",
    steps: [
    { play: resolve, say: auto },
    { play: resolve,
      say: { title: "Twin gets greedy",
        note: "Twin lets [[S]]→[[T2]] resolve instead of resetting [[T2]]. This is the mistake Solo is hoping the two-Wave player makes." } },
    { play: resolve,
      say: { title: "[[T2]]'s leave trigger resolves",
        note: "[[T2¹]]'s leave trigger returns [[S²]], because [[S¹]] was exiled by [[T2¹]]. But nothing returns [[T2¹]] itself: it was exiled by [[S¹]], after [[S¹]] had already left." } },
    { play: resolve,
      say: { title: "[[T2¹]] → [[S¹]] fails",
        note: "[[T2¹]]'s ability was targeting [[S¹]], which no longer exists. The relevant remaining threat is now [[4]]." } },
    { play: act("A","A"),
      say: { title: "[[T1]] must protect itself",
        note: "[[T1]] must reset rather than allow [[4]] to strand it in exile. The two-Wave side has already lost [[T2]], and the position is collapsing to a one-Wave-vs-one-Wave fight." } },
    { play: unwind },
    { play: null,
      say: { title: "[[T1]] returns, [[T2¹]] does not",
        note: "[[T1]] reset and came back fresh, but [[T2¹]] is still gone. The two-Wave advantage has been thrown away." } },
  ] },
  "twin-trap": { label: "Twin sets the trap: T2 → T2",
    summary: "Twin resets [[T2]] before the top [[T2]]→[[S]] resolves, which drops that pending exile below [[T2]]'s own return trigger and makes it permanent. Solo has one answer.",
    steps: [
    { play: act("B","B"),
      say: { title: "Twin sets the trap: [[T2]] → [[T2]]",
        note: "This looks like [[T2]] ducking [[6]]. It is the opposite. [[7]] is [[T2]]'s own attack on [[S]], still waiting its turn, and [[8]] slips [[T2]]'s return trigger above it. One counter, and a temporary exile becomes a permanent one." } },
    { play: resolve,
      say: { title: "[[T2]] → [[T2]] resolves",
        note: "[[T2]] is gone, and [[9]] will bring it back — but [[9]] resolves first. [[9]] is the only thing that gives back what [[T2]] exiles, so by the time [[7]] takes [[S]], it has already fired. Nothing is left to return it. Solo's one job: get [[S]] off the battlefield and back as a new object before [[7]] resolves." } },
  ] },
  "solo-resets": { label: "Solo resets S",
    summary: "Solo answers the only way that works — resetting [[S]], so the exile lands on an object that no longer exists — and the line loops back to stalemate.",
    steps: [
    { play: act("C","C"),
      say: { title: "Solo resets [[S]]",
        note: "The only answer to [[7]] is to stop being the card it is aimed at, so [[S]] spends a counter to exile itself ([[10]]). Attacking would not help: [[7]] does not care what [[S]] is doing, only which object it points at." } },
    { play: resolve, say: auto },
    { play: resolve,
      say: { title: "Return([[S¹]]) resolves — [[S²]] returns",
        note: "[[S]] is back at five counters as a different object. [[7]] is now aimed at [[S¹]], which no longer exists, and so are [[5]] and [[3]]. Solo made the deadline." } },
    { play: act("A","A"),
      say: { title: "[[T1]] has to reset too",
        note: "Twin now has the same problem in reverse. [[4]] has been waiting since the opening, and the [[S¹]] that made it is gone, so nothing would bring [[T1]] back from that exile. Twin spends a counter to leave first." } },
    { play: resolve,
      say: { title: "[[T1]] → [[T1]] resolves",
        note: "With [[T2]] still away, Twin controls no Wave at all: until [[13]] and [[9]] resolve, nothing Twin owns can answer anything. [[S]] is standing there with five counters and no target — the window is real, and on a board with anything else on Twin's side it is the one that decides the game." } },
    { play: resolve, say: auto },
    { play: resolve, say: auto },
    { play: null,
      say: { title: "Back to the stalemate",
        note: "Nothing left on the stack can do anything. [[T1¹]], [[T2¹]] and [[S¹]] are all gone, replaced by the three Waves on the board, and every remaining entry names one of them. They will resolve one at a time and change nothing. Both players saw the trap, both reset, and the position is exactly where it started." } },
  ] },
  "solo-counter-attacks": { label: "Solo counter-attacks",
    summary: "Solo counter-threatens [[T1]] instead of resetting — the move that feels like an answer — and [[S]] is exiled for good. Worse, [[S]] leaving hands [[T1]] straight back to Twin at five counters.",
    steps: [
    { play: act("C","A"),
      say: { title: "Solo counter-attacks instead",
        note: "The answer that feels like an answer: [[S]] threatens [[T1]] back ([[10]]) rather than saving itself. It is active, it is aggressive, and it does nothing whatever about [[7]] — the only entry on this stack that can still take something for good." } },
    { play: resolve,
      say: { title: "[[S]] → [[T1]] resolves — and it looks like it worked",
        note: "[[T1]] is exiled, [[T2]] is still away, and Twin controls no Wave at all. This is the picture that makes the counter-attack feel right. But [[T1]] was exiled *by [[S]]*, so it comes back the moment [[S]] leaves — and [[7]] is about to make [[S]] leave." } },
    { play: resolve, say: auto },
    { play: resolve, say: auto },
    { play: resolve,
      say: { title: "[[T2¹]] → [[S¹]] resolves — [[S]] is exiled forever",
        note: "[[T2¹]] takes [[S]], and [[T2¹]] left the battlefield long ago with its return trigger already spent. Nothing on the stack and nothing on the board will bring [[S]] back." } },
    { play: resolve,
      say: { title: "[[S¹]]'s leave trigger hands [[T1¹]] back",
        note: "The last insult. [[S]] leaving returns everything [[S]] exiled, so [[T1]] comes home fresh at five. The counter-attack gave Twin its Wave back at the exact moment Solo lost its own." } },
    { play: null,
      say: { title: "Outcome",
        note: "Twin holds both Waves at five and spent nothing after the trap. [[S¹]] is gone for good, and every entry still on the stack names an object that no longer exists. One counter spent on a reset instead of a threat, and this is the stalemate." } },
  ] },
  "duel-permanent-exile": { label: "Duel — the permanent exile backfires",
    summary: "One Wave each, plus a permanent on Zakk's side that cannot reset. The simplest board where a permanent exile can be attempted, and where it backfires.",
    steps: [
    { play: null,
      say: { title: "One Wave each",
        note: "Five fade counters on each Wave, an empty stack, and one more permanent on Zakk's side. Only a Wave can answer an exile by becoming a new object; [[D]] cannot, which is what makes a board wipe mean something." } },
  ] },
  "permanent-exile-setup": { label: "Z goes for the permanent exile",
    summary: "[[Z]] goes for the permanent exile: the exile on the stack first, its own reset on top, so its return trigger fires before the exile lands.",
    steps: [
    { play: act("Z","K"),
      say: { title: "[[Z]] → [[K]]",
        note: "[[Z]] pays a counter for [[1]]. On its own this is a temporary exile: [[Z]] is still on the battlefield, so its leave trigger is still ahead of it, and that trigger returns whatever [[Z]] exiled." } },
    { play: act("Z","Z"),
      say: { title: "[[Z]] → [[Z]] on top",
        note: "The trick. [[2]] targets [[Z]] itself and sits above [[1]], so [[Z]] leaves and its leave trigger resolves before [[1]] exiles anything. [[Z]] pays two counters and will get all five back." } },
  ] },
  "counter-wipe": { label: "K wipes D while Zakk cannot answer",
    summary: "The moment that reset resolves, Zakk controls no Wave and cannot answer anything, so [[K]] plays the same trick on the one permanent that cannot reset. Both Waves come back at five; [[D]] does not come back at all.",
    steps: [
    { play: resolve,
      say: { title: "[[Z]] → [[Z]] resolves — Zakk can no longer answer anything",
        note: "[[Z]] exiles itself and creates its leave trigger, [[3]]. Until [[3]] resolves, Zakk controls no Wave: whatever Kazz puts on the stack now cannot be answered, and [[D]] cannot answer for itself at any time." } },
    { play: act("K","D"),
      say: { title: "[[K]] → [[D]]",
        note: "Kazz spends one counter per permanent that cannot reset. [[4]] is that permanent." } },
    { play: act("K","K"),
      say: { title: "[[K]] → [[K]] on top",
        note: "[[5]] does both jobs. It sits above [[4]], so [[K]] leaves before [[4]] exiles anything, and it makes [[K]] a new object, so [[1]] resolves pointing at a [[K]] that no longer exists." } },
    { play: resolve,
      say: { title: "[[K]] → [[K]] resolves",
        note: "[[K]] exiles itself and creates [[6]], which returns everything [[K]] has exiled — nothing yet, because [[4]] has not resolved." } },
    { play: resolve,
      say: { title: "Return([[K¹]]) resolves — [[K²]] returns",
        note: "[[K²]] is fresh at five counters, and [[4]] now belongs to a Wave that has left." } },
    { play: resolve,
      say: { title: "[[K¹]] → [[D]] resolves — [[D]] is gone for good",
        note: "[[D]] is exiled by [[K¹]], whose leave trigger has already resolved, and it has no trigger of its own. Nothing will ever return it." } },
    { play: resolve,
      say: { title: "Return([[Z¹]]) resolves — [[Z²]] returns",
        note: "[[Z²]] comes back fresh at five counters, one step too late to have stopped any of it." } },
    { play: unwind },
    { play: null,
      say: { title: "Both Waves back at five",
        note: "Neither Wave can be caught: each one answered by becoming a new object, and Zakk's exile resolved pointing at a [[K¹]] that no longer exists. [[D]] is the whole difference — Zakk paid two counters to leave, and leaving is what left [[D]] alone." } },
  ] },
  "duel-exile-war": { label: "Duel — trading exiles down to the last counter",
    summary: "Kazz on two counters, Zakk on three, trading exiles until both are at one. There Zakk has to let the stack resolve: spending the last counter on a reset lets Kazz reset too, come back at five, and take Zakk's Wave for good.",
    steps: [
    { play: act("Z","K"), say: { title: "[[Z]] → [[K]]", note: "" } },
    { play: act("K","Z"), say: { title: "[[K]] → [[Z]]", note: "" } },
    { play: act("Z","K"),
      say: { title: "[[Z]] → [[K]]",
        note: "One counter each, and this is where Zakk has to stop. Let the stack resolve: [[3]] puts [[K]] in exile, where it can activate nothing, and it comes back only when [[Z]] leaves. Spending the last counter now is the one thing Zakk cannot afford." } },
    { play: act("Z","Z"),
      say: { title: "[[Z]] → [[Z]] — the mistake",
        note: "Zakk spends it anyway, to protect the Wave from [[2]]. [[4]] does protect it — and it is the last thing Zakk can do all fight." } },
    { play: act("K","K"),
      say: { title: "[[K]] → [[K]] on top",
        note: "Kazz spends its last counter too, and that is the difference: [[5]] resolves first, and a Wave that leaves comes back with five." } },
    { play: resolve, say: auto },
    { play: resolve,
      say: { title: "Return([[K¹]]) resolves — [[K²]] comes back at five",
        note: "Both players are out of counters, but only one of them has a Wave that is holding any. Zakk cannot answer anything from here." } },
    { play: act("K","Z"),
      say: { title: "[[K²]] → [[Z]]",
        note: "[[7]] is a brand new exile, aimed at a Wave with nothing left to reset with." } },
    { play: act("K","K"),
      say: { title: "[[K²]] → [[K²]] on top",
        note: "The permanent exile, paid for with the refill: [[8]] takes [[K²]] away before [[7]] resolves, so [[7]] resolves with its source already gone." } },
    { play: resolve, say: auto },
    { play: resolve, say: auto },
    { play: resolve,
      say: { title: "[[K²]] → [[Z]] resolves — [[Z]] is exiled forever",
        note: "[[Z]] is exiled by [[K²]], whose leave trigger has already resolved. Nothing on the stack and nothing on the board can return it." } },
    { play: unwind },
    { play: null,
      say: { title: "Kazz refilled, Zakk did not",
        note: "A reset costs one counter and gives back five, so it is also a refill — and the player who resets second gets the refill while the other has nothing left to answer with. Letting the exchange resolve instead would have put Kazz in exile with no way to act at all." } },
  ] },
};

// Every full line through the segments, one per ending. Lines that open with
// the same segment share a board and a tab; where their segment lists diverge,
// the reader chooses.
export const SCENARIOS = [
  { id: "conservative-stalemate", segments: ["twin-vs-solo","solo-passes","twin-resets"] },
  { id: "c-tests-ab-mistake", segments: ["twin-vs-solo","solo-passes","twin-greedy"] },
  { id: "ab-tests-c-correct", segments: ["twin-vs-solo","twin-trap","solo-resets"] },
  { id: "ab-tests-c-mistake", segments: ["twin-vs-solo","twin-trap","solo-counter-attacks"] },
  { id: "duel-permanent-exile", setup: DUEL_WITH_CREATURE,
    segments: ["duel-permanent-exile","permanent-exile-setup","counter-wipe"] },
  { id: "duel-exile-war", setup: DUEL_ENDGAME, segments: ["duel-exile-war"] },
];

export const setupFor = (opening) => SCENARIOS.find((s) => s.segments[0] === opening).setup ?? SETUP;

const samePrefix = (s, prefix) => prefix.every((seg, i) => s.segments[i] === seg);

// The segments a line can continue with after `path`, in scenario order:
// one means the line carries on by itself, more means a fork.
export const nextSegments = (path) =>
  [...new Set(SCENARIOS.filter((s) => samePrefix(s, path)).map((s) => s.segments[path.length]))]
    .filter(Boolean);

// Names come back as `[[ref]]`, so a generated narration gets the same pills a
// written one does.
const naming = (s) => (o) => `[[${displayName(s, s.objects[o.id])}]]`;

// What a resolution did, in the words the stack already used for it: who left,
// who came back, and nothing at all when the board did not move.
function describe(before, after) {
  const name = naming(after);
  const left = Object.values(before.objects)
    .filter((o) => o.zone === "battlefield" && after.objects[o.id].zone !== "battlefield")
    .map(name);
  const back = Object.values(after.objects).filter((o) => !before.objects[o.id]).map(name);

  const said = [
    left.length && `${left.join(", ")} leaves the battlefield.`,
    back.length && `${back.join(", ")} returns.`,
  ].filter(Boolean);

  return {
    title: `${entryText(before, before.stack[0], name).replaceAll(">", "\u2192")} resolves`,
    note: said.join(" ") || (boardString(before) === boardString(after) ? "Nothing happens." : ""),
  };
}

export function compileScenario(id) {
  return compileSegments(SCENARIOS.find((s) => s.id === id).segments);
}

export function compileSegments(segments) {
  let state = newGame(setupFor(segments[0]));
  const steps = [];

  const advance = (segment, play, say, fork) => {
    const before = state;
    if (play) state = apply(state, play);
    steps.push({ state, segment, ...(say === auto ? describe(before, state) : say), fork });
  };

  for (const segment of segments)
    for (const { play, say, fork } of SEGMENTS[segment].steps)
      if (play === unwind) while (state.stack.length) advance(segment, resolve, auto);
      else advance(segment, play, say, fork);

  return steps;
}
