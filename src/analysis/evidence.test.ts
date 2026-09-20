import assert from "node:assert/strict";
import { test } from "node:test";
import { metricContributions, missingCoverage, reconstruction, segmentComparison } from "./evidence.ts";
import type { AdaptiveAnalysisResult, AnalysisFactor } from "./types.ts";

type Entity = AdaptiveAnalysisResult["entities"][number];

const factor = (metricId: string, contribution: number, label = metricId): AnalysisFactor => ({
  metricId, label, observedValue: 1, reference: "faixa observada", contribution,
  direction: contribution >= 0.5 ? "increases_risk" : "reduces_risk", origin: "base", observed: true,
});

const entity = (patch: Partial<Entity>): Entity => ({
  id: "c1", displayName: "Cliente 1", estimate: 0.5, estimateKind: "score", band: "ATTENTION",
  coverage: 1, factors: [], missingData: [], context: {}, recommendations: [], ...patch,
} as Entity);

test("as contribuições médias reconstroem o score médio da carteira", () => {
  const entities = [
    entity({ estimate: 0.6, factors: [factor("uso", 0.4), factor("atraso", 0.2)] }),
    entity({ estimate: 0.2, factors: [factor("uso", 0.1), factor("atraso", 0.1)] }),
  ];
  const rows = metricContributions(entities);
  const total = rows.reduce((sum, row) => sum + row.points, 0);

  // média dos scores = (0,6 + 0,2) / 2 = 0,4 -> 40 pontos
  assert.equal(Math.round(total), 40);
  assert.equal(rows[0].metricId, "uso");
  assert.equal(Math.round(rows[0].points), 25);
  assert.equal(rows[0].observedIn, 2);
});

test("a fatia de cada métrica soma um", () => {
  const rows = metricContributions([entity({ factors: [factor("a", 0.3), factor("b", 0.2)] })]);
  assert.equal(Math.round(rows.reduce((sum, row) => sum + row.share, 0) * 100), 100);
});

test("carteira vazia não inventa contribuição", () => {
  assert.deepEqual(metricContributions([]), []);
});

test("a comparação por grupo ignora quem não tem segmento", () => {
  const groups = segmentComparison([
    entity({ segment: "Varejo", estimate: 0.8, band: "HIGH" }),
    entity({ segment: "Varejo", estimate: 0.4, band: "ATTENTION" }),
    entity({ segment: "Saúde", estimate: 0.1, band: "LOW" }),
    entity({ segment: undefined, estimate: 0.99 }),
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].segment, "Varejo");
  assert.equal(groups[0].count, 2);
  assert.equal(Math.round(groups[0].average), 60);
  assert.equal(groups[0].attention, 2);
  assert.equal(groups[1].attention, 0);
});

test("os dados faltantes são contados por métrica e por fatia da carteira", () => {
  const rows = missingCoverage([
    entity({ missingData: ["NPS", "Uso"] }),
    entity({ missingData: ["NPS"] }),
    entity({ missingData: [] }),
  ]);

  assert.equal(rows[0].label, "NPS");
  assert.equal(rows[0].missing, 2);
  assert.equal(Math.round(rows[0].share * 100), 67);
  assert.equal(rows[1].missing, 1);
});

test("a decomposição completa reconstrói o score da entidade", () => {
  // Garantia auditável do método: a soma das contribuições é o próprio score.
  const complete = entity({ estimate: 0.7, factors: [factor("a", 0.5), factor("b", 0.2)] });
  assert.equal(Math.round(reconstruction(complete) * 100), 100);

  const truncated = entity({ estimate: 0.7, factors: [factor("a", 0.5)] });
  assert.ok(reconstruction(truncated) < 1);
});

test("score zero não divide por zero", () => {
  assert.equal(reconstruction(entity({ estimate: 0, factors: [] })), 1);
});
