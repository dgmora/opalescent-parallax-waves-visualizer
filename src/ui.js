import { byName, CARDS, codes, displayName, entryText, generation, lineage } from "./engine.js";
import { returnPending } from "./parallax-wave.js";
import { compileSegments, nextSegments, SCENARIOS, SEGMENTS } from "./scenarios.js";

const INTRO = document.getElementById("intro").textContent;
const LINES = [...new Set(SCENARIOS.map((s) => s.segments[0]))];

// Follow the line as far as it goes without a choice.
function extend(segments) {
  let next;
  while ((next = nextSegments(segments)).length === 1) segments = [...segments, next[0]];
  return segments;
}

// Where the reader is: the segments taken so far and the step within them.
// A path stops at a fork until the reader picks a branch.
let path = extend([LINES[0]]);
let stepIdx = 0;
const lastVisit = {};

const compiled = {};
const stepsOf = (segments) => (compiled[segments.join("/")] ??= compileSegments(segments));
const steps = () => stepsOf(path);

const isChoice = (segments, depth) => depth > 0 && nextSegments(segments.slice(0, depth)).length > 1;

// The fork this step ends at, if any: the branches on offer and the one taken.
function forkAt(idx) {
  const all = steps();
  const depth = path.indexOf(all[idx].segment);
  if (all[idx + 1]?.segment === all[idx].segment) return null;
  const branches = nextSegments(path.slice(0, depth + 1));
  return branches.length > 1 ? { depth, branches, taken: path[depth + 1] } : null;
}

function takeBranch(depth, segment) {
  path = extend([...path.slice(0, depth + 1), segment]);
  stepIdx += 1;
  render();
}

function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function lighten(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift) => Math.round(((n >> shift) & 255) * (1 - t) + 255 * t);
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, "0")).join("")}`;
}

// Each generation of a code is a paler shade of the first one's colour, so an
// ability still pointing at the object that left looks nothing like one from
// the object that replaced it.
const waveColor = (state, o) => lighten(o.color, 0.32 * generation(state, o));

const lineages = (state) => codes(state).map((code) => lineage(state, code));

const offBattlefield = (o) => o.zone === "exile" || o.zone === "graveyard";

function overlayText(state, o) {
  if (o.zone === "graveyard") return "SACRIFICED";
  if (!o.exiledBy || o.exiledBy === o.id) return "EXILED";
  const by = displayName(state, state.objects[o.exiledBy]);
  return returnPending(state, o.exiledBy) ? `EXILED BY ${by}` : "EXILED FOREVER";
}

function cardHtml(state, o) {
  const exiled = offBattlefield(o);
  const counters = exiled ? "" : Object.values(o.counters).join(" ");
  const card = CARDS[o.card];

  return `<div class="card-wrap${o.zone === "gone" ? " gone" : ""}" data-obj="${o.id}" style="--wave:${waveColor(state, o)}">
    <div class="card-box${exiled ? " exiled" : ""}" data-overlay="${overlayText(state, o)}">
      <img src="${card.art}" alt="${card.name}">
      <div class="token${exiled || !counters ? " hidden" : ""}">${counters}</div>
    </div>
    ${card.short ? `<div class="card-label">${card.short} ${displayName(state, o)}</div>` : ""}
  </div>`;
}

// A code's objects stack in one column, oldest at the top, so a Wave that
// returned sits under the object it replaced.
function playersHtml(state) {
  return state.players
    .map((player) => {
      const cards = lineages(state)
        .filter((line) => line[0].controller === player.id)
        .map((line) => `<div class="lineage">${line.map((o) => cardHtml(state, o)).join("")}</div>`)
        .join("");
      return `<div class="player"><h3>${player.name}</h3><div class="cards">${cards}</div></div>`;
    })
    .join("");
}

const entryColor = (state, entry) =>
  entry.ability === "fading" ? "#6b7280" : waveColor(state, state.objects[entry.src]);

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

// `[[7]]` in a narration renders as the pill of stack entry 7, `[[T1]]` or
// `[[T1¹]]` as the pill of that Wave. A pill always prints the generation it
// resolved to, so a narration and the board never disagree. All have to exist
// at that step; tests enforce it.
function prose(state, text) {
  return escapeHtml(text).replaceAll(/\[\[([^\]]+)\]\]/g, (_, ref) => {
    if (/^\d+$/.test(ref)) {
      const entry = state.stack.find((e) => e.id === Number(ref));
      return `<span class="stack-num inline" data-entry="${ref}" style="--wave:${entryColor(state, entry)}">${ref}</span>`;
    }
    const o = byName(state, ref);
    return `<span class="card-ref" data-obj="${o.id}" style="--wave:${waveColor(state, o)}">${displayName(state, o)}</span>`;
  });
}

function stackItemHtml(state, entry) {
  const text = entryText(state, entry, (o) => displayName(state, o)).replaceAll(">", "→");

  return `<li data-entry="${entry.id}" data-obj="${entry.src}" style="--wave:${entryColor(state, entry)}">
    <div class="stack-entry">
      <div class="stack-num">${entry.id}</div>
      <div class="stack-entry-text">${text}</div>
    </div>
  </li>`;
}

function makeSvgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function getCardRect(el, boardRect) {
  const r = el.getBoundingClientRect();
  return {
    left: r.left - boardRect.left,
    right: r.right - boardRect.left,
    top: r.top - boardRect.top,
    bottom: r.bottom - boardRect.top,
    width: r.width,
    height: r.height,
    cx: r.left - boardRect.left + r.width / 2,
    cy: r.top - boardRect.top + r.height / 2,
  };
}

function sidePoint(rect, side, frac = 0.5, offset = 0) {
  if (side === "left") return { x: rect.left, y: rect.top + rect.height * frac + offset };
  if (side === "right") return { x: rect.right, y: rect.top + rect.height * frac + offset };
  if (side === "top") return { x: rect.left + rect.width * frac + offset, y: rect.top };
  return { x: rect.left + rect.width * frac + offset, y: rect.bottom };
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function drawMarker(svg, x, y, n, fill) {
  const g = makeSvgEl("g");
  g.appendChild(makeSvgEl("circle", { cx: x, cy: y, r: 11.5, fill, class: "arrow-label-circle" }));
  const t = makeSvgEl("text", { x, y: y + 0.5, class: "arrow-label-text" });
  t.textContent = n;
  g.appendChild(t);
  svg.appendChild(g);
}

function appendOutlinedPath(svg, d, color, markerId, secondary = false) {
  svg.appendChild(makeSvgEl("path", { d, class: "arrow-underlay" }));
  svg.appendChild(
    makeSvgEl("path", {
      d,
      class: `arrow-line${secondary ? " secondary" : ""}`,
      stroke: color,
      "marker-end": `url(#${markerId})`,
    }),
  );
}

