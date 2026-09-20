import {
  ArrowLeft,
  ArrowRight,
  ChartBar,
  ChatCircleDots,
  CheckCircle,
  CurrencyCircleDollar,
  Database,
  FileXls,
  Funnel,
  MagnifyingGlass,
  PaperPlaneTilt,
  ShieldWarning,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Table,
  TrendDown,
  UploadSimple,
  UsersThree,
} from "@phosphor-icons/react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../auth/AuthContext";
import { churnBandLabel, churnBandThreshold, isAttention, primaryRiskReason, segmentRisk, suggestedActions } from "../churn/analysisAdapters";
import { analyzeSpreadsheet, inspectSpreadsheet, saveChurnAnalysis, useChurnAnalysis } from "../churn/churnAnalysis";
import { datasetLabels, mappingProgress, metricFields, requiredFields, suggestSpreadsheetMapping, withDefaultMetricSettings } from "../churn/spreadsheetMapping";
import { clientTechnologyTelemetry } from "../churn/technologySignals";
import type { CanonicalDataset, ChurnBand, SpreadsheetInspection, SpreadsheetMapping } from "../churn/types";
import { formatCurrency } from "../components/StatusUI";
import { ConnectedPredictiveScenarios } from "../churn/ConnectedPredictiveScenarios";
import { ClientPredictiveContext } from "../churn/ClientPredictiveContext";
import { ProductUsageAnalytics } from "../features/product-analytics/ProductUsageAnalytics";

const bandColors: Record<ChurnBand, string> = { LOW: "#00f3ff", ATTENTION: "#ffba49", HIGH: "#ff6b78", CRITICAL: "#ff3355" };

