import { CaretDown, Info, MagnifyingGlass, SlidersHorizontal } from "@phosphor-icons/react";
import { useState } from "react";
import {
  type MetricScope,
  aggregationLabels,
  filterMetrics,
  groupBySheet,
  importanceLabels,
  riskTypeLabels,
  roleLabels,
} from "./configLabels";
import type { AnalysisConfig, ImportanceLevel, MetricConfig } from "./types";

const roles = Object.keys(roleLabels) as MetricConfig["role"][];
const riskTypes = Object.keys(riskTypeLabels) as MetricConfig["riskType"][];
const aggregations = Object.keys(aggregationLabels) as MetricConfig["aggregation"][];
const scopes: Array<{ value: MetricScope; label: string }> = [
  { value: "usadas", label: "Em uso" },
  { value: "ignoradas", label: "Ignoradas" },
  { value: "todas", label: "Todas" },
];

export function ConfigEditor({ config, onChange }: { config: AnalysisConfig; onChange: (config: AnalysisConfig) => void }) {
  const [scope, setScope] = useState<MetricScope>("usadas");
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState(false);

  const updateMetric = (id: string, patch: Partial<MetricConfig>) =>
    onChange({ ...config, metrics: config.metrics.map((metric) => metric.id === id ? { ...metric, ...patch } : metric) });

  const setSheetUsage = (sheet: string, included: boolean) =>
    onChange({ ...config, metrics: config.metrics.map((metric) => metric.sheet === sheet ? { ...metric, included } : metric) });

  const used = config.metrics.filter((metric) => metric.included).length;
  const groups = groupBySheet(filterMetrics(config.metrics, { scope, search }));

  return (
    <section className="panel config-editor">
      <div className="panel-heading">
        <div>
          <span><SlidersHorizontal size={13} /> Configuração detalhada</span>
          <h2>Objetivo e colunas usadas na análise</h2>
          <p>{used} de {config.metrics.length} colunas em uso · {config.metrics.length - used} ignoradas</p>
        </div>
      </div>

      <div className="objective-editor">
        <label>Comportamento a antecipar
          <input value={config.objective.behavior} onChange={(event) => onChange({ ...config, objective: { ...config.objective, behavior: event.target.value, confirmed: false } })} />
        </label>
        <label>Horizonte (dias)
          <input type="number" min="1" value={config.objective.horizonDays} onChange={(event) => onChange({ ...config, objective: { ...config.objective, horizonDays: Number(event.target.value), confirmed: false } })} />
        </label>
        <label>Como chamar cada registro
          <input value={config.objective.entityLabel} onChange={(event) => onChange({ ...config, objective: { ...config.objective, entityLabel: event.target.value } })} />
        </label>
        <label>Método
          <select value={config.methodPreference} onChange={(event) => onChange({ ...config, methodPreference: event.target.value as AnalysisConfig["methodPreference"] })}>
            <option value="AUTO">Automático e rigoroso</option>
            <option value="SCORE">Forçar score</option>
            <option value="PROBABILITY">Tentar probabilidade</option>
          </select>
        </label>
      </div>

      <div className="metrics-toolbar">
        <div className="metrics-scope" role="group" aria-label="Filtrar colunas">
          {scopes.map((item) => (
            <button key={item.value} type="button" className={scope === item.value ? "active" : ""} aria-pressed={scope === item.value} onClick={() => setScope(item.value)}>{item.label}</button>
          ))}
        </div>
        <label className="search-control">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <span className="sr-only">Buscar coluna</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar coluna" />
        </label>
        <div className="importance-mode">
          <span>Importância:</span>
          <button type="button" className={config.importanceMode === "qualitative" ? "is-active" : ""} onClick={() => onChange({ ...config, importanceMode: "qualitative" })}>Qualitativa</button>
          <button type="button" className={config.importanceMode === "numeric" ? "is-active" : ""} onClick={() => onChange({ ...config, importanceMode: "numeric" })}>Peso</button>
        </div>
        <label className="advanced-toggle">
          <input type="checkbox" checked={advanced} onChange={(event) => setAdvanced(event.target.checked)} />
          <span>Opções avançadas</span>
        </label>
      </div>

      {groups.length === 0 && <p className="metrics-empty">Nenhuma coluna encontrada nesta combinação de filtro e busca.</p>}

      {groups.map((group) => (
        <details key={group.sheet} className="metric-group" open={group.usedCount > 0}>
          <summary>
            <CaretDown size={14} weight="bold" />
            <strong>{group.sheet}</strong>
            <small>{group.usedCount} em uso de {group.metrics.length}</small>
            <span className="metric-group__actions">
              <button type="button" onClick={(event) => { event.preventDefault(); setSheetUsage(group.sheet, true); }}>Usar todas</button>
              <button type="button" onClick={(event) => { event.preventDefault(); setSheetUsage(group.sheet, false); }}>Nenhuma</button>
            </span>
          </summary>

          <div className="table-scroll">
            <table className={advanced ? "config-table config-table--advanced" : "config-table"}>
              <thead>
                <tr>
                  <th>Usar</th>
                  <th>Coluna</th>
                  <th>Significado</th>
                  <th>Papel</th>
                  {advanced && <><th>Tipo de risco</th><th>Agregação</th></>}
                  <th>Importância</th>
                  {advanced && <th>Confiança</th>}
                </tr>
              </thead>
              <tbody>
                {group.metrics.map((metric) => (
                  <tr key={metric.id} className={metric.included ? undefined : "metric-row--off"}>
                    <td>
                      <input aria-label={`Usar ${metric.meaning}`} type="checkbox" checked={metric.included} onChange={(event) => updateMetric(metric.id, { included: event.target.checked })} />
                    </td>
                    <td>
                      <strong>{metric.column}</strong>
                      {metric.rationale && <span className="metric-help" title={metric.rationale}><Info size={13} /></span>}
                    </td>
                    <td><input value={metric.meaning} onChange={(event) => updateMetric(metric.id, { meaning: event.target.value })} /></td>
                    <td>
                      <select value={metric.role} onChange={(event) => updateMetric(metric.id, { role: event.target.value as MetricConfig["role"] })}>
                        {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                      </select>
                    </td>
                    {advanced && (
                      <>
                        <td>
                          <select value={metric.riskType} onChange={(event) => updateMetric(metric.id, { riskType: event.target.value as MetricConfig["riskType"] })}>
                            {riskTypes.map((type) => <option key={type} value={type}>{riskTypeLabels[type]}</option>)}
                          </select>
                        </td>
                        <td>
                          <select value={metric.aggregation} onChange={(event) => updateMetric(metric.id, { aggregation: event.target.value as MetricConfig["aggregation"] })}>
                            {aggregations.map((item) => <option key={item} value={item}>{aggregationLabels[item]}</option>)}
                          </select>
                        </td>
                      </>
                    )}
                    <td>
                      {config.importanceMode === "numeric"
                        ? <input className="weight-input" type="number" min="0.1" step="0.1" value={metric.numericWeight ?? 4} onChange={(event) => updateMetric(metric.id, { numericWeight: Number(event.target.value) })} />
                        : <select value={metric.importance} onChange={(event) => updateMetric(metric.id, { importance: event.target.value as ImportanceLevel })}>
                            {(Object.keys(importanceLabels) as ImportanceLevel[]).map((value) => <option key={value} value={value}>{importanceLabels[value]}</option>)}
                          </select>}
                    </td>
                    {advanced && <td className="metric-confidence">{Math.round(metric.confidence * 100)}%</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}
