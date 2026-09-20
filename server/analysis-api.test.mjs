import test from "node:test";
import assert from "node:assert/strict";
import { analysisInternals } from "./analysis-api.mjs";

test("o perfil enviado à IA leva exemplos sintéticos, nunca o dado real", () => {
  const profile = { sheets: [{ name: "x", columns: [
    { name: "email", physicalType: "text", examples: ["a@b.com"], possiblePersonalData: true, uniqueCount: 90 },
    { name: "plano", physicalType: "text", examples: ["Enterprise"], possiblePersonalData: false, uniqueCount: 3 },
  ] }] };
  const safe = analysisInternals.maskedProfile(profile);
  assert.deepEqual(safe.sheets[0].columns[0].examples, ["contato1@exemplo.com.br"]);
  assert.deepEqual(safe.sheets[0].columns[1].examples, ["Enterprise"]);
  assert.equal(JSON.stringify(safe).includes("a@b.com"), false);
});

test("fallback assistant asks fixed configuration questions", () => {
  const turn = analysisInternals.deterministicAssistant({ profile: { warnings: [] }, messages: [], config: { objective: {} } });
  assert.equal(turn.engine, "deterministic");
  assert.ok(turn.quickReplies.length >= 2);
});

test("contact draft never reveals tracking or internal score", () => {
  const draft = analysisInternals.contactDraft({ band: "HIGH", coverage: .8, factors: [{ label: "queda de uso" }], context: {} }, { behavior: "não retornar" });
  assert.match(draft.message, /experiência/);
  assert.doesNotMatch(draft.message, /tracking|score|monitor/i);
});
