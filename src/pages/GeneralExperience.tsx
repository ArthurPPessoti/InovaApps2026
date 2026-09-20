import {
  ArrowLeft,
  ArrowRight,
  ChartBar,
  CheckCircle,
  CurrencyCircleDollar,
  Database,
  FileXls,
  Funnel,
  MagnifyingGlass,
  ShieldWarning,
  SlidersHorizontal,
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
import { datasetLabels, mappingProgress, requiredFields, suggestSpreadsheetMapping } from "../churn/spreadsheetMapping";
import { clientTechnologyTelemetry } from "../churn/technologySignals";
import type { CanonicalDataset, ChurnBand, SpreadsheetInspection, SpreadsheetMapping } from "../churn/types";
import { formatCurrency } from "../components/StatusUI";
import { ConnectedPredictiveScenarios } from "../churn/ConnectedPredictiveScenarios";
import { ClientPredictiveContext } from "../churn/ClientPredictiveContext";

const bandColors: Record<ChurnBand, string> = { LOW: "#00f3ff", ATTENTION: "#ffba49", HIGH: "#ff6b78", CRITICAL: "#ff3355" };

function percentage(value: number | null) {
  return value == null ? "Não informado" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function valueOrDash(value: number | null, suffix = "") {
  return value == null ? "Não informado" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
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
  const [mapping, setMapping] = useState<SpreadsheetMapping | null>(account?.spreadsheet?.mapping ?? null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processing, setProcessing] = useState<"" | "inspect" | "analyze">("");
  const datasets = Object.keys(requiredFields) as CanonicalDataset[];
  const progress = mapping ? mappingProgress(mapping) : null;

  const selectFile = async (file: File | null) => {
    setSelectedFile(file);
    setInspection(null);
    setMapping(null);
    setError("");
    setSuccess("");
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) return setError("Selecione um arquivo .xlsx ou .csv.");
    setProcessing("inspect");
    try {
      const result = await inspectSpreadsheet(file);
      setInspection(result);
      setMapping(suggestSpreadsheetMapping(result));
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
    });
  };

  const changeColumn = (dataset: CanonicalDataset, field: string, column: string) => {
    if (!mapping) return;
    setMapping({ ...mapping, columns: { ...mapping.columns, [dataset]: { ...mapping.columns[dataset], [field]: column } } });
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
      const result = await analyzeSpreadsheet(selectedFile, mapping);
      if (account) saveChurnAnalysis(account.id, result);
      updateSpreadsheet(selectedFile.name, result.source.entities, sourceName.trim(), mapping);
      setSuccess(`${sourceName.trim()} foi cadastrada e todas as telas foram atualizadas.`);
      setSelectedFile(null);
      setInspection(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar a planilha.");
    } finally {
      setProcessing("");
    }
  };

  return (
    <div className="data-page">
      <header className="page-heading"><div><span className="eyebrow"><FileXls size={16} weight="duotone" /> Fonte e leitura dos dados</span><h1>Configure como a plataforma deve interpretar sua base.</h1><p>{account?.profile === "technology" ? "Os clientes e dados operacionais vêm desta fonte; tracking e conexões demonstrativas apenas complementam a análise." : "Dashboard, Previsões, Clientes e Gestão usam exclusivamente os campos associados nesta importação."}</p></div></header>

      <section className="data-source-layout">
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
