import assert from "node:assert/strict";
import { test } from "node:test";
import { forecastBase, preservedRevenue, revenueForecast, riskValuePoints } from "./forecast.ts";
import type { AdaptiveAnalysisResult } from "./types.ts";

type Entity = AdaptiveAnalysisResult["entities"][number];

const entity = (patch: Partial<Entity>): Entity => ({
  id: "c1", displayName: "Cliente 1", estimate: 0.5, estimateKind: "score", band: "ATTENTION",
  coverage: 1, factors: [], missingData: [], context: {}, recommendations: [], ...patch,
} as Entity);

test("a base da projeção soma receita e risco só de quem tem valor", () => {
  const base = forecastBase([
    entity({ businessValue: 1000, estimate: 0.5 }),
    entity({ businessValue: 2000, estimate: 0.25 }),
    entity({ businessValue: undefined, estimate: 0.9 }),
  ], 90);

  assert.equal(base.monthlyRevenue, 3000);
  assert.equal(base.atRisk, 1000);
  assert.equal(base.months, 3);
  assert.equal(base.hasValue, true);
});

test("sem valor financeiro na fonte, a projeção se declara indisponível", () => {
  const base = forecastBase([entity({ businessValue: undefined })], 90);
  assert.equal(base.hasValue, false);
  assert.equal(base.monthlyRevenue, 0);
});

test("a curva sem ação perde todo o risco até o fim do horizonte", () => {
  const base = forecastBase([entity({ businessValue: 1000, estimate: 0.6 })], 90);
  const pontos = revenueForecast(base, 0);

  assert.deepEqual(pontos.map((p) => p.label), ["Hoje", "+30d", "+60d", "+90d"]);
  assert.equal(pontos[0].semAcao, 1000);
  assert.equal(pontos.at(-1)?.semAcao, 400);
  assert.deepEqual(pontos.map((p) => p.comAcao), pontos.map((p) => p.semAcao));
});

test("recuperar metade do risco devolve metade da perda em cada mês", () => {
  const base = forecastBase([entity({ businessValue: 1000, estimate: 0.6 })], 90);
  const pontos = revenueForecast(base, 0.5);

  assert.equal(pontos.at(-1)?.semAcao, 400);
  assert.equal(pontos.at(-1)?.comAcao, 700);
  assert.equal(preservedRevenue(base, 0.5), 300);
  assert.equal(preservedRevenue(base, 1), 600);
});

test("a taxa de recuperação fica presa entre 0 e 100%", () => {
  const base = forecastBase([entity({ businessValue: 1000, estimate: 0.6 })], 30);
  assert.equal(preservedRevenue(base, 5), 600);
  assert.equal(preservedRevenue(base, -3), 0);
});

test("as bolhas ignoram quem está sem valor ou sem dados suficientes", () => {
  const pontos = riskValuePoints([
    entity({ id: "a", businessValue: 1200, estimate: 0.82 }),
    entity({ id: "b", businessValue: undefined }),
    entity({ id: "c", businessValue: 900, band: "INSUFFICIENT" }),
  ]);

  assert.deepEqual(pontos.map((p) => p.id), ["a"]);
  assert.equal(pontos[0].risco, 82);
  assert.equal(pontos[0].valor, 1200);
});