// Neighbouring cards: a shallow curve between their facing edges.
function drawHorizontal(svg, from, to, color, actionId, lane, reverseExists) {
  const leftToRight = from.rect.cx < to.rect.cx;

  // Opposite directions use different vertical ports, so arrowheads stay apart.
  const frac = reverseExists ? (leftToRight ? 0.4 : 0.62) : 0.5;
  const laneOffset = lane * 13;
  const signedLane = lane === 0 ? 0 : lane % 2 ? laneOffset : -laneOffset;

  const start = sidePoint(from.rect, leftToRight ? "right" : "left", frac, signedLane);
  const end = sidePoint(to.rect, leftToRight ? "left" : "right", frac, signedLane);

  const pull = Math.min(50, Math.max(22, Math.abs(end.x - start.x) * 0.35));
  const c1 = { x: start.x + (leftToRight ? pull : -pull), y: start.y };
  const c2 = { x: end.x - (leftToRight ? pull : -pull), y: end.y };

  const d = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
  appendOutlinedPath(svg, d, color, `arrowhead-${from.id}`, lane > 0);

  const lp = cubicPoint(start, c1, c2, end, lane % 2 ? 0.38 : 0.62);
  drawMarker(svg, lp.x, lp.y, actionId, color);
}

// Cards with something between them: a corridor above the row, one height per
// direction so the two never share a line.
function drawOverhead(svg, from, to, color, actionId, lane) {
  const leftToRight = from.rect.cx < to.rect.cx;
  const baseY = Math.min(from.rect.top, to.rect.top) - (leftToRight ? 24 : 50) - lane * 16;

  const start = sidePoint(from.rect, "top", leftToRight ? 0.72 : 0.28);
  const end = sidePoint(to.rect, "top", leftToRight ? 0.28 : 0.72);
  const c1 = { x: start.x + (leftToRight ? 42 : -42), y: baseY };
  const c2 = { x: end.x - (leftToRight ? 42 : -42), y: baseY };

  const d = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
  appendOutlinedPath(svg, d, color, `arrowhead-${from.id}`, lane > 0);

  const lp = cubicPoint(start, c1, c2, end, 0.5);
  drawMarker(svg, lp.x, lp.y - 2, actionId, color);
}