function percentage(value: number | null) {
  return value == null ? "Não informado" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function valueOrDash(value: number | null, suffix = "") {
  return value == null ? "Não informado" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

type ChurnAssistantMessage = { role: "assistant" | "user"; text: string };
type DataStep = 1 | 2 | 3;
type DataMode = "guided" | "manual";

const normalizeText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const weightLabel = (weight: number) => weight >= 2 ? "Crítico" : weight >= 1.5 ? "Alto" : weight <= 0.5 ? "Baixo" : "Normal";
const activeMetricCount = (mapping: SpreadsheetMapping | null) => metricFields.filter((metric) => mapping?.metrics?.[metric.key]?.enabled !== false).length;
const weightOptions = [
  { label: "Muito baixa", value: 0.5, badge: "1" },
  { label: "Baixa", value: 0.75, badge: "2" },
  { label: "Média", value: 1, badge: "4" },
  { label: "Alta", value: 1.5, badge: "7" },
  { label: "Crítica", value: 2, badge: "10" },
];
const metricByKey = Object.fromEntries(metricFields.map((metric) => [metric.key, metric]));
const riskDirectionOptions = [
  { label: "Maior é pior", value: "HIGH_IS_RISK" as const },
  { label: "Menor é pior", value: "LOW_IS_RISK" as const },
  { label: "Não usar", value: "DISABLED" as const },
];

function roleLabelFor(field: string) {
  if (field === "valor_mensal") return "Valor financeiro";
  if (["situacao", "mes_cancelamento"].includes(field)) return "Desfecho";
  if (["cliente_id", "mes_ref"].includes(field)) return "Chave / contexto";
  return metricByKey[field] ? "Indicador" : "Contexto";
}

function assistantReading(inspection: SpreadsheetInspection, mapping: SpreadsheetMapping) {
  const priority = metricFields
    .filter((metric) => mapping.metrics?.[metric.key]?.enabled !== false)
    .slice(0, 4)
    .map((metric) => `${metric.label}: ${weightLabel(mapping.metrics?.[metric.key]?.weight ?? metric.defaultWeight)}`);
  return `Li ${inspection.sheets.length} aba(s), ${inspection.sheets.reduce((sum, sheet) => sum + sheet.rows, 0)} linhas e ${inspection.sheets.reduce((sum, sheet) => sum + sheet.columns.length, 0)} colunas. Mantive ${activeMetricCount(mapping)} métrica(s) ativas. Prioridades iniciais: ${priority.join(", ")}. Você pode pedir "dar mais peso ao financeiro", "ignorar NPS" ou "priorizar atendimento".`;
}

function tuneMetricsFromText(mapping: SpreadsheetMapping, text: string) {
  const normalized = normalizeText(text);
  const groups = [
    { terms: ["financeiro", "atraso", "pagamento", "mrr", "receita"], keys: ["dias_atraso_pagamento", "valor_mensal"], label: "financeiro" },
    { terms: ["atendimento", "sla", "chamado", "ticket", "resolucao"], keys: ["pct_sla_cumprido", "chamados_abertos", "chamados_criticos", "chamados_reabertos", "tempo_medio_resolucao_h"], label: "atendimento" },
    { terms: ["relacionamento", "nps", "reuniao", "reclamacao"], keys: ["latest_nps", "latest_nps_classification", "months_since_nps", "meeting_completion", "reclamacoes_formais"], label: "relacionamento" },
    { terms: ["uso", "utilizacao", "plataforma"], keys: ["uso_plataforma_pct"], label: "uso" },
  ];
  const configured = withDefaultMetricSettings(mapping);
  const nextMetrics = { ...(configured.metrics ?? {}) };
  const matched = groups.filter((group) => group.terms.some((term) => normalized.includes(term)));
  const disabling = ["ignorar", "desativar", "tirar", "remover", "nao usar"].some((term) => normalized.includes(term));
  const high = ["mais", "priorizar", "alto", "critico", "aumentar"].some((term) => normalized.includes(term));
  const low = ["menos", "baixo", "reduzir"].some((term) => normalized.includes(term));
  matched.forEach((group) => group.keys.forEach((key) => {
    const current = nextMetrics[key] ?? { enabled: true, weight: 1 };
    nextMetrics[key] = { enabled: disabling ? false : true, weight: disabling ? current.weight : high ? 1.5 : low ? 0.5 : current.weight };
  }));
  return { mapping: { ...configured, metrics: nextMetrics }, matched: matched.map((group) => group.label), action: disabling ? "desativei" : high ? "aumentei" : low ? "reduzi" : "mantive" };
}

function defaultChurnMapping(): SpreadsheetMapping {
  const canonical = Object.keys(requiredFields) as CanonicalDataset[];
  return withDefaultMetricSettings({
    sheets: Object.fromEntries(canonical.map((dataset) => [dataset, dataset])) as Record<CanonicalDataset, string>,
    columns: Object.fromEntries(canonical.map((dataset) => [
      dataset,
      Object.fromEntries(requiredFields[dataset].map((field) => [field.key, field.key])),
    ])) as Record<CanonicalDataset, Record<string, string>>,
  });
}

function DataRequiredState({ loading = false }: { loading?: boolean }) {
  return (
    <div className="general-empty-state">
      <span className="empty-data-icon"><FileXls size={34} weight="duotone" /></span>
      <span className="eyebrow">Fonte de dados da conta</span>
      <h1>{loading ? "Carregando a análise da sua base..." : "Cadastre uma planilha para iniciar a análise."}</h1>
      {!loading && <><p>Dashboard, clientes, previsões e gestão utilizarão a mesma fonte cadastrada.</p><Link className="primary-button" to="/dados">Cadastrar planilha <ArrowRight size={17} /></Link></>}
    </div>
  );
}

export function GeneralDashboardPage() {
  const { account } = useAuth();
  const { analysis, loading } = useChurnAnalysis(account?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const search = searchParams.get("busca") ?? "";
  const risk = searchParams.get("risco") ?? "Todos";

  const filtered = useMemo(() => {
    if (!analysis) return [];
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return analysis.predictions.filter((prediction) =>
      (!normalized || `${prediction.subjectId} ${prediction.segment} ${prediction.plan}`.toLocaleLowerCase("pt-BR").includes(normalized))
      && (risk === "Todos" || prediction.probabilityBand === risk),
    );
  }, [analysis, risk, search]);

  if (loading) return <DataRequiredState loading />;
  if (!analysis) return <DataRequiredState />;

  const attention = analysis.predictions.filter(isAttention);
  const high = analysis.predictions.filter((item) => item.probabilityBand === "HIGH" || item.probabilityBand === "CRITICAL");
  const distribution = (Object.keys(analysis.summary.distribution) as ChurnBand[]).map((band) => ({ band, label: churnBandLabel[band], value: analysis.summary.distribution[band] }));
  const segments = segmentRisk(analysis).map((item) => ({ ...item, expectedRevenue: Math.round(item.expectedRevenue / 1000) }));
  const setFilter = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key); else next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  const openClient = (clientId: string) => navigate(`/clientes/${clientId}`, { state: { from: `${location.pathname}${location.search}` } });

  return (
    <div className="dashboard-page general-dashboard-page">
      <section id="resumo" className="page-heading">
        <div><span className="eyebrow"><ChartBar size={16} weight="duotone" /> Inteligência da carteira</span><h1>Quais clientes precisam de atenção agora?</h1><p>Todos os números desta tela foram calculados a partir da fonte ativa da conta.</p></div>
        <Link className="source-file-chip" to="/dados"><FileXls size={18} /><span><strong>{analysis.source.fileName}</strong><small>{analysis.source.observedFrom} a {analysis.source.observedUntil}</small></span></Link>
      </section>

      <section className="metrics-grid" aria-label="Resumo da análise">
        <article className="metric-card metric-card--primary"><div className="metric-icon"><UsersThree size={22} weight="duotone" /></div><span>Clientes ativos analisados</span><strong>{analysis.summary.analyzedEntities}</strong><small>{analysis.source.entities} clientes no histórico</small></article>
        <article className="metric-card"><div className="metric-icon"><TrendDown size={22} weight="duotone" /></div><span>Exigem atenção</span><strong>{attention.length}</strong><small>Probabilidade igual ou superior a 10%</small></article>
        <article className="metric-card"><div className="metric-icon metric-icon--danger"><ShieldWarning size={22} weight="duotone" /></div><span>Risco alto ou crítico</span><strong>{high.length}</strong><small>Probabilidade igual ou superior a 25%</small></article>
        <article className="metric-card"><div className="metric-icon"><CurrencyCircleDollar size={22} weight="duotone" /></div><span>MRR esperado em risco</span><strong>{formatCurrency(analysis.summary.expectedMonthlyRevenueAtRisk)}</strong><small>Probabilidade × receita mensal</small></article>
      </section>

      <section className="analytics-grid">
        <article className="panel panel--wide">
          <div className="panel-heading"><div><span>Distribuição calculada</span><h2>Clientes por faixa de risco</h2><p>As mesmas faixas são usadas no Dashboard, Previsões, Clientes e Gestão.</p></div></div>
          <div className="main-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution} margin={{ top: 16, right: 16, left: -20, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9aa7bd", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9aa7bd", fontSize: 11 }} /><Tooltip /><Bar dataKey="value" name="Clientes" radius={[8, 8, 2, 2]}>{distribution.map((item) => <Cell key={item.band} fill={bandColors[item.band]} />)}</Bar></BarChart></ResponsiveContainer></div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><span>Concentração financeira</span><h2>MRR esperado em risco por segmento</h2><p>Valores em milhares de reais.</p></div></div>
          <div className="segment-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={segments} layout="vertical" margin={{ top: 4, right: 8, left: 10, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="segment" type="category" axisLine={false} tickLine={false} width={76} tick={{ fill: "#b9b9b9", fontSize: 10 }} /><Tooltip /><Bar dataKey="expectedRevenue" name="MRR em risco" fill="#0156fc" radius={[0, 8, 8, 0]} barSize={13} /></BarChart></ResponsiveContainer></div>
        </article>
      </section>

      <ConnectedPredictiveScenarios analysis={analysis} mode="overview" />

      <section className="data-quality-strip" aria-label="Origem da análise">
        <div><CheckCircle size={20} weight="fill" /><span><strong>{analysis.source.activeEntities} ativos e {analysis.source.cancelledEntities} cancelados</strong><small>Desfecho identificado na planilha</small></span></div>
        <div><Database size={20} /><span><strong>{analysis.model.trainingSnapshots} observações usadas</strong><small>Treino até {analysis.model.trainedUntil}</small></span></div>
        <p>Fonte única: qualquer nova importação substitui esta execução e atualiza todas as telas da conta.</p>
      </section>

      <section className="panel clients-panel">
        <div className="panel-heading panel-heading--clients">
          <div><span>Ordem de atuação</span><h2>Clientes priorizados pelo impacto esperado</h2><p>{filtered.length} de {analysis.predictions.length} clientes na seleção atual</p></div>
          <div className="filters"><label className="search-control"><MagnifyingGlass size={18} /><span className="sr-only">Buscar cliente</span><input value={search} onChange={(event) => setFilter("busca", event.target.value, "")} placeholder="Buscar ID, segmento ou plano" /></label><label className="select-control"><Funnel size={16} /><span className="sr-only">Filtrar por risco</span><select value={risk} onChange={(event) => setFilter("risco", event.target.value, "Todos")}><option>Todos</option><option value="CRITICAL">Crítico</option><option value="HIGH">Alto</option><option value="ATTENTION">Atenção</option><option value="LOW">Baixo</option></select></label></div>
        </div>
        <div className="table-scroll"><table className="clients-table churn-table"><thead><tr><th>Cliente</th><th>Segmento / plano</th><th>Probabilidade</th><th>Classificação</th><th>Receita mensal</th><th>Impacto esperado</th><th>Por que merece atenção</th><th>Ação</th></tr></thead><tbody>{filtered.map((prediction) => <tr key={prediction.subjectId} tabIndex={0} onClick={() => openClient(prediction.subjectId)} onKeyDown={(event) => { if (event.key === "Enter") openClient(prediction.subjectId); }}><td><strong>{prediction.subjectId}</strong><small>{Math.round(prediction.dataCoverage * 100)}% de cobertura</small></td><td><strong>{prediction.segment}</strong><small>{prediction.plan}</small></td><td><strong className="probability-value">{percentage(prediction.probability)}</strong></td><td><span className={`churn-band churn-band--${prediction.probabilityBand.toLowerCase()}`}>{churnBandLabel[prediction.probabilityBand]}</span></td><td>{formatCurrency(prediction.monthlyRevenue)}</td><td className="revenue-cell">{formatCurrency(prediction.expectedMonthlyRevenueAtRisk)}</td><td className="signal-cell">{primaryRiskReason(prediction)}</td><td><button className="table-action" type="button" onClick={(event) => { event.stopPropagation(); openClient(prediction.subjectId); }}>Entender <ArrowRight size={14} /></button></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

export function DataPage() {
  const { account, updateSpreadsheet } = useAuth();
  const { analysis } = useChurnAnalysis(account?.id);
  const [sourceName, setSourceName] = useState(account?.spreadsheet?.sourceName ?? "Base de clientes");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<SpreadsheetInspection | null>(null);
  const [mapping, setMapping] = useState<SpreadsheetMapping | null>(account?.spreadsheet?.mapping ? withDefaultMetricSettings(account.spreadsheet.mapping) : null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processing, setProcessing] = useState<"" | "inspect" | "analyze">("");
  const [step, setStep] = useState<DataStep>(1);
  const [mode, setMode] = useState<DataMode>("guided");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChurnAssistantMessage[]>([{ role: "assistant", text: "Envie a base ou edite a configuração ativa. Eu ajudo a ajustar métricas e pesos sem desconectar as outras abas." }]);
  const [editingActive, setEditingActive] = useState(false);
  const datasets = Object.keys(requiredFields) as CanonicalDataset[];
  const progress = mapping ? mappingProgress(mapping) : null;

  const selectFile = async (file: File | null) => {
    setSelectedFile(file);
    setInspection(null);
    setMapping(null);
    setError("");
    setSuccess("");
    setEditingActive(false);
    setStep(1);
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) return setError("Selecione um arquivo .xlsx ou .csv.");
    setProcessing("inspect");
    try {
      const result = await inspectSpreadsheet(file);
      setInspection(result);
      const suggested = suggestSpreadsheetMapping(result);
      setMapping(suggested);
      setMessages([{ role: "assistant", text: assistantReading(result, suggested) }]);
      setStep(2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível ler a estrutura do arquivo.");
    } finally {
      setProcessing("");
    }
  };

  const changeSheet = (dataset: CanonicalDataset, sheetName: string) => {
    if (!mapping || !inspection) return;
    const columns = inspection.sheets.find((sheet) => sheet.name === sheetName)?.columns ?? [];
    setMapping({
      sheets: { ...mapping.sheets, [dataset]: sheetName },
      columns: {
        ...mapping.columns,
        [dataset]: Object.fromEntries(requiredFields[dataset].map((field) => [field.key, columns.includes(field.key) ? field.key : ""])),
      },
      metrics: mapping.metrics,
    });
  };

  const changeColumn = (dataset: CanonicalDataset, field: string, column: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, columns: { ...mapping.columns, [dataset]: { ...mapping.columns[dataset], [field]: column } } });
  };

  const changeMetric = (metric: string, patch: Partial<{ enabled: boolean; weight: number; riskType: "HIGH_IS_RISK" | "LOW_IS_RISK" }>) => {
    if (!mapping) return;
    const configured = withDefaultMetricSettings(mapping);
    setMapping({
      ...configured,
      metrics: {
        ...configured.metrics,
        [metric]: { ...configured.metrics![metric], ...patch },
      },
    });
  };

  const editActiveConfig = () => {
    if (!account?.spreadsheet) return;
    const active = withDefaultMetricSettings(account.spreadsheet.mapping ?? defaultChurnMapping());
    setMapping(active);
    setInspection(null);
    setSelectedFile(null);
    setSourceName(account.spreadsheet.sourceName ?? sourceName);
    setEditingActive(true);
    setMode("guided");
    setStep(2);
    setError("");
    setSuccess("");
    setMessages([{ role: "assistant", text: `Carreguei a configuração ativa de ${account.spreadsheet.fileName}. Você pode ajustar pesos agora; para recalcular os resultados, reenvie a mesma planilha e confirme a análise.` }]);
  };

  const saveActiveConfig = () => {
    if (!account?.spreadsheet || !mapping) return;
    updateSpreadsheet(account.spreadsheet.fileName, account.spreadsheet.rows, sourceName.trim() || account.spreadsheet.sourceName, withDefaultMetricSettings(mapping));
    setSuccess("Configuração salva. Reenvie a planilha para recalcular as abas com esses pesos.");
  };

  const ask = (event: FormEvent) => {
    event.preventDefault();
    if (!mapping || !message.trim()) return;
    const text = message.trim();
    const tuned = tuneMetricsFromText(mapping, text);
    setMessages((current) => [
      ...current,
      { role: "user", text },
      { role: "assistant", text: tuned.matched.length ? `Pronto: ${tuned.action} ${tuned.matched.join(", ")}. Revise os pesos abaixo e confirme a análise quando estiver bom.` : "Não encontrei uma dimensão clara nesse pedido. Tente citar financeiro, atendimento, relacionamento, NPS, uso ou receita." },
    ]);
    if (tuned.matched.length) setMapping(tuned.mapping);
    setMessage("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sourceName.trim()) return setError("Dê um nome para identificar esta fonte de dados.");
    if (!selectedFile) return setError("Selecione a planilha que será cadastrada.");
    if (!mapping || !progress?.complete) return setError("Associe todas as colunas obrigatórias antes de analisar.");
    setProcessing("analyze");
    setError("");
    setSuccess("");
    try {
      const result = await analyzeSpreadsheet(selectedFile, withDefaultMetricSettings(mapping));
      if (account) saveChurnAnalysis(account.id, result);
      updateSpreadsheet(selectedFile.name, result.source.entities, sourceName.trim(), withDefaultMetricSettings(mapping));
      setSuccess(`${sourceName.trim()} foi cadastrada e todas as telas foram atualizadas.`);
      setSelectedFile(null);
      setInspection(null);
      setEditingActive(false);
      setStep(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar a planilha.");
    } finally {
      setProcessing("");
    }
  };

  const canConfigure = Boolean(mapping);
  const currentSourceName = selectedFile?.name ?? account?.spreadsheet?.fileName ?? "Fonte carregada";
  const steps = [
    { number: 1 as const, label: "Enviar base" },
    { number: 2 as const, label: "Definir análise" },
    { number: 3 as const, label: "Revisar e executar" },
  ];
  const guidedWeights = mapping && <section className="guided-weights" aria-labelledby="guided-weights-title">
    <header>
      <div><span>Sugestão inicial da IA</span><h3 id="guided-weights-title">Qual é a importância de cada coluna?</h3><p>O peso é relativo, não uma porcentagem. A direção diz se o risco está no valor alto ou no baixo.</p></div>
      <strong>{activeMetricCount(mapping)} sugerido(s)</strong>
    </header>
    <div className="guided-weight-list">{metricFields.map((metric) => {
      const setting = mapping.metrics?.[metric.key] ?? { enabled: true, weight: metric.defaultWeight, riskType: "HIGH_IS_RISK" as const };
      return <article className={!setting.enabled ? "guided-weight-row needs-direction" : "guided-weight-row"} key={metric.key}>
        <div className="guided-weight-name"><strong>{metric.label}</strong><span>{metric.group.toLowerCase()} · {metric.key}</span>{!setting.enabled && <em>Não usada no cálculo</em>}</div>
        <div className="guided-weight-controls">
          <div className="weight-pills" role="radiogroup" aria-label={`Importância de ${metric.label}`}>
            {weightOptions.map((option) => <button key={option.value} type="button" role="radio" aria-checked={setting.enabled && setting.weight === option.value} className={setting.enabled && setting.weight === option.value ? "is-selected" : ""} onClick={() => changeMetric(metric.key, { enabled: true, weight: option.value })}><span>{option.label}</span><small>{option.badge}</small></button>)}
          </div>
          <div className="direction-pills" role="radiogroup" aria-label={`Direção do risco de ${metric.label}`}>
            {riskDirectionOptions.map((option) => <button key={option.value} type="button" role="radio" aria-checked={option.value === "DISABLED" ? !setting.enabled : setting.enabled && setting.riskType === option.value} className={(option.value === "DISABLED" ? !setting.enabled : setting.enabled && setting.riskType === option.value) ? "is-selected" : ""} onClick={() => option.value === "DISABLED" ? changeMetric(metric.key, { enabled: false }) : changeMetric(metric.key, { enabled: true, riskType: option.value })}>{option.label}</button>)}
          </div>
        </div>
      </article>;
    })}</div>
    <button type="button" className="link-button guided-weights-edit" onClick={() => setMode("manual")}><SlidersHorizontal size={14}/> Ver todas as colunas e configurações</button>
  </section>;

  const detailedConfig = mapping && <section className="panel config-editor churn-config-editor">
    <div className="panel-heading"><div><span><SlidersHorizontal size={13}/> Configuração detalhada</span><h2>Objetivo e colunas usadas na análise</h2><p>{activeMetricCount(mapping)} de {metricFields.length} métricas em uso</p></div></div>
    <div className="objective-editor">
      <label>Comportamento a antecipar<input value="encerrar o relacionamento" readOnly /></label>
      <label>Horizonte (dias)<input value={90} readOnly /></label>
      <label>Como chamar cada registro<input value="cliente" readOnly /></label>
      <label>Método<select value="AUTO" disabled><option value="AUTO">Automático e rigoroso</option></select></label>
    </div>
    <div className="metrics-toolbar">
      <div className="metrics-scope" role="group" aria-label="Filtrar colunas"><button type="button" className="active">Em uso</button><button type="button">Ignoradas</button><button type="button">Todas</button></div>
      <label className="search-control"><MagnifyingGlass size={16}/><span className="sr-only">Buscar coluna</span><input placeholder="Buscar coluna" readOnly /></label>
      <div className="importance-mode"><span>Importância:</span><button type="button" className="is-active">Qualitativa</button><button type="button">Peso</button></div>
      <label className="advanced-toggle"><input type="checkbox" disabled /><span>Opções avançadas</span></label>
    </div>
    {datasets.map((dataset) => {
      const selectedSheet = inspection?.sheets.find((sheet) => sheet.name === mapping.sheets[dataset]);
      const used = requiredFields[dataset].filter((field) => field.key in metricByKey ? mapping.metrics?.[field.key]?.enabled !== false : Boolean(mapping.columns[dataset]?.[field.key]));
      return <details key={dataset} className="metric-group" open>
        <summary><span aria-hidden="true">⌄</span><strong>{mapping.sheets[dataset] || dataset}</strong><small>{used.length} em uso de {requiredFields[dataset].length}</small><span className="metric-group__actions"><button type="button">Usar todas</button><button type="button">Nenhuma</button></span></summary>
        <div className="table-scroll"><table className="config-table"><thead><tr><th>Usar</th><th>Coluna</th><th>Significado</th><th>Papel</th><th>Importância</th></tr></thead><tbody>
          {requiredFields[dataset].map((field) => {
            const metric = metricByKey[field.key];
            const setting = metric ? mapping.metrics?.[field.key] ?? { enabled: true, weight: 1 } : null;
            return <tr key={field.key} className={setting?.enabled === false ? "metric-row--off" : undefined}>
              <td><input type="checkbox" checked={metric ? setting?.enabled !== false : Boolean(mapping.columns[dataset]?.[field.key])} onChange={(event) => metric ? changeMetric(field.key, { enabled: event.target.checked }) : undefined} disabled={!metric} /></td>
              <td><strong>{field.key}</strong></td>
              <td><input value={field.label} readOnly /></td>
              <td><select value={roleLabelFor(field.key)} disabled><option>{roleLabelFor(field.key)}</option></select></td>
              <td>{metric ? <select value={setting?.weight ?? 1} onChange={(event) => changeMetric(field.key, { weight: Number(event.target.value), enabled: true })}>{weightOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <span className="metric-confidence">Obrigatório</span>}</td>
            </tr>;
          })}
        </tbody></table></div>
        {inspection && selectedSheet && <label className="data-field config-sheet-select">Origem dos dados<select value={mapping.sheets[dataset]} onChange={(event) => changeSheet(dataset, event.target.value)}>{inspection.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{inspection.format === "csv" ? "Arquivo CSV" : `Aba ${sheet.name}`} · {sheet.rows} linhas</option>)}</select></label>}
      </details>;
    })}
  </section>;

  return (
    <div className="data-page adaptive-data-page">
      <header className="page-heading"><div><span className="eyebrow"><FileXls size={16} weight="duotone" /> Análise da sua base</span><h1>Configure a fonte que alimenta todas as abas.</h1><p>Dashboard, Previsões, Clientes e Gestão usam a execução salva aqui.</p></div></header>

      <nav className="analysis-stepper" aria-label="Etapas da análise">
        <ol>{steps.map((item) => {
          const available = item.number === 1 || (item.number === 2 && canConfigure) || (item.number === 3 && canConfigure);
          const completed = item.number < step;
          return <li key={item.number} className={completed ? "is-complete" : item.number === step ? "is-current" : ""}>
            <button type="button" disabled={!available} aria-current={item.number === step ? "step" : undefined} onClick={() => available && setStep(item.number)}>
              <span aria-hidden="true">{completed ? <CheckCircle size={18} weight="fill"/> : item.number}</span>
              <strong>{item.label}</strong>
            </button>
          </li>;
        })}</ol>
      </nav>

      {canConfigure && <article className="workflow-summary">
        <CheckCircle size={18} weight="fill"/>
        <span><strong>{currentSourceName}</strong><small>{inspection ? `${inspection.sheets.length} aba(s), ${inspection.sheets.reduce((sum, sheet) => sum + sheet.rows, 0)} linhas` : "Configuração ativa carregada"} · {activeMetricCount(mapping)} métricas ativas</small></span>
        <button type="button" onClick={() => setStep(1)}>Trocar base</button>
      </article>}

      {step === 1 && <section className="adaptive-source-grid">
        <article className="panel adaptive-upload-panel">
          <div className="panel-heading"><div><span><UploadSimple size={13}/> Enviar base</span><h2>Importar Excel ou CSV</h2><p>Use a mesma estrutura da demo para manter MRR, probabilidade, gestão e clientes conectados.</p></div></div>
          <label className={`data-file-drop${selectedFile ? " data-file-drop--selected" : ""}`}><FileXls size={28} /><span><strong>{selectedFile?.name ?? "Escolher arquivo .xlsx ou .csv"}</strong><small>{processing === "inspect" ? "Lendo abas e colunas..." : selectedFile ? `${(selectedFile.size / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB · estrutura lida pelo servidor local` : "Arraste aqui ou clique para selecionar"}</small></span><input className="sr-only" type="file" accept=".xlsx,.csv" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} /></label>
          {account?.spreadsheet && analysis && <div className="active-run-card"><CheckCircle size={18} weight="fill"/><span><strong>Execução ativa</strong><small>{account.spreadsheet.fileName} · {analysis.summary.analyzedEntities} clientes analisados</small></span><button type="button" onClick={editActiveConfig}><SlidersHorizontal size={14}/> Editar pesos</button><Link to="/">Abrir análise</Link></div>}
        </article>
        <aside className="panel data-contract-panel">
          <div className="panel-heading"><div><span>Contrato da base</span><h2>O que precisa existir</h2><p>A validação acontece antes de substituir a fonte atual.</p></div></div>
          <div className="data-contract-list"><div><strong>Clientes e contratos</strong><span>Identificador, segmento, plano, receita, SLA e início do contrato.</span></div><div><strong>Histórico mensal</strong><span>Uso, chamados, SLA, reuniões e atraso ao longo do tempo.</span></div><div><strong>Satisfação</strong><span>Resposta, nota e classificação do NPS.</span></div><div><strong>Desfecho</strong><span>Situação atual e mês de cancelamento para ensinar o modelo.</span></div></div>
          <p className="data-contract-note">Os nomes das abas e colunas podem ser diferentes. A configuração de leitura conecta sua estrutura ao modelo.</p>
        </aside>
      </section>}

      {step === 2 && canConfigure && <section className="analysis-step-panel">
        <div className="step-heading"><div><span>Definir análise</span><h2>O que deve orientar o risco?</h2><p>Use o assistente ou edite manualmente as colunas, métricas e pesos.</p></div></div>
        <div className="mode-switch" role="tablist" aria-label="Modo de configuração"><button role="tab" aria-selected={mode === "guided"} className={mode === "guided" ? "is-active" : ""} type="button" onClick={() => setMode("guided")}><ChatCircleDots size={17}/> Assistente guiado</button><button role="tab" aria-selected={mode === "manual"} className={mode === "manual" ? "is-active" : ""} type="button" onClick={() => setMode("manual")}><SlidersHorizontal size={17}/> Editar configuração</button></div>
        {mode === "guided" ? <section className="analysis-chat-layout analysis-chat-layout--single"><article className="panel analysis-chat"><div className="chat-history">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`chat-message chat-message--${item.role}`}><span>{item.role === "assistant" ? <Sparkle size={15}/> : "Você"}</span><p>{item.text}</p></div>)}</div>{guidedWeights}<form className="chat-composer" onSubmit={ask}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explique o objetivo ou uma prioridade que não aparece acima"/><button className="primary-button" aria-label="Enviar" disabled={!message.trim()}><PaperPlaneTilt size={18}/></button></form><div className="consent-row"><span><ShieldCheck size={14}/> Este assistente ajusta apenas a configuração local de métricas e pesos.</span></div></article></section> : detailedConfig}
        <div className="step-actions"><button type="button" className="secondary-button" onClick={() => setStep(1)}>Voltar</button><button type="button" className="primary-button" onClick={() => setStep(3)}>Revisar e continuar <ArrowRight size={17}/></button></div>
      </section>}

      {step === 3 && canConfigure && <form className="panel analysis-review" onSubmit={submit}>
        <div className="panel-heading"><div><span><ShieldCheck size={13}/> Revisar e executar</span><h2>Confirme antes de iniciar</h2><p>{selectedFile ? "A execução recalcula todas as abas com a planilha e pesos atuais." : editingActive ? "A configuração ativa será salva; reenvie a planilha para recalcular os resultados." : "A configuração será salva; reenvie a planilha para recalcular os resultados."}</p></div></div>
        <dl className="review-grid"><div><dt>Fonte</dt><dd>{currentSourceName}</dd></div><div><dt>Objetivo</dt><dd>Churn em 90 dias</dd></div><div><dt>Campos associados</dt><dd>{progress?.mapped ?? 0} de {progress?.total ?? 0}</dd></div><div><dt>Métricas ativas</dt><dd>{activeMetricCount(mapping)} de {metricFields.length}</dd></div></dl>
        <label className="data-field">Nome da fonte<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Ex.: Carteira comercial mensal" /></label>
        <div className="step-actions"><button type="button" className="secondary-button" onClick={() => setStep(2)}>Voltar</button>{selectedFile ? <button className="primary-button" type="submit" disabled={Boolean(processing) || !progress?.complete}>{processing === "analyze" ? "Validando e calculando..." : "Confirmar leitura e analisar"} <ArrowRight size={17}/></button> : <button className="primary-button" type="button" onClick={saveActiveConfig}>Salvar configuração <CheckCircle size={17}/></button>}</div>
      </form>}

      {error && <p className="form-error data-feedback" role="alert">{error}</p>}
      {success && <p className="form-success data-feedback" role="status"><CheckCircle size={17} weight="fill" />{success}</p>}

      <section className="data-source-layout data-source-layout--legacy-hidden">
        <form className="data-registration-panel" onSubmit={submit}>
          <div className="panel-heading"><div><span>Nova fonte</span><h2>Cadastrar planilha ou CSV</h2><p>Primeiro lemos a estrutura; depois você confirma o significado de cada coluna.</p></div><UploadSimple size={25} /></div>
          <label className="data-field">Nome da fonte<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Ex.: Carteira comercial mensal" /></label>
          <label className="data-field">Objetivo da análise<select defaultValue="churn-90"><option value="churn-90">Prever risco de cancelamento em 90 dias</option></select></label>
          <label className={`data-file-drop${selectedFile ? " data-file-drop--selected" : ""}`}><FileXls size={28} /><span><strong>{selectedFile?.name ?? "Escolher arquivo .xlsx ou .csv"}</strong><small>{processing === "inspect" ? "Lendo abas e colunas..." : selectedFile ? `${(selectedFile.size / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB · estrutura lida localmente pelo servidor` : "Clique para selecionar uma base do seu computador"}</small></span><input className="sr-only" type="file" accept=".xlsx,.csv" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} /></label>

          {inspection && mapping && <section className="mapping-config" aria-labelledby="mapping-title">
            <div className="mapping-config__heading"><div><span className="eyebrow"><SlidersHorizontal size={15} /> Configuração de leitura</span><h3 id="mapping-title">Associe as colunas da sua base</h3><p>A sugestão automática pode ser revisada antes de calcular o churn.</p></div><strong>{progress?.mapped}/{progress?.total}<small> campos associados</small></strong></div>
            <div className="mapping-datasets">{datasets.map((dataset, index) => {
              const selectedSheet = inspection.sheets.find((sheet) => sheet.name === mapping.sheets[dataset]);
              return <details className="mapping-dataset" key={dataset} open={index === 0}>
                <summary><span><Table size={17} />{datasetLabels[dataset]}</span><small>{requiredFields[dataset].filter((field) => mapping.columns[dataset]?.[field.key]).length}/{requiredFields[dataset].length}</small></summary>
                <label className="data-field">Origem dos dados<select value={mapping.sheets[dataset]} onChange={(event) => changeSheet(dataset, event.target.value)}>{inspection.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{inspection.format === "csv" ? "Arquivo CSV" : `Aba ${sheet.name}`} · {sheet.rows} linhas</option>)}</select></label>
                <div className="mapping-fields">{requiredFields[dataset].map((field) => <label key={field.key}><span>{field.label}<small>{field.key}</small></span><select value={mapping.columns[dataset]?.[field.key] ?? ""} onChange={(event) => changeColumn(dataset, field.key, event.target.value)}><option value="">Selecionar coluna</option>{selectedSheet?.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}</div>
              </details>;
            })}</div>
            <section className="metric-config" aria-labelledby="metric-config-title">
              <div className="mapping-config__heading"><div><span className="eyebrow"><SlidersHorizontal size={15} /> Pesos e métricas</span><h3 id="metric-config-title">Escolha o que influencia a priorização</h3><p>As métricas desativadas saem do treino. O peso ajusta a importância de negócio na probabilidade final exibida nas abas.</p></div><strong>{metricFields.filter((metric) => mapping.metrics?.[metric.key]?.enabled !== false).length}/{metricFields.length}<small> métricas ativas</small></strong></div>
              <div className="metric-weight-list">{metricFields.map((metric) => {
                const setting = mapping.metrics?.[metric.key] ?? { enabled: true, weight: metric.defaultWeight };
                return <label className="metric-weight-row" key={metric.key}>
                  <span><input type="checkbox" checked={setting.enabled} onChange={(event) => changeMetric(metric.key, { enabled: event.target.checked })}/><strong>{metric.label}</strong><small>{metric.group}</small></span>
                  <select value={setting.weight} disabled={!setting.enabled} onChange={(event) => changeMetric(metric.key, { weight: Number(event.target.value) })} aria-label={`Peso de ${metric.label}`}>
                    <option value={0.5}>Baixo</option>
                    <option value={1}>Normal</option>
                    <option value={1.5}>Alto</option>
                    <option value={2}>Crítico</option>
                  </select>
                </label>;
              })}</div>
            </section>
          </section>}

          <button className="primary-button" type="submit" disabled={Boolean(processing) || !progress?.complete}>{processing === "analyze" ? "Validando e calculando..." : "Confirmar leitura e analisar"} <ArrowRight size={17} /></button>
          {error && <p className="form-error data-feedback" role="alert">{error}</p>}
          {success && <p className="form-success data-feedback" role="status"><CheckCircle size={17} weight="fill" />{success}</p>}
        </form>

        <aside className="panel data-contract-panel">
          <div className="panel-heading"><div><span>Contrato da base</span><h2>O que precisa existir</h2><p>A validação acontece antes de substituir a fonte atual.</p></div></div>
          <div className="data-contract-list"><div><strong>Clientes e contratos</strong><span>Identificador, segmento, plano, receita, SLA e início do contrato.</span></div><div><strong>Histórico mensal</strong><span>Uso, chamados, SLA, reuniões e atraso ao longo do tempo.</span></div><div><strong>Satisfação</strong><span>Resposta, nota e classificação do NPS.</span></div><div><strong>Desfecho</strong><span>Situação atual e mês de cancelamento para ensinar o modelo.</span></div></div>
          <p className="data-contract-note">Os nomes das abas e colunas podem ser diferentes. A configuração de leitura é o que conecta sua estrutura ao modelo.</p>
        </aside>
      </section>

      {account?.spreadsheet && analysis && <section className="panel current-data-panel">
        <div className="panel-heading"><div><span>Fonte ativa</span><h2>{account.spreadsheet.sourceName ?? "Base de clientes"}</h2><p>{account.spreadsheet.fileName} · cadastrada em {account.spreadsheet.importedAt}</p></div><span className="connection-status connection-status--active"><CheckCircle size={14} weight="fill" /> Em uso</span></div>
        <div className="data-model-readiness"><div><span>Clientes na base</span><strong>{analysis.source.entities}</strong></div><div><span>Ativos analisados</span><strong>{analysis.source.activeEntities}</strong></div><div><span>Cancelamentos históricos</span><strong>{analysis.source.cancelledEntities}</strong></div><div><span>Período observado</span><strong>{analysis.source.observedFrom} a {analysis.source.observedUntil}</strong></div></div>
        {account.spreadsheet.mapping && <p className="saved-mapping-note"><SlidersHorizontal size={17} /> Configuração de leitura salva: {mappingProgress(account.spreadsheet.mapping).mapped} campos associados.</p>}
        <div className="data-actions"><Link className="primary-button" to="/">Abrir Dashboard <ArrowRight size={17} /></Link><Link className="secondary-button" to="/previsoes">Ver previsões</Link></div>
      </section>}
    </div>
  );
}

export function GeneralClientDetailPage() {
  const { clienteId } = useParams();
  const { account } = useAuth();
  const { analysis, loading } = useChurnAnalysis(account?.id);
  const location = useLocation();
  const prediction = analysis?.predictions.find((item) => item.subjectId === clienteId);
  const returnTo = (location.state as { from?: string } | null)?.from ?? "/clientes";

  if (loading) return <DataRequiredState loading />;
  if (!prediction || !analysis) return <div className="not-found"><ShieldWarning size={42} /><h1>Cliente não encontrado na fonte ativa</h1><p>Atualize a planilha ou retorne à carteira analisada.</p><Link className="primary-button" to="/clientes">Voltar aos clientes</Link></div>;

  const actions = suggestedActions(prediction);
  const telemetry = account?.profile === "technology" ? clientTechnologyTelemetry(analysis, prediction.subjectId) : undefined;

  return (
    <div className="client-detail-page churn-client-detail">
      <Link className="back-link" to={returnTo}><ArrowLeft size={16} /> Voltar à carteira</Link>
      <section className="client-hero"><div className="client-heading"><span className="eyebrow">Cliente da fonte {analysis.source.fileName}</span><div className="client-title-row"><div><h1>{prediction.subjectId}</h1><p>{prediction.segment} · {prediction.plan} · dados até {analysis.source.observedUntil}</p></div><span className={`churn-band churn-band--${prediction.probabilityBand.toLowerCase()}`}>{churnBandLabel[prediction.probabilityBand]}</span></div></div><div className="client-value"><span>Probabilidade em {analysis.model.horizonDays} dias</span><strong>{percentage(prediction.probability)}</strong><small>{churnBandThreshold[prediction.probabilityBand]}</small></div></section>

      <section className="client-metrics churn-client-metrics client-metrics--grouped" aria-label="Resumo financeiro e operacional">
        <div className="metric-cluster"><header><span>Impacto financeiro</span><small>Quanto está exposto</small></header><div className="metric-cluster-grid metric-cluster-grid--financial">
          <div className="client-metric"><span>Receita mensal</span><strong>{formatCurrency(prediction.monthlyRevenue)}</strong><small>Valor registrado na base</small></div>
          <div className="client-metric"><span>Receita mensal em risco</span><strong>{formatCurrency(prediction.expectedMonthlyRevenueAtRisk)}</strong><small>Probabilidade × receita</small></div>
        </div></div>
        <div className="metric-cluster"><header><span>Saúde do relacionamento</span><small>O que exige atenção agora</small></header><div className="metric-cluster-grid metric-cluster-grid--health">
          <div className="client-metric"><span>Uso e tendência</span><strong>{valueOrDash(prediction.evidence.usage.current, "%")}</strong><small>{prediction.evidence.usage.change3m == null ? "Sem histórico comparável" : `${prediction.evidence.usage.change3m < 0 ? "Caiu" : "Subiu"} ${Math.abs(prediction.evidence.usage.change3m)} p.p. em 3 meses`}</small></div>
          <div className="client-metric"><span>SLA de atendimento</span><strong>{valueOrDash(prediction.evidence.service.slaCurrent, "%")}</strong><small>Variação 3m: {valueOrDash(prediction.evidence.service.slaChange3m, " p.p.")}</small></div>
          <div className="client-metric"><span>Chamados críticos</span><strong>{valueOrDash(prediction.evidence.service.criticalTickets)}</strong><small>Exigem acompanhamento</small></div>
          <div className="client-metric"><span>Satisfação (NPS)</span><strong>{valueOrDash(prediction.evidence.relationship.latestNps)}</strong><small>{prediction.evidence.relationship.npsClassification || "Não classificado"}</small></div>
        </div></div>
      </section>

      <ClientPredictiveContext prediction={prediction} analysis={analysis} telemetry={telemetry} />

      {account?.profile === "technology" && (
        <ProductUsageAnalytics clientId={prediction.subjectId} demoEvents={[]} />
      )}

      <details className="detail-audit panel">
        <summary><span><Database size={16} /> Ver dados complementares e recomendações</span><small>Detalhamento para auditoria da análise</small></summary>
        <div className="detail-main-grid">
          <article><div className="panel-heading"><div><span>Dados complementares</span><h2>O que não aparece no resumo</h2><p>Informações adicionais da fonte, sem repetir os indicadores acima.</p></div></div><div className="evidence-detail-list"><div><span>Cobertura usada no cálculo</span><strong>{Math.round(prediction.dataCoverage * 100)}%</strong></div><div><span>Chamados abertos</span><strong>{valueOrDash(prediction.evidence.service.openTickets)}</strong></div><div><span>Chamados reabertos</span><strong>{valueOrDash(prediction.evidence.service.reopenedTickets)}</strong></div><div><span>Tempo médio de resolução</span><strong>{valueOrDash(prediction.evidence.service.resolutionHours, "h")}</strong></div><div><span>Reuniões realizadas</span><strong>{valueOrDash(prediction.evidence.relationship.meetingsCompleted)} de {valueOrDash(prediction.evidence.relationship.meetingsPlanned)}</strong></div><div><span>Atraso financeiro</span><strong>{valueOrDash(prediction.evidence.financial.paymentDelayDays, " dias")}</strong></div></div></article>
          <article><div className="panel-heading"><div><span>Próximo passo</span><h2>Ações coerentes com as evidências</h2><p>Recomendações geradas por regras transparentes sobre os dados observados.</p></div></div><div className="actions-list">{actions.map((action, index) => <div className="action-item" key={action}><span className="action-index">{index + 1}</span><div><strong>{action}</strong><p>Validar o contexto com o responsável antes de registrar uma ação definitiva.</p></div></div>)}</div></article>
        </div>
      </details>

      <section className="panel data-lineage-panel"><div><Database size={20} /><span><strong>Rastreabilidade</strong><small>Fonte {analysis.source.fileName}, execução gerada em {new Date(analysis.generatedAt).toLocaleString("pt-BR")}, modelo {analysis.model.version} e referência {analysis.predictionRun.asOfDate}.</small></span></div></section>
    </div>
  );
}
