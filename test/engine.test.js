import assert from "node:assert/strict";
import test from "node:test";

import { boardString, byName, stackString } from "../src/engine.js";
import { compileScenario, SCENARIOS, SEGMENTS } from "../src/scenarios.js";
import { GOLDEN } from "./golden.js";

const narrations = (step) => [step.title, step.note];

test("every [[n]] in a narration names an entry on that step's stack", () => {
  for (const { id } of SCENARIOS)
    for (const step of compileScenario(id))
      for (const text of narrations(step))
        for (const [, ref] of text.matchAll(/\[\[(\d+)\]\]/g))
          assert.ok(
            step.state.stack.some((e) => e.id === Number(ref)),
            `${id} "${step.title}": [[${ref}]] is not on the stack`,
          );
});

// A segment's summary is shown on every one of its steps.
test("every [[label]] in a narration names a Wave", () => {
  for (const { id } of SCENARIOS)
    for (const step of compileScenario(id)) {
      for (const text of [...narrations(step), SEGMENTS[step.segment].summary])
        for (const [, ref] of text.matchAll(/\[\[(\D[^\]]*)\]\]/g))
          assert.ok(byName(step.state, ref), `${id} "${step.title}": [[${ref}]] is not a Wave`);
    }
});

for (const { id } of SCENARIOS) {
  test(id, () => {
    const got = compileScenario(id);
    const want = GOLDEN[id];

    assert.equal(got.length, want.length, "step count");
    got.forEach((step, i) => {
      assert.equal(step.title.replaceAll(/\[\[|\]\]/g, ""), want[i].title, `step ${i} title`);
      assert.equal(boardString(step.state), want[i].board, `step ${i} board`);
      assert.equal(stackString(step.state), want[i].stack, `step ${i} stack`);
    });
  });
}
