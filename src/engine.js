// A tiny rules engine for permanents with counters and abilities, and the stack
// those abilities go on. DOM-free on purpose, and card-free too: what a card
// does lives in the card's own file (see parallax-wave.js) and reaches the game
// only through the small API each ability is handed when it resolves.

export const CARDS = {};

// Returns the key, so a card file can export it and whoever names that card in
// a setup imports it: the registry fills itself as a side effect of being used.
export const defineCard = (key, def) => {
  CARDS[key] = def;
  return key;
};

const abilitiesOf = (o) => CARDS[o.card].abilities;

const abilityOf = (s, entry) =>
  abilitiesOf(s.objects[entry.src]).find((a) => a.id === entry.ability);

export function newGame(setup) {
  const state = {
    objSeq: 0,
    entrySeq: 0,
    players: structuredClone(setup.players),
    objects: {},
    stack: [],
  };
  for (const spec of setup.permanents) create(state, spec);
  return state;
}

export function apply(state, action) {
  const s = structuredClone(state);
  ACTIONS[action.t](s, action);
  return s;
}

const ACTIONS = {
  upkeep(s, a) {
    for (const o of battlefield(s)) if (o.controller === a.player) trigger(s, o, "upkeep");
  },

  act(s, a) {
    const src = find(s, a.src);
    const ability = abilitiesOf(src).find((x) => x.activated);
    const { cost } = ability.activated;
    if (!(src.counters[cost] > 0)) throw new Error(`${a.src} cannot pay for ${ability.id}`);
    src.counters[cost]--;
    push(s, { ability: ability.id, src: src.id, ...(a.tgt && { tgt: find(s, a.tgt).id }) });
  },

  resolve(s) {
    const entry = s.stack[0];
    if (!entry) return;
    abilityOf(s, entry).resolve(game(s), entry);
    // Resolving can push a trigger on top, so drop this entry by identity.
    s.stack.splice(s.stack.indexOf(entry), 1);
  },
};

// Everything an ability may do to the game, so a card never reaches into the
// state shape itself.
function game(s) {
  return {
    object: (id) => s.objects[id],
    exile: (o, by) => leave(s, o, "exile", by),
    sacrifice: (o) => leave(s, o, "graveyard"),
    exiledWith: (id) => Object.values(s.objects).filter((o) => o.zone === "exile" && o.exiledBy === id),
    restore: (o) => revive(s, o),
  };
}

function trigger(s, o, event) {
  for (const a of abilitiesOf(o)) if (a.triggered === event) push(s, { ability: a.id, src: o.id });
}

function create(s, spec, fresh = false) {
  const id = `o${++s.objSeq}`;
  s.objects[id] = {
    id,
    code: spec.code,
    label: spec.label,
    color: spec.color,
    card: spec.card,
    controller: spec.controller,
    zone: "battlefield",
    // A setup can start a permanent partway through its counters; an object that
    // returns always comes back with all of them.
    counters: Object.assign(
      {},
      ...CARDS[spec.card].abilities.map((a) => a.static?.counters),
      fresh ? null : spec.counters,
    ),
    exiledBy: null,
    fresh,
  };
  return s.objects[id];
}

// Every way off the battlefield is a leave, sacrifice included, so every one of
// them triggers the same abilities.
function leave(s, o, zone, exiledBy = null) {
  o.zone = zone;
  o.exiledBy = exiledBy;
  trigger(s, o, "leave");
}

function revive(s, o) {
  o.zone = "gone";
  create(s, o, true);
}

function push(s, entry) {
  s.stack.unshift({ id: ++s.entrySeq, ...entry });
}

const battlefield = (s) => Object.values(s.objects).filter((o) => o.zone === "battlefield");

function find(s, code) {
  const o = battlefield(s).find((x) => x.code === code);
  if (!o) throw new Error(`no ${code} on the battlefield`);
  return o;
}

// The object a code currently stands for: the one on the battlefield, or the
// most recent one that has not been replaced by a return.
export function current(s, code) {
  const live = Object.values(s.objects).filter((o) => o.code === code && o.zone !== "gone");
  return live.find((o) => o.zone === "battlefield") ?? live.at(-1);
}

export const codes = (s) => [...new Set(Object.values(s.objects).map((o) => o.code))];

// Every object a code has ever stood for, oldest first, because objects are
// created in order.
export const lineage = (s, code) => Object.values(s.objects).filter((o) => o.code === code);

export const generation = (s, o) => lineage(s, o.code).indexOf(o);

const MARKS = "¹²³⁴⁵⁶⁷⁸⁹";

// A code with one object to its name needs no number. The moment a return
// makes a second one, both say which generation they are.
export const displayName = (s, o) =>
  lineage(s, o.code).length > 1 ? o.label + MARKS[generation(s, o)] : o.label;

// `T1` is whichever object the code stands for now, `T1¹` one generation
// exactly — which stays true before that generation shows its number.
export function byName(s, ref) {
  const mark = MARKS.indexOf(ref.at(-1));
  const label = mark < 0 ? ref : ref.slice(0, -1);
  const line = Object.values(s.objects).filter((o) => o.label === label);
  return mark < 0 ? current(s, line[0]?.code) : line[mark];
}

export function boardString(s) {
  return codes(s)
    .map((code) => {
      const o = current(s, code);
      if (o.zone === "battlefield")
        return `${code}${Object.values(o.counters).join("")}${o.fresh ? "!" : ""}`;
      if (o.zone === "graveyard") return `${code}†`;
      const exiler = o.exiledBy === o.id ? "" : (s.objects[o.exiledBy]?.code ?? "");
      return `${code}x${exiler}`;
    })
    .join(" ");
}

export function stackString(s) {
  return s.stack.map((e) => entryText(s, e, (o) => o.code)).join(" | ");
}

export const entryText = (s, entry, name) => abilityOf(s, entry).text(game(s), entry, name);
