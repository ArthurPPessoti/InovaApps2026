import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import type { RiskLevel } from "../types";

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  return (
    <span className={`risk-badge risk-badge--${level.toLowerCase().replace("é", "e")}`}>
      <span className="risk-dot" aria-hidden="true" />
      {level}{score !== undefined ? ` · ${score}` : ""}
    </span>
  );
}

export function Variation({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={positive ? "variation variation--positive" : "variation variation--negative"}>
      {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {Math.abs(value)}%
    </span>
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
