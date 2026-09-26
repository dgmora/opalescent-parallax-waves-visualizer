import { defineCard } from "./engine.js";

// Creatures with no abilities at all, for the lines where a Wave needs
// something to exile that cannot answer by becoming a new object. Grizzly Bears
// belong to the Twin and Kazz side, Mahamoti Djinn to the Solo and Zakk side.

export const GRIZZLY_BEARS = defineCard("bears", {
  name: "Grizzly Bears",
  art: "https://cards.scryfall.io/normal/front/e/7/e7aa2b93-0a84-4318-bf2d-58164f0a846f.jpg?1783948614",
  abilities: [],
});

export const MAHAMOTI_DJINN = defineCard("djinn", {
  name: "Mahamoti Djinn",
  art: "https://cards.scryfall.io/normal/front/0/8/083f76c8-3e6d-4de5-b408-2f2394faed5c.jpg?1783948643",
  abilities: [],
});
