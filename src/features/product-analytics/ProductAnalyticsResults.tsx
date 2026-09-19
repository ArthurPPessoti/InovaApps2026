import { Pulse, SquaresFour, UsersThree } from "@phosphor-icons/react";
import { useMemo, type ReactNode } from "react";
import type { ProductAnalyticsData } from "./types";

interface ProductAnalyticsResultsProps {
  summary: ProductAnalyticsData;
  emptyMessage?: string;
}

export function ProductAnalyticsResults({
  summary,
  emptyMessage = "Selecione outro período ou envie novos eventos para esta aplicação.",
}: ProductAnalyticsResultsProps) {
  const maxUsage = useMemo(
    () => Math.max(1, ...summary.features.map((feature) => feature.usageCount)),
    [summary.features],
  );

  return (
    <>
      <section className="product-analytics-metrics" aria-label="Indicadores reais de uso">
        <MetricCard icon={<Pulse size={22} weight="duotone" />} label="Total de eventos" value={summary.metrics.totalEvents} helper="Recebidos no período" />
        <MetricCard
          icon={<UsersThree size={22} weight="duotone" />}
          label="Usuários únicos"
          value={summary.metrics.uniqueUsers}
          helper={summary.metrics.totalEvents > 0 && summary.metrics.uniqueUsers === 0
            ? "Nenhum user_id informado"
            : "user_id distintos no período"}
        />
        <MetricCard icon={<SquaresFour size={22} weight="duotone" />} label="Funcionalidades utilizadas" value={summary.metrics.featuresUsed} helper="Eventos distintos no período" />
      </section>

      {summary.metrics.totalEvents === 0 ? (
        <section className="product-analytics-empty product-analytics-empty--compact">
          <Pulse size={36} weight="duotone" />
          <h2>Nenhum evento no período</h2>
          <p>{emptyMessage}</p>
        </section>
      ) : (
        <section className="product-analytics-panel">
          <div className="product-analytics-panel-heading">
            <div><span>Eventos reais → contagem</span><h2>Utilização por funcionalidade</h2></div>
            <small>{summary.features.length} funcionalidade(s)</small>
          </div>
          <div className="product-analytics-feature-list">
            {summary.features.map((feature) => (
              <article key={feature.eventName} className="product-analytics-feature-row">
                <div className="product-analytics-feature-copy">
                  <strong>{feature.name}</strong>
                  <code>{feature.eventName}</code>
                  {!feature.registered && <small>Evento ainda não cadastrado em Funcionalidades monitoradas</small>}
                </div>
                <div className="product-analytics-feature-usage">
                  <div aria-hidden="true"><span style={{ width: `${(feature.usageCount / maxUsage) * 100}%` }} /></div>
                  <strong>{feature.usageCount}</strong>
                  <span>utilização(ões)</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function MetricCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: number; helper: string }) {
  return (
    <article className="product-analytics-metric-card">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value.toLocaleString("pt-BR")}</strong><p>{helper}</p></div>
    </article>
  );
}
