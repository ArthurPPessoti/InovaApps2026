import { ChartLineUp, CurrencyCircleDollar, MagicWand } from "@phosphor-icons/react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { formatCurrency } from "../components/StatusUI";
import { type RiskValuePoint, forecastBase, preservedRevenue, revenueForecast, riskValuePoints } from "./forecast";
import type { AdaptiveAnalysisResult } from "./types";

const bandColor: Record<RiskValuePoint["band"], string> = {
  CRITICAL: "#ff6b78",
  HIGH: "#ff6b78",
  ATTENTION: "#ffba49",
  LOW: "#00f3ff",
  INSUFFICIENT: "#8593ae",
};

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}: {formatCurrency(item.value)}</span>)}
    </div>
  );
}

function BubbleTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RiskValuePoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="chart-tooltip">
      <strong>{point.name}</strong>
      <span>Risco: {point.risco}</span>
      <span>{formatCurrency(point.valor)}/mês</span>
    </div>
  );
}

export function AdaptiveForecast({ result }: { result: AdaptiveAnalysisResult }) {
  const [recovery, setRecovery] = useState(50);
  const objective = result.config.objective;
  const base = forecastBase(result.entities, objective.horizonDays);
  const points = revenueForecast(base, recovery / 100);
  const bubbles = riskValuePoints(result.entities);
  const preserved = preservedRevenue(base, recovery / 100);
  // A perda costuma ser pequena perto da receita total; a escala começa logo abaixo do pior cenário.
  const floor = Math.max(0, Math.floor((base.monthlyRevenue - base.atRisk * 1.25) / 1000) * 1000);

  if (!base.hasValue) {
    return (
      <section className="panel forecast-empty">
        <CurrencyCircleDollar size={26} />
        <div>
          <strong>Projeção financeira indisponível</strong>
          <p>A fonte não trouxe uma coluna de valor por {objective.entityLabel}. Marque a coluna de receita como “Valor financeiro” em Dados para liberar esta projeção.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="panel forecast-panel">
        <div className="panel-heading">
          <div>
            <span><ChartLineUp size={13} /> Projeção</span>
            <h2>Receita nos próximos {objective.horizonDays} dias</h2>
            <p>A receita em risco hoje é {formatCurrency(base.atRisk)} de {formatCurrency(base.monthlyRevenue)}. A curva distribui esse risco ao longo do horizonte; não é uma série temporal treinada.</p>
          </div>
          <div className="forecast-legend">
            <span><i style={{ background: "#ff6b78" }} /> Sem ação</span>
            <span><i style={{ background: "#00ff91" }} /> Com recuperação</span>
          </div>
        </div>

        <div className="predictive-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff91" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#00ff91" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} />
              <YAxis domain={[floor, "dataMax"]} axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} />
              <Tooltip content={<RevenueTooltip />} />
              <Area isAnimationActive={false} type="monotone" dataKey="comAcao" name="Com recuperação" stroke="#00ff91" strokeWidth={2.5} fill="url(#forecastSaved)" baseValue={floor} />
              <Area isAnimationActive={false} type="monotone" dataKey="semAcao" name="Sem ação" stroke="#ff6b78" strokeWidth={2.5} strokeDasharray="5 4" fill="var(--navy-950)" fillOpacity={0.9} baseValue={floor} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="forecast-simulator">
          <label htmlFor="recovery">
            <MagicWand size={16} /> Se recuperarmos <strong>{recovery}%</strong> do risco
          </label>
          <input id="recovery" type="range" min="0" max="100" step="5" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} />
          <span><small>Receita preservada</small><strong>{formatCurrency(preserved)}</strong></span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span><CurrencyCircleDollar size={13} /> Decisão</span>
            <h2>Risco × valor por {objective.entityLabel}</h2>
            <p>Quem está à direita e no alto custa mais caro e está mais perto de {objective.behavior}.</p>
          </div>
        </div>
        <div className="predictive-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 16, left: -4, bottom: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" />
              <XAxis type="number" dataKey="risco" name="Risco" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} />
              <YAxis type="number" dataKey="valor" name="Valor" axisLine={false} tickLine={false} tick={{ fill: "#8593ae", fontSize: 11 }} tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} />
              <ZAxis type="number" dataKey="valor" range={[60, 400]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<BubbleTooltip />} />
              <Scatter data={bubbles} isAnimationActive={false}>
                {bubbles.map((point) => <Cell key={point.id} fill={bandColor[point.band]} fillOpacity={0.7} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
