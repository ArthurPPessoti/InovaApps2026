import assert from "node:assert/strict";
import test from "node:test";
import { technologyTelemetryFor } from "./technologySignals.ts";
import type { ChurnPrediction } from "./types.ts";

const prediction: ChurnPrediction = {
  subjectId: "C071",
  segment: "Varejo",
  plan: "Enterprise",
  monthlyRevenue: 33881,
  probability: 0.254,
  probabilityBand: "HIGH",
  expectedMonthlyRevenueAtRisk: 8597,
  dataCoverage: 1,
  topFactors: [],
  evidence: {
    usage: { current: 76.3, average3m: 78.6, change3m: -7, unit: "%" },
    service: { slaCurrent: 75, slaAverage3m: 76.9, slaChange3m: -1.9, openTickets: 2, criticalTickets: 1, reopenedTickets: 1, resolutionHours: 18, formalComplaints: 1 },
    relationship: { latestNps: 7, npsClassification: "Neutro", monthsSinceNps: 1, meetingsPlanned: 2, meetingsCompleted: 1 },
    financial: { paymentDelayDays: 0, monthlyRevenue: 33881 },
  },
};

test("telemetria tecnológica preserva acesso e destaca uma função crítica em queda", () => {
  const telemetry = technologyTelemetryFor(prediction);
  const login = telemetry.features.find((feature) => feature.name === "Login e acesso");
  const critical = telemetry.features.find((feature) => feature.critical);

  assert.equal(telemetry.series.length, 6);
  assert.ok(login && login.change > -10);
  assert.ok(critical && critical.change <= -20);
  assert.match(telemetry.summary, /acessos continuam ativos/i);
  assert.match(telemetry.internalGuidance, /não cite dias, cliques ou monitoramento individual/i);
});
