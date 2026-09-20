import assert from "node:assert/strict";
import test from "node:test";
import { isGlobalSysClientId, selectGlobalSysAnalysis } from "./globalSysPortfolio.ts";
import type { ChurnAnalysis, ChurnPrediction, HistoricalChurn } from "./types.ts";

function prediction(subjectId: string, probability: number, monthlyRevenue: number): ChurnPrediction {
  return {
    subjectId,
    segment: "Tecnologia",
    plan: "Enterprise",
    monthlyRevenue,
    probability,
    probabilityBand: probability >= 0.5 ? "CRITICAL" : probability >= 0.25 ? "HIGH" : probability >= 0.1 ? "ATTENTION" : "LOW",
    expectedMonthlyRevenueAtRisk: monthlyRevenue * probability,
    dataCoverage: 1,
    topFactors: [],
    evidence: {
      usage: { current: 80, average3m: 82, change3m: -2, unit: "%" },
      service: { slaCurrent: 95, slaAverage3m: 95, slaChange3m: 0, openTickets: 0, criticalTickets: 0, reopenedTickets: 0, resolutionHours: 1, formalComplaints: 0 },
      relationship: { latestNps: 9, npsClassification: "Promotor", monthsSinceNps: 0, meetingsPlanned: 1, meetingsCompleted: 1 },
      financial: { paymentDelayDays: 0, monthlyRevenue },
    },
  };
}

test("reconhece somente a nomenclatura de clientes da GlobalSys", () => {
  assert.equal(isGlobalSysClientId("C001"), true);
  assert.equal(isGlobalSysClientId("c80"), true);
  assert.equal(isGlobalSysClientId("atlas-logistica"), false);
  assert.equal(isGlobalSysClientId("NexStock"), false);
});

test("remove registros externos e reconcilia os totais da carteira", () => {
  const c001 = prediction("C001", 0.5, 1_000);
  const c002 = prediction("C002", 0.05, 2_000);
  const external = prediction("atlas-logistica", 0.9, 50_000);
  const historical = [{ subjectId: "C003", monthlyRevenue: 700 }, { subjectId: "demo-cancelado", monthlyRevenue: 10_000 }]
    .map((item) => ({ ...item, segment: "Tecnologia", plan: "Enterprise", cancelledMonth: "2026-08", lastObservedMonth: "2026-07", evidenceBeforeCancellation: c001.evidence })) as HistoricalChurn[];
  const analysis = {
    predictions: [c001, c002, external],
    historicalChurn: historical,
    source: { entities: 5, activeEntities: 3, cancelledEntities: 2 },
    summary: {},
  } as ChurnAnalysis;

  const selected = selectGlobalSysAnalysis(analysis);

  assert.deepEqual(selected.predictions.map((item) => item.subjectId), ["C001", "C002"]);
  assert.deepEqual(selected.historicalChurn.map((item) => item.subjectId), ["C003"]);
  assert.equal(selected.source.entities, 3);
  assert.equal(selected.summary.totalMonthlyRevenue, 3_000);
  assert.equal(selected.summary.expectedMonthlyRevenueAtRisk, 600);
  assert.deepEqual(selected.summary.distribution, { LOW: 1, ATTENTION: 0, HIGH: 0, CRITICAL: 1 });
});