function drawLoop(svg, card, side, color, actionId, lane = 0) {
  const dir = side === "left" ? -1 : 1;
  const start = sidePoint(card.rect, side, 0.37);
  const end = sidePoint(card.rect, side, 0.63);
  const c1 = { x: start.x + dir * (36 + lane * 14), y: start.y - 16 };
  const c2 = { x: end.x + dir * (36 + lane * 14), y: end.y + 16 };

  const d = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
  appendOutlinedPath(svg, d, color, `arrowhead-${card.id}`, true);

  const lp = cubicPoint(start, c1, c2, end, 0.5);
  drawMarker(svg, lp.x + dir * 3, lp.y, actionId, color);
}

// The side of a card with more room next to it, for arrows that loop back on
// themselves and would otherwise run over a neighbour.
function outwardSide(card, columns) {
  const left = columns[card.col - 1];
  const right = columns[card.col + 1];
  const gapLeft = left ? card.rect.left - left[0].rect.right : Infinity;
  const gapRight = right ? right[0].rect.left - card.rect.right : Infinity;
  return gapRight >= gapLeft ? "right" : "left";
}

// One column per code, columns left to right. What an arrow needs is the column
// a card sits in: the generations inside one column share an x, so their order
// in a flat row would say nothing about what an arrow has to clear.
function measureColumns(state, boardRect) {
  const columns = lineages(state)
    .map((line) =>
      line.flatMap((o) => {
        const el = document.querySelector(`[data-obj="${o.id}"] .card-box`);
        return el ? [{ id: o.id, color: waveColor(state, o), rect: getCardRect(el, boardRect) }] : [];
      }),
    )
    .filter((line) => line.length)
    .sort((a, b) => a[0].rect.cx - b[0].rect.cx);

  columns.forEach((line, col) => line.forEach((card) => (card.col = col)));
  return columns;
}

function drawArrows(state) {
  const svg = document.getElementById("arrow-layer");
  const boardRect = document.getElementById("board-wrap").getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
  svg.innerHTML = "";

  const columns = measureColumns(state, boardRect);
  const cards = columns.flat();
  const at = (id) => cards.find((c) => c.id === id);

  const defs = makeSvgEl("defs");
  for (const card of cards) {
    const marker = makeSvgEl("marker", {
      id: `arrowhead-${card.id}`,
      markerWidth: "4.2",
      markerHeight: "4.2",
      refX: "3.8",
      refY: "2.1",
      orient: "auto",
      markerUnits: "strokeWidth",
    });
    marker.appendChild(makeSvgEl("path", { d: "M 0 0 L 4.2 2.1 L 0 4.2 z", fill: card.color }));
    defs.appendChild(marker);
  }
  svg.appendChild(defs);

  const directions = new Set(
    state.stack.filter((e) => e.tgt && e.src !== e.tgt).map((e) => `${e.src}>${e.tgt}`),
  );

  const lanes = {};
  const nextLane = (key) => (lanes[key] = (lanes[key] ?? -1) + 1);

  // An arrow is an ability pointing at its target, so only targeted abilities
  // get one. A leave trigger returns whatever its source exiled and a fading
  // trigger counts down: neither picks anything, so neither draws.
  state.stack.forEach((entry, depth) => {
    if (!entry.tgt) return;

    const from = at(entry.src);
    const to = at(entry.tgt);
    if (!from || !to) return;

    const g = makeSvgEl("g", {
      class: "arrow",
      "data-entry": entry.id,
      "data-obj": entry.src,
    });
    // Stack is newest-first, so each group goes in front of the previous one:
    // a newer arrow paints over an older one.
    svg.insertBefore(g, defs.nextSibling);

    const color = withAlpha(from.color, Math.max(0.55, 1 - depth * 0.055));

    if (to === from) {
      drawLoop(g, from, outwardSide(from, columns), color, entry.id, nextLane(`self-${from.id}`));
      return;
    }
    const lane = nextLane(`${from.id}>${to.id}`);
    if (Math.abs(from.col - to.col) > 1) drawOverhead(g, from, to, color, entry.id, lane);
    else drawHorizontal(g, from, to, color, entry.id, lane, directions.has(`${to.id}>${from.id}`));
  });
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = LINES.map(
    (line) =>
      `<button class="tab ${line === path[0] ? "active" : ""}" data-line="${line}">${SEGMENTS[line].label}</button>`,
  ).join("");
  tabs.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      [path, stepIdx] = lastVisit[btn.dataset.line] ?? [extend([btn.dataset.line]), 0];
      render();
    });
  });
}

// The branches taken to get here, once there is one.
function crumbsHtml(step) {
  const depth = path.indexOf(step.segment);
  const taken = path.slice(0, depth + 1).filter((seg, d) => d === 0 || isChoice(path, d));
  if (taken.length < 2) return "";
  return taken.map((seg) => `<span class="crumb">${SEGMENTS[seg].label}</span>`).join(`<span class="path-sep">›</span>`);
}

