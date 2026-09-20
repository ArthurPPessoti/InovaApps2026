import type { RiskLevel } from "../../types";

export interface ProductRiskProfileInput {
  segment: string;
  plan: string;
  monthlyRevenue: number;
  slaPercent: number;
  nps: number;
  openTickets: number;
  criticalTickets: number;
  paymentDelayDays: number;
}

export interface ProductRiskProfile extends ProductRiskProfileInput {
  productId: string;
  source: "demo" | "manual";
  riskScore: number;
  riskLevel: RiskLevel;
  primarySignal: string;
  calculationVersion: "commercial-operational-v1";
  createdAt: string;
  updatedAt: string;
}

export async function saveProductRiskProfile(productId: string, input: ProductRiskProfileInput) {
  const response = await fetch(`/api/portfolio/products/${encodeURIComponent(productId)}/risk-profile`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar os dados de risco do produto.");
  return body.riskProfile as ProductRiskProfile;
}
