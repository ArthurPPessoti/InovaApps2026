import assert from "node:assert/strict";
import test from "node:test";
import type { ChurnPrediction } from "../../churn/types.ts";
import { buildGlobalSysConnectionOptions } from "./clientOptions.ts";

function prediction(subjectId: string, plan: string): ChurnPrediction {
  return {
    subjectId,
    segment: "Tecnologia",
    plan,
    monthlyRevenue: 1_000,
    probability: 0.1,
    probabilityBand: "LOW",
    expectedMonthlyRevenueAtRisk: 100,
    dataCoverage: 1,
    topFactors: [],
    evidence: {
      usage: { current: 80, average3m: 80, change3m: 0, unit: "%" },
      service: {
        slaCurrent: 95,
        slaAverage3m: 95,
        slaChange3m: 0,
        openTickets: 0,
        criticalTickets: 0,
        reopenedTickets: 0,
        resolutionHours: 1,
        formalComplaints: 0,
      },
      relationship: {
        latestNps: 9,
        npsClassification: "Promotor",
        monthsSinceNps: 0,
        meetingsPlanned: 1,
        meetingsCompleted: 1,
      },
      financial: { paymentDelayDays: 0, monthlyRevenue: 1_000 },
    },
  };
}

test("transforma contratos ativos da GlobalSys em opções de conexão", () => {
  const options = buildGlobalSysConnectionOptions([
    prediction("C010", "Enterprise"),
    prediction("C002", "Avançado"),
  ]);

  assert.deepEqual(options, [
    {
      id: "C002",
      companyId: "C002",
      name: "Plano Avançado",
      companyName: "Cliente C002",
      displayName: "Plano Avançado · Cliente C002",
    },
    {
      id: "C010",
      companyId: "C010",
      name: "Plano Enterprise",
      companyName: "Cliente C010",
      displayName: "Plano Enterprise · Cliente C010",
    },
  ]);
});
