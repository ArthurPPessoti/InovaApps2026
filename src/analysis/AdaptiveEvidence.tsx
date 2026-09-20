import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";
import { metricContributions, missingCoverage, segmentComparison } from "./evidence";
import type { SegmentComparison } from "./evidence";
import type { AdaptiveAnalysisResult } from "./types";

export const bandColors: Record<string, string> = { LOW: "#00f3ff", ATTENTION: "#ffba49", HIGH: "#ff6b78", CRITICAL: "#ff3355", INSUFFICIENT: "#77849a" };
export const bandLabels: Record<string, string> = { LOW: "Baixo", ATTENTION: "Atenção", HIGH: "Alto", CRITICAL: "Crítico", INSUFFICIENT: "Dados insuficientes" };

const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const decimal = (value: number, digits = 1) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);
const axis = { fill: "#9aa7bd", fontSize: 10 };

/** O payload do tooltip do recharts vem sem tipo; estreitamos aqui uma vez só. */
const payloadOf = <T,>(item: unknown): T | undefined => (item as { payload?: T } | undefined)?.payload;
const share = (item: unknown) => payloadOf<{ share?: number }>(item)?.share ?? 0;

function Panel({ eyebrow, title, note, children, wide }: { eyebrow: string; title: string; note?: string; children: React.ReactNode; wide?: boolean }) {
  return <article className={wide ? "panel panel--wide" : "panel"}>
    <div className="panel-heading"><div><span>{eyebrow}</span><h2>{title}</h2>{note && <p>{note}</p>}</div></div>
    {children}
  </article>;
}

/**
 * Decomposição do score em pontos por métrica. É a leitura auditável do método:
 * a soma das contribuições de uma entidade é o score dela, então a média destes
 * pontos é o score médio da carteira.
 */
export function MetricContributionPanel({ result }: { result: AdaptiveAnalysisResult }) {
  const rows = useMemo(() => metricContributions(result.entities).slice(0, 8), [result.entities]);
  if (!rows.length) return null;
  const total = rows.reduce((sum, row) => sum + row.points, 0);
  const unit = result.method.selected === "weighted_score" ? "pontos de score" : "pontos de probabilidade";

  return <Panel
    eyebrow="Decomposição do resultado"
    title="O que está gerando o risco"
    note={`Média de ${unit} que cada métrica adiciona. As ${rows.length} maiores somam ${decimal(total)} dos ${decimal(result.summary.averageEstimate * 100)} do resultado médio.`}
    wide
  >
    <div className="evidence-chart evidence-chart--tall">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={168} tick={{ fill: "#d5dbea", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,.04)" }}
            contentStyle={{ background: "#0d1420", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 11 }}
            formatter={(value, _name, item) => [`${decimal(Number(value))} pontos · ${decimal(share(item) * 100)}% do resultado`, "Contribuição média"]}
          />
          <Bar dataKey="points" isAnimationActive={!reduceMotion()} radius={[0, 6, 6, 0]} fill="#00f3ff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Panel>;
}

/** Comparação por grupo: o módulo `segments`, que o motor declara e a tela ignorava. */
export function SegmentComparisonPanel({ result }: { result: AdaptiveAnalysisResult }) {
  const rows = useMemo(() => segmentComparison(result.entities), [result.entities]);
  if (rows.length < 2) return null;
  const label = result.config.objective.entityLabelPlural;

  return <Panel eyebrow="Comparação por grupo" title="Onde o risco se concentra" note={`Resultado médio por grupo, com ${label} em atenção, alto ou crítico.`}>
    <div className="evidence-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis dataKey="segment" tick={axis} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={axis} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,.04)" }}
            contentStyle={{ background: "#0d1420", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 11 }}
            formatter={(value, _name, item) => { const row = payloadOf<SegmentComparison>(item); return [`${decimal(Number(value))} de resultado · ${row?.attention ?? 0} de ${row?.count ?? 0} em atenção`, row?.segment ?? ""]; }}
          />
          <Bar dataKey="average" isAnimationActive={!reduceMotion()} radius={[6, 6, 2, 2]}>
            {rows.map((row) => <Cell key={row.segment} fill={row.average >= 55 ? bandColors.HIGH : row.average >= 30 ? bandColors.ATTENTION : bandColors.LOW} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Panel>;
}

/** Quais métricas faltam. Peso ausente é peso redistribuído, então isto explica a cobertura. */
export function MissingDataPanel({ result }: { result: AdaptiveAnalysisResult }) {
  const rows = useMemo(() => missingCoverage(result.entities).slice(0, 6), [result.entities]);
  if (!rows.length) return null;
  const label = result.config.objective.entityLabelPlural;

  return <Panel
    eyebrow="Cobertura da configuração"
    title="O que faltou nos dados"
    note={`Quando uma métrica não tem valor, o peso dela é redistribuído entre as demais. Cobertura média de ${decimal(result.summary.averageCoverage * 100)}%.`}
  >
    <div className="evidence-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fill: "#d5dbea", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,.04)" }}
            contentStyle={{ background: "#0d1420", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 11 }}
            formatter={(value, _name, item) => [`${Number(value)} ${label} · ${decimal(share(item) * 100)}% da carteira`, "Sem valor observado"]}
          />
          <Bar dataKey="missing" isAnimationActive={!reduceMotion()} radius={[0, 6, 6, 0]} fill="#ffba49" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Panel>;
}

/**
 * Qualidade da probabilidade: o módulo `calibration`. O motor só aprova
 * probabilidade quando o Brier do teste bate o baseline, e esse era o número
 * que ficava preso no JSON.
 */
export function ModelQualityPanel({ result }: { result: AdaptiveAnalysisResult }) {
  const quality = result.method.quality;
  if (!quality || quality.brierScore == null || quality.baselineBrier == null) return null;
  const rows = [
    { name: "Baseline", value: quality.baselineBrier, fill: "#77849a" },
    { name: "Modelo", value: quality.brierScore, fill: "#00ff91" },
  ];
  const gain = (1 - quality.brierScore / quality.baselineBrier) * 100;

  return <Panel
    eyebrow="Qualidade da probabilidade"
    title="O modelo bate o palpite médio"
    note={`Erro de Brier no teste temporal, onde menor é melhor. O modelo erra ${decimal(gain)}% menos que prever a taxa média para todos.`}
  >
    <div className="evidence-chart evidence-chart--short">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={70} tick={{ fill: "#d5dbea", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,.04)" }}
            contentStyle={{ background: "#0d1420", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 11 }}
            formatter={(value) => [decimal(Number(value), 4), "Erro de Brier"]}
          />
          <Bar dataKey="value" isAnimationActive={!reduceMotion()} radius={[0, 6, 6, 0]}>
            {rows.map((row) => <Cell key={row.name} fill={row.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <dl className="evidence-stats">
      <div><dt>Separação (AUC)</dt><dd>{quality.rocAuc == null ? "—" : decimal(quality.rocAuc, 3)}</dd></div>
      <div><dt>Calibrada</dt><dd>{quality.calibrated ? "Sim" : "Não"}</dd></div>
    </dl>
  </Panel>;
}
