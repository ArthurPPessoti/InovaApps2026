import type { AnalyticsPeriod } from "./types";

export const periodOptions: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "all", label: "Todo o período" },
];

export function periodStart(period: AnalyticsPeriod) {
  if (period === "all") return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "7d") start.setDate(start.getDate() - 6);
  if (period === "30d") start.setDate(start.getDate() - 29);
  return start.toISOString();
}
