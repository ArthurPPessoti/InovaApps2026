import type { CanonicalDataset, SpreadsheetInspection, SpreadsheetMapping } from "./types";

export const datasetLabels: Record<CanonicalDataset, string> = {
  clientes: "Clientes e contratos",
  atendimento_mensal: "Histórico mensal",
  pesquisas_nps: "Pesquisas de satisfação",
  situacao_clientes: "Situação dos clientes",
};

export const requiredFields: Record<CanonicalDataset, Array<{ key: string; label: string; aliases?: string[] }>> = {
  clientes: [
    { key: "cliente_id", label: "Identificador do cliente", aliases: ["id_cliente", "cliente", "customer_id"] },
    { key: "segmento", label: "Segmento", aliases: ["setor", "segment"] },
    { key: "porte", label: "Porte", aliases: ["tamanho", "company_size"] },
    { key: "plano", label: "Plano ou contrato", aliases: ["produto", "contrato", "plan"] },
    { key: "valor_mensal", label: "Receita mensal", aliases: ["receita_mensal", "mrr", "mensalidade"] },
    { key: "sla_contratado_h", label: "SLA contratado (horas)", aliases: ["sla_contratado", "sla_horas"] },
    { key: "inicio_contrato", label: "Início do contrato", aliases: ["data_inicio", "contract_start"] },
  ],
  atendimento_mensal: [
    { key: "cliente_id", label: "Identificador do cliente", aliases: ["id_cliente", "cliente", "customer_id"] },
    { key: "mes_ref", label: "Mês de referência", aliases: ["mes", "competencia", "reference_month"] },
    { key: "chamados_abertos", label: "Chamados abertos", aliases: ["tickets_abertos", "open_tickets"] },
    { key: "chamados_criticos", label: "Chamados críticos", aliases: ["tickets_criticos", "critical_tickets"] },
    { key: "chamados_reabertos", label: "Chamados reabertos", aliases: ["tickets_reabertos", "reopened_tickets"] },
    { key: "pct_sla_cumprido", label: "% de SLA cumprido", aliases: ["sla_cumprido", "sla_pct"] },
    { key: "tempo_medio_resolucao_h", label: "Tempo médio de resolução", aliases: ["tempo_resolucao", "resolution_hours"] },
    { key: "reclamacoes_formais", label: "Reclamações formais", aliases: ["reclamacoes", "complaints"] },
    { key: "uso_plataforma_pct", label: "% de uso", aliases: ["uso_pct", "utilizacao", "usage_pct"] },
    { key: "dias_atraso_pagamento", label: "Dias de atraso", aliases: ["atraso_pagamento", "payment_delay_days"] },
    { key: "reunioes_previstas", label: "Reuniões previstas", aliases: ["reunioes_planejadas", "planned_meetings"] },
    { key: "reunioes_realizadas", label: "Reuniões realizadas", aliases: ["completed_meetings"] },
  ],
  pesquisas_nps: [
    { key: "cliente_id", label: "Identificador do cliente", aliases: ["id_cliente", "cliente", "customer_id"] },
    { key: "mes_ref", label: "Mês de referência", aliases: ["mes", "competencia", "reference_month"] },
    { key: "respondeu", label: "Respondeu à pesquisa", aliases: ["nps_respondeu", "answered"] },
    { key: "nota_nps", label: "Nota NPS", aliases: ["nps", "nps_score"] },
    { key: "classificacao_nps", label: "Classificação do NPS", aliases: ["categoria_nps", "nps_classification"] },
  ],
  situacao_clientes: [
    { key: "cliente_id", label: "Identificador do cliente", aliases: ["id_cliente", "cliente", "customer_id"] },
    { key: "situacao", label: "Situação atual", aliases: ["status", "customer_status"] },
    { key: "mes_cancelamento", label: "Mês do cancelamento", aliases: ["data_cancelamento", "cancel_month"] },
  ],
};

