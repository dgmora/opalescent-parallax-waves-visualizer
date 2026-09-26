import { defineCard } from "./engine.js";

const ART =
  "https://cards.scryfall.io/normal/front/c/e/cef789e8-e4cc-4f61-bc15-debc2487777f.jpg?1783945841";

// What a return trigger from this object brings back, the object itself named
// first so the stack text reads as the card does.
const returning = (g, exilerId) =>
  g.exiledWith(exilerId).sort((a, b) => (a.id === exilerId ? -1 : b.id === exilerId ? 1 : 0));

export const PARALLAX_WAVE = defineCard("wave", {
  name: "Parallax Wave",
  short: "Wave",
  art: ART,
  abilities: [
    { static: { counters: { fade: 5 } } },

    {
      id: "fading",
      triggered: "upkeep",
      text: (g, entry, name) => `Fading(${name(g.object(entry.src))})`,
      resolve(g, entry) {
        const o = g.object(entry.src);
        if (o.zone !== "battlefield") return;
        if (o.counters.fade > 0) o.counters.fade--;
        else g.sacrifice(o);
      },
    },

    {
      id: "return",
      triggered: "leave",
      text(g, entry, name) {
        const back = returning(g, entry.src).map(name);
        const source = g.object(entry.src);
        const how = source.zone === "graveyard" ? "sacrificed" : "exiled";
        return `${name(source)} ${how} > Return ${back.length ? back.join(", ") : "nothing"}`;
      },
      resolve(g, entry) {
        for (const o of returning(g, entry.src)) g.restore(o);
      },
    },

    {
      id: "remove",
      activated: { cost: "fade", targets: true },
      text: (g, entry, name) => `${name(g.object(entry.src))}>${name(g.object(entry.tgt))}`,
      resolve(g, entry) {
        const target = g.object(entry.tgt);
        if (target?.zone === "battlefield") g.exile(target, entry.src);
      },
    },
  ],
});

// Whether the exiler can still give the card back, which is what separates a
// temporary exile from a permanent one.
export function returnPending(s, exilerId) {
  const exiler = s.objects[exilerId];
  if (!exiler) return false;
  return (
    exiler.zone === "battlefield" ||
    s.stack.some((e) => e.ability === "return" && e.src === exilerId)
  );
}
