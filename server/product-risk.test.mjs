import assert from "node:assert/strict";
import test from "node:test";
import { calculateProductRisk, normalizeProductRiskInput } from "./product-risk.mjs";

const healthyProfile = {
  segment: "Tecnologia",
  plan: "Enterprise",
  monthlyRevenue: 12_000,
  slaPercent: 99,
  nps: 10,
  openTickets: 0,
  criticalTickets: 0,
  paymentDelayDays: 0,
};

test("classifica risco apenas com os indicadores comerciais e operacionais explícitos", () => {
  assert.deepEqual(calculateProductRisk(healthyProfile), {
    riskScore: 0,
    riskLevel: "Baixo",
    primarySignal: "Indicadores informados dentro das faixas esperadas",
    calculationVersion: "commercial-operational-v1",
  });

  const attention = calculateProductRisk({
    ...healthyProfile,
    slaPercent: 76,
    nps: 5,
    openTickets: 6,
    criticalTickets: 2,
    paymentDelayDays: 12,
  });
  assert.equal(attention.riskLevel, "Médio");
  assert.equal(attention.riskScore, 54);
  assert.match(attention.primarySignal, /crítico/);
});

test("recusa dados incompletos ou operacionalmente inconsistentes", () => {
  assert.throws(
    () => normalizeProductRiskInput({ ...healthyProfile, segment: "" }),
    /Segmento é obrigatório/,
  );
  assert.throws(
    () => normalizeProductRiskInput({ ...healthyProfile, openTickets: 1, criticalTickets: 2 }),
    /Chamados críticos não podem superar/,
  );
});