export const metricFields: Array<{ key: string; label: string; group: string; defaultWeight: number }> = [
  { key: "uso_plataforma_pct", label: "% de uso", group: "Uso", defaultWeight: 1 },
  { key: "pct_sla_cumprido", label: "% de SLA cumprido", group: "Atendimento", defaultWeight: 1 },
  { key: "chamados_abertos", label: "Chamados abertos", group: "Atendimento", defaultWeight: 1 },
  { key: "chamados_criticos", label: "Chamados críticos", group: "Atendimento", defaultWeight: 1 },
  { key: "chamados_reabertos", label: "Chamados reabertos", group: "Atendimento", defaultWeight: 1 },
  { key: "tempo_medio_resolucao_h", label: "Tempo médio de resolução", group: "Atendimento", defaultWeight: 1 },
  { key: "reclamacoes_formais", label: "Reclamações formais", group: "Relacionamento", defaultWeight: 1 },
  { key: "latest_nps", label: "Último NPS", group: "Relacionamento", defaultWeight: 1 },
  { key: "months_since_nps", label: "Meses desde o NPS", group: "Relacionamento", defaultWeight: 0.8 },
  { key: "dias_atraso_pagamento", label: "Dias de atraso", group: "Financeiro", defaultWeight: 1 },
  { key: "meeting_completion", label: "Reuniões realizadas", group: "Relacionamento", defaultWeight: 1 },
  { key: "valor_mensal", label: "Receita mensal", group: "Contrato", defaultWeight: 1 },
  { key: "sla_contratado_h", label: "SLA contratado", group: "Contrato", defaultWeight: 1 },
  { key: "tenure_months", label: "Tempo de contrato", group: "Contrato", defaultWeight: 1 },
  { key: "segmento", label: "Segmento", group: "Perfil", defaultWeight: 1 },
  { key: "porte", label: "Porte", group: "Perfil", defaultWeight: 1 },
  { key: "plano", label: "Plano", group: "Perfil", defaultWeight: 1 },
  { key: "latest_nps_classification", label: "Classificação do NPS", group: "Relacionamento", defaultWeight: 1 },
];

const lowIsRisk = new Set(["pct_sla_cumprido", "uso_plataforma_pct", "meeting_completion", "latest_nps"]);

export function withDefaultMetricSettings(mapping: SpreadsheetMapping): SpreadsheetMapping {
  const metrics = Object.fromEntries(metricFields.map((metric) => {
    const current = mapping.metrics?.[metric.key];
    return [metric.key, {
      enabled: current?.enabled ?? true,
      weight: current?.weight ?? metric.defaultWeight,
      riskType: current?.riskType ?? (lowIsRisk.has(metric.key) ? "LOW_IS_RISK" : "HIGH_IS_RISK"),
    }];
  }));
  return { ...mapping, metrics };
}

const datasets = Object.keys(requiredFields) as CanonicalDataset[];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();

export function suggestSpreadsheetMapping(inspection: SpreadsheetInspection): SpreadsheetMapping {
  const sheets = {} as Record<CanonicalDataset, string>;
  const columns = {} as Record<CanonicalDataset, Record<string, string>>;
  for (const dataset of datasets) {
    const score = (sheet: SpreadsheetInspection["sheets"][number]) => requiredFields[dataset].filter((field) => {
      const names = [field.key, ...(field.aliases ?? [])].map(normalize);
      return sheet.columns.some((column) => names.includes(normalize(column)));
    }).length;
    const candidates = inspection.format === "csv"
      ? inspection.sheets
      : [...inspection.sheets].sort((a, b) => score(b) - score(a) || Number(normalize(b.name) === dataset) - Number(normalize(a.name) === dataset));
    const source = candidates[0];
    sheets[dataset] = source?.name ?? "";
    columns[dataset] = Object.fromEntries(requiredFields[dataset].map((field) => {
      const names = [field.key, ...(field.aliases ?? [])].map(normalize);
      return [field.key, source?.columns.find((column) => names.includes(normalize(column))) ?? ""];
    }));
  }
  return withDefaultMetricSettings({ sheets, columns });
}

export function mappingProgress(mapping: SpreadsheetMapping) {
  const fields = datasets.flatMap((dataset) => requiredFields[dataset].map((field) => mapping.columns[dataset]?.[field.key]));
  return { mapped: fields.filter(Boolean).length, total: fields.length, complete: fields.every(Boolean) };
}