// At a fork, the branches stand in for the Next button.
function forkHtml(fork) {
  return fork.branches
    .map(
      (seg) =>
        `<button class="nav choice${seg === fork.taken ? " active" : ""}" data-depth="${fork.depth}" data-segment="${seg}">${SEGMENTS[seg].label} ›</button>`,
    )
    .join("");
}

document.getElementById("choices").addEventListener("click", (e) => {
  const btn = e.target.closest(".choice");
  if (btn) takeBranch(Number(btn.dataset.depth), btn.dataset.segment);
});

// URL is `#<line>/<branch taken>…/<1-based step>`: the choices made, then the
// step, so a link points at one situation without naming what needed no choice.
function readHash() {
  const tokens = decodeURIComponent(location.hash.slice(1)).split("/");
  if (!LINES.includes(tokens[0])) return;
  const n = /^\d+$/.test(tokens.at(-1)) ? Number(tokens.pop()) : 1;
  path = extend([tokens.shift()]);
  for (const token of tokens) if (nextSegments(path).includes(token)) path = extend([...path, token]);
  stepIdx = Math.min(Math.max(n, 1), steps().length) - 1;
}

function writeHash() {
  const chosen = path.filter((seg, depth) => depth === 0 || isChoice(path, depth));
  const hash = `#${[...chosen, stepIdx + 1].join("/")}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
}

function render() {
  renderTabs();
  const all = steps();
  const step = all[stepIdx];
  const state = step.state;
  lastVisit[path[0]] = [path, stepIdx];
  writeHash();

  document.getElementById("intro").innerHTML = prose(state, INTRO);
  document.getElementById("scenario-summary").innerHTML = prose(state, SEGMENTS[step.segment].summary);
  document.getElementById("path").innerHTML = crumbsHtml(step);

  document.getElementById("title").innerHTML = `${stepIdx + 1}. ${prose(state, step.title)}`;
  const note = document.getElementById("note");
  note.innerHTML = prose(state, step.note);
  note.hidden = !step.note;

  const fork = document.getElementById("fork");
  fork.innerHTML = step.fork ? `<a href="#${step.fork.to}/1">${step.fork.label} →</a>` : "";
  fork.hidden = !step.fork;
  document.getElementById("players").innerHTML = playersHtml(state);

  document.getElementById("stack").innerHTML = state.stack.length
    ? state.stack.map((entry) => stackItemHtml(state, entry)).join("")
    : `<li class="empty">empty</li>`;

  const atFork = forkAt(stepIdx);
  document.getElementById("choices").innerHTML = atFork ? forkHtml(atFork) : "";
  document.getElementById("next").hidden = Boolean(atFork);
  document.getElementById("counter").textContent = `${stepIdx + 1} / ${all.length}`;
  document.getElementById("prev").disabled = stepIdx === 0;
  document.getElementById("next").disabled = stepIdx === all.length - 1;
  document.getElementById("bar").style.width = `${(stepIdx / Math.max(1, all.length - 1)) * 100}%`;

  requestAnimationFrame(() => drawArrows(state));
}

function step(delta) {
  const idx = stepIdx + delta;
  if (idx >= 0 && idx < steps().length) stepIdx = idx;
  render();
}

function dim(rootId, selector, isHot) {
  const root = document.getElementById(rootId);
  root.classList.toggle("dimmed", Boolean(isHot));
  root.querySelectorAll(selector).forEach((el) => el.classList.toggle("hot", Boolean(isHot) && isHot(el)));
}

function hoverDimming(target, apply) {
  document.body.addEventListener("mouseover", (e) => {
    const el = e.target.closest(target);
    if (el) apply(el);
  });
  document.body.addEventListener("mouseout", (e) => {
    if (e.target.closest(target) && !e.relatedTarget?.closest?.(target)) apply(null);
  });
}

// A Wave, whether hovered on the board or as a pill in the text, keeps its own
// arrows and stack entries lit; a single stack entry only lights its own line.
hoverDimming(".card-wrap, .card-ref", (card) => {
  const isHot = card && ((el) => el.dataset.obj === card.dataset.obj);
  dim("stack", "li", isHot);
  dim("arrow-layer", ".arrow", isHot);
});

hoverDimming(".arrow, .stack-num.inline, .stack li", (entry) => {
  const isHot = entry && ((el) => el.dataset.entry === entry.dataset.entry);
  dim("stack", "li", isHot);
  dim("arrow-layer", ".arrow", isHot);
});

document.getElementById("prev").addEventListener("click", () => step(-1));
document.getElementById("next").addEventListener("click", () => step(1));
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});
window.addEventListener("resize", () => requestAnimationFrame(render));
window.addEventListener("hashchange", () => {
  readHash();
  render();
});

readHash();
render();
