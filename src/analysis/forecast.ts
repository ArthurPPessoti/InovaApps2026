import type { AdaptiveAnalysisResult } from "./types";

type Entity = AdaptiveAnalysisResult["entities"][number];

export interface ForecastPoint {
  label: string;
  semAcao: number;
  comAcao: number;
}

export interface ForecastBase {
  monthlyRevenue: number;
  atRisk: number;
  months: number;
  hasValue: boolean;
}

/**
 * Base da projeção, toda derivada do resultado real:
 * receita = soma do valor de negócio; em risco = soma de (valor × estimativa).
 */
export function forecastBase(entities: Entity[], horizonDays: number): ForecastBase {
  const withValue = entities.filter((entity) => typeof entity.businessValue === "number");
  const monthlyRevenue = withValue.reduce((sum, entity) => sum + (entity.businessValue ?? 0), 0);
  const atRisk = withValue.reduce((sum, entity) => sum + (entity.businessValue ?? 0) * entity.estimate, 0);
  return {
    monthlyRevenue,
    atRisk,
    months: Math.max(1, Math.round(horizonDays / 30)),
    hasValue: withValue.length > 0 && monthlyRevenue > 0,
  };
}

/**
 * Projeção linear: a receita em risco se materializa ao longo do horizonte.
 * Não é previsão temporal treinada; é o risco de hoje distribuído no tempo.
 */
export function revenueForecast(base: ForecastBase, recoveryRate: number): ForecastPoint[] {
  const recovery = Math.min(Math.max(recoveryRate, 0), 1);
  const points: ForecastPoint[] = [{ label: "Hoje", semAcao: base.monthlyRevenue, comAcao: base.monthlyRevenue }];
  for (let month = 1; month <= base.months; month += 1) {
    const perda = (base.atRisk * month) / base.months;
    points.push({
      label: `+${month * 30}d`,
      semAcao: Math.round(base.monthlyRevenue - perda),
      comAcao: Math.round(base.monthlyRevenue - perda * (1 - recovery)),
    });
  }
  return points;
}

export const preservedRevenue = (base: ForecastBase, recoveryRate: number) =>
  Math.round(base.atRisk * Math.min(Math.max(recoveryRate, 0), 1));

export interface RiskValuePoint {
  id: string;
  name: string;
  risco: number;
  valor: number;
  band: Entity["band"];
}

/** Bolhas risco × valor: uma por entidade que tenha valor financeiro. */
export function riskValuePoints(entities: Entity[]): RiskValuePoint[] {
  return entities
    .filter((entity) => typeof entity.businessValue === "number" && entity.band !== "INSUFFICIENT")
    .map((entity) => ({
      id: entity.id,
      name: entity.displayName,
      risco: Math.round(entity.estimate * 100),
      valor: Math.round(entity.businessValue ?? 0),
      band: entity.band,
    }));
}
