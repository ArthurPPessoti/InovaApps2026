import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type MetricScope,
  aggregationLabels,
  filterMetrics,
  groupBySheet,
  importanceLabels,
  riskTypeLabels,
  roleLabels,
} from "./configLabels.ts";
import type { MetricConfig } from "./types.ts";

const metric = (patch: Partial<MetricConfig>): MetricConfig => ({
  id: patch.column ?? "m", sheet: "Clientes", column: "coluna", meaning: "Coluna", role: "METRIC",
  included: true, riskType: "HIGH_IS_RISK", aggregation: "LATEST", importance: "MEDIUM",
  scale: "AUTO", missingStrategy: "EXCLUDE", confidence: 0.5, rationale: "", ...patch,
});

test("todo código interno tem rótulo em português", () => {
  const roles = ["ENTITY_ID", "TIME", "TARGET", "METRIC", "CONTEXT", "BUSINESS_VALUE", "STATUS_FILTER", "OWNER", "CONTACT", "IGNORE"] as const;
  const risks = ["HIGH_IS_RISK", "LOW_IS_RISK", "TARGET_RANGE", "BINARY_RISK", "CATEGORICAL_RISK", "TREND_RISK", "INFORMATIONAL"] as const;
  const aggregations = ["FIRST", "LATEST", "MEAN", "RECENT_MEAN", "SUM", "MIN", "MAX", "TREND"] as const;
  const importances = ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

  for (const role of roles) assert.ok(roleLabels[role] && !/[A-Z]{3}/.test(roleLabels[role]), role);
  for (const risk of risks) assert.ok(riskTypeLabels[risk] && !/_/.test(riskTypeLabels[risk]), risk);
  for (const aggregation of aggregations) assert.ok(aggregationLabels[aggregation], aggregation);
  for (const importance of importances) assert.ok(importanceLabels[importance], importance);
});

test("filterMetrics separa usadas de ignoradas", () => {
  const metrics = [metric({ column: "sla", included: true }), metric({ column: "notas", included: false })];
  const escopo = (scope: MetricScope) => filterMetrics(metrics, { scope, search: "" }).map((item) => item.column);

  assert.deepEqual(escopo("usadas"), ["sla"]);
  assert.deepEqual(escopo("ignoradas"), ["notas"]);
  assert.deepEqual(escopo("todas"), ["sla", "notas"]);
});

test("a busca ignora acento e caixa e olha coluna, significado e aba", () => {
  const metrics = [
    metric({ column: "sla_contratado", meaning: "SLA contratado" }),
    metric({ column: "reuniao", meaning: "Reunião de acompanhamento" }),
    metric({ column: "nps", sheet: "Satisfação" }),
  ];
  const buscar = (search: string) => filterMetrics(metrics, { scope: "todas", search }).map((item) => item.column);

  assert.deepEqual(buscar("SLA"), ["sla_contratado"]);
  assert.deepEqual(buscar("reuniao"), ["reuniao"]);
  assert.deepEqual(buscar("REUNIÃO"), ["reuniao"]);
  assert.deepEqual(buscar("satisfacao"), ["nps"]);
  assert.deepEqual(buscar("   "), ["sla_contratado", "reuniao", "nps"]);
});

test("groupBySheet mantém a ordem das abas, conta as usadas e ordena por uso e confiança", () => {
  const groups = groupBySheet([
    metric({ column: "a", sheet: "Clientes", included: false, confidence: 0.9 }),
    metric({ column: "b", sheet: "Clientes", included: true, confidence: 0.4 }),
    metric({ column: "c", sheet: "Dicionario", included: false, confidence: 0.3 }),
    metric({ column: "d", sheet: "Clientes", included: true, confidence: 0.8 }),
  ]);

  assert.deepEqual(groups.map((group) => group.sheet), ["Clientes", "Dicionario"]);
  assert.deepEqual(groups[0].metrics.map((item) => item.column), ["d", "b", "a"]);
  assert.equal(groups[0].usedCount, 2);
  assert.equal(groups[1].usedCount, 0);
});
