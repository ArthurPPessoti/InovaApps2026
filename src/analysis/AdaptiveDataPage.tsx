import { ArrowRight, Brain, ChatCircleDots, CheckCircle, FileXls, Info, PaperPlaneTilt, ShieldCheck, SlidersHorizontal, Sparkle, UploadSimple, Warning, X } from "@phosphor-icons/react";
import { gsap } from "gsap";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAdaptiveAnalysis } from "./AnalysisContext";
import { ConfigEditor } from "./ConfigEditor";
import { askAnalysisAssistant, profileSource, runAnalysis, validateAnalysis } from "./analysisApi";
import type { AnalysisConfig, AssistantMessage, ImportanceLevel, MetricConfig, SourceProfileResponse } from "./types";

const importanceLabels: Record<ImportanceLevel, string> = { VERY_LOW: "Muito baixa", LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", CRITICAL: "Crítica" };
const importanceWeights: Record<ImportanceLevel, number> = { VERY_LOW: 1, LOW: 2, MEDIUM: 4, HIGH: 7, CRITICAL: 10 };
const importanceOptions = (Object.keys(importanceLabels) as ImportanceLevel[]).map((value) => ({
  value,
  label: importanceLabels[value],
  weight: importanceWeights[value],
}));

// O motor não adivinha a direção de coluna com nome desconhecido: ela chega como
// INFORMATIONAL e fica fora da conta até alguém responder aqui.
const directionOptions: { value: MetricConfig["riskType"]; label: string }[] = [
  { value: "HIGH_IS_RISK", label: "Maior é pior" },
  { value: "LOW_IS_RISK", label: "Menor é pior" },
  { value: "INFORMATIONAL", label: "Não usar" },
];

const capabilityLabels: Record<string, string> = {
  time: "Datas", businessValue: "Valor", segment: "Segmento", target: "Resultado",
  history: "Histórico", owner: "Responsável", contact: "Contato", location: "Local", telemetry: "Telemetria",
};

function MiniDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="mini-dialog" onClose={onClose}>
      <header><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={16}/></button></header>
      {children}
      <button type="button" className="primary-button" onClick={onClose}>Entendi</button>
    </dialog>
  );
}

// Primeira leitura da IA: o que ela pretende usar como sinal, com quais pesos, e o que vai deixar de fora.
function firstReading(profiled: SourceProfileResponse) {
  const columns = profiled.profile.sheets.reduce((sum, sheet) => sum + sheet.columns.length, 0);
  const included = profiled.suggestedConfig.metrics.filter((metric) => metric.included);
  const strongest = included
    .slice()
    .sort((a, b) => importanceWeights[b.importance] - importanceWeights[a.importance] || b.confidence - a.confidence)
    .slice(0, 3)
    .map((metric) => `${metric.meaning || metric.column}: ${importanceLabels[metric.importance]} (${importanceWeights[metric.importance]})`);
  const ignored = profiled.suggestedConfig.metrics.length - included.length;
  const base = `Li ${profiled.profile.sheets.length} aba(s), ${profiled.profile.totalRows} linhas e ${columns} colunas.`;
  const reading = included.length
    ? ` Sugeri ${included.length} coluna(s) como sinal e deixei ${ignored} de fora. As maiores prioridades iniciais são ${strongest.join(", ")}. Abaixo, escolha uma pill para ajustar cada peso: Crítica vale 10, Alta 7, Média 4, Baixa 2 e Muito baixa 1.`
    : " Ainda não encontrei colunas com variação suficiente para virar sinal.";
  return `${base}${reading} Depois, explique o que você quer antecipar para eu revisar a configuração com você.`;
}

function mergeConfig(base: AnalysisConfig, patch: Partial<AnalysisConfig>): AnalysisConfig {
  return { ...base, ...patch, objective: { ...base.objective, ...(patch.objective ?? {}) } };
}

function preserveMetricChoices(next: AnalysisConfig, previous: AnalysisConfig | null): AnalysisConfig {
  if (!previous) return next;
  const choices = new Map(previous.metrics.map((metric) => [`${metric.sheet}::${metric.column}`, metric]));
  return {
    ...next,
    importanceMode: previous.importanceMode,
    metrics: next.metrics.map((metric) => {
      const saved = choices.get(`${metric.sheet}::${metric.column}`);
      return saved ? { ...metric, included: saved.included, importance: saved.importance, numericWeight: saved.numericWeight } : metric;
    }),
  };
}

export function AdaptiveDataPage() {
  const { updateSpreadsheet } = useAuth();
  const { result, config: savedConfig, saveConfigDraft, saveExecution } = useAdaptiveAnalysis();
  const [source, setSource] = useState<SourceProfileResponse | null>(null);
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"guided" | "manual">("guided");
  const [messages, setMessages] = useState<AssistantMessage[]>([{ role: "assistant", text: "Depois de ler a fonte, vou ajudar você a definir o que deseja antecipar e quais dados são importantes." }]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"profile" | "assistant" | "run" | "">("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sampleInfo, setSampleInfo] = useState(false);
  const [editingActive, setEditingActive] = useState(false);
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const stepPanelRef = useRef<HTMLElement>(null);

  const goToStep = (next: 1 | 2 | 3) => {
    setStep(next);
    requestAnimationFrame(() => stepPanelRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!stepPanelRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(stepPanelRef.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", clearProps: "transform,opacity,visibility" });
    }, stepPanelRef);
    return () => context.revert();
  }, [step]);

  const schemaDiff = useMemo(() => {
    if (!source || !result) return null;
    const current = new Map(result.profile.sheets.flatMap((sheet) => sheet.columns.map((column) => [`${sheet.name}::${column.name}`, column.physicalType])));
    const next = new Map(source.profile.sheets.flatMap((sheet) => sheet.columns.map((column) => [`${sheet.name}::${column.name}`, column.physicalType])));
    return { added: [...next.keys()].filter((key) => !current.has(key)), removed: [...current.keys()].filter((key) => !next.has(key)), changed: [...next.keys()].filter((key) => current.has(key) && current.get(key) !== next.get(key)) };
  }, [result, source]);

  const guidedMetrics = useMemo(() => config?.metrics
    .filter((metric) => metric.included)
    .sort((a, b) => importanceWeights[b.importance] - importanceWeights[a.importance] || b.confidence - a.confidence) ?? [], [config]);
  const pendingDirection = useMemo(() => guidedMetrics.filter((metric) => metric.riskType === "INFORMATIONAL").length, [guidedMetrics]);
  const adjustedWeights = useMemo(() => {
    if (!source || !config) return 0;
    const initial = new Map(source.suggestedConfig.metrics.map((metric) => [metric.id, metric.importance]));
    return config.metrics.filter((metric) => initial.get(metric.id) !== metric.importance).length;
  }, [config, source]);

  const selectFile = async (selected: File | null) => {
    setFile(selected); setError(""); setWarnings([]); setSource(null); setConfig(null);
    goToStep(1);
    if (!selected) return;
    if (!/\.(xlsx|csv)$/i.test(selected.name)) return setError("Selecione um arquivo .xlsx ou .csv.");
    setBusy("profile");
    try {
      const profiled = await profileSource(selected);
      const configured = preserveMetricChoices(profiled.suggestedConfig, editingActive ? config : savedConfig);
      setSource({ ...profiled, suggestedConfig: configured }); setConfig(configured); setWarnings(profiled.profile.warnings);
      setEditingActive(false); setNotice(""); setMessages([{ role: "assistant", text: firstReading({ ...profiled, suggestedConfig: configured }) }]);
      goToStep(2);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível ler a fonte."); }
    finally { setBusy(""); }
  };

  const ask = async (text: string) => {
    if (!source || !config || !text.trim()) return;
    const next = [...messages, { role: "user" as const, text: text.trim() }];
    setMessages(next); setMessage(""); setBusy("assistant");
    try {
      const turn = await askAnalysisAssistant({ profile: source.profile, config, messages: next });
      setMessages([...next, { role: "assistant", text: turn.reply }]);
      setWarnings(turn.warnings);
      if (turn.configPatch) setConfig((current) => current ? mergeConfig(current, turn.configPatch!) : current);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "O assistente não respondeu."); }
    finally { setBusy(""); }
  };

  const updateMetric = (id: string, patch: Partial<MetricConfig>) => setConfig((current) => current ? { ...current, metrics: current.metrics.map((metric) => metric.id === id ? { ...metric, ...patch } : metric) } : current);

  const editActiveConfig = () => {
    if (!result) return;
    const active = structuredClone(savedConfig ?? result.config);
    setConfig(active); setMode("guided"); setEditingActive(true); setNotice(""); setError("");
    setMessages([{ role: "assistant", text: `Carreguei os pesos usados na análise de ${result.source.fileName}. Ajuste as pills abaixo. As mudanças só alteram os resultados depois de um novo cálculo.` }]);
    goToStep(2);
  };

  const persistDraft = () => {
    if (!config) return;
    saveConfigDraft(config);
    setNotice("Pesos salvos. Reenvie a mesma planilha para recalcular os resultados com esta configuração.");
  };

  const execute = async () => {
    if (!config) return;
    const sourceToken = source?.sourceToken ?? result?.source.token;
    const expiresAt = source?.expiresAt ?? result?.source.expiresAt;
    if (!sourceToken || (expiresAt && Date.parse(expiresAt) <= Date.now())) {
      persistDraft();
      setError("O arquivo temporário não está mais disponível. Os pesos foram salvos; reenvie a mesma planilha para recalcular.");
      return;
    }
    setBusy("run"); setError("");
    try {
      const validation = await validateAnalysis(sourceToken, config);
      setWarnings(validation.warnings);
      if (!validation.valid) throw new Error(validation.errors.join(" "));
      const next = await runAnalysis(sourceToken, config);
      saveExecution({ ...next, source: { ...next.source, token: sourceToken, expiresAt } });
      updateSpreadsheet(file?.name ?? next.source.fileName, next.profile.totalRows, "Análise adaptativa V2");
      setSource(null); setConfig(null); setFile(null); setEditingActive(false); setNotice("");
      goToStep(1);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível executar a análise."); }
    finally { setBusy(""); }
  };

  const onChatSubmit = (event: FormEvent) => { event.preventDefault(); void ask(message); };
  const canConfigure = Boolean((source || editingActive) && config);
  const profile = source?.profile ?? result?.profile;
  const sourceName = file?.name ?? result?.source.fileName ?? "Fonte carregada";
  const usedMetrics = config?.metrics.filter((metric) => metric.included).length ?? 0;
  const steps = [
    { number: 1, label: "Enviar base" },
    { number: 2, label: "Definir análise" },
    { number: 3, label: "Revisar e executar" },
  ] as const;

  return <div className="data-page adaptive-data-page">
    <header className="page-heading"><div><span className="eyebrow"><FileXls size={16}/> Análise da sua base</span><h1>Sua planilha vira uma análise de risco.</h1><p>Envie a base, ajuste o que importa e revise antes de executar.</p></div></header>

    <nav className="analysis-stepper" aria-label="Etapas da análise">
      <ol>{steps.map((item) => {
        const available = item.number === 1 || (item.number === 2 && canConfigure) || item.number === step;
        const completed = item.number < step;
        return <li key={item.number} className={completed ? "is-complete" : item.number === step ? "is-current" : ""}>
          <button type="button" disabled={!available} aria-current={item.number === step ? "step" : undefined} onClick={() => available && goToStep(item.number)}>
            <span aria-hidden="true">{completed ? <CheckCircle size={18} weight="fill"/> : item.number}</span>
            <strong>{item.label}</strong>
          </button>
        </li>;
      })}</ol>
    </nav>

    {step > 1 && profile && <article className="workflow-summary">
      <CheckCircle size={18} weight="fill"/>
      <span><strong>{sourceName}</strong><small>{profile.sheets.length} aba(s), {profile.totalRows} linhas, {Math.round(profile.quality * 100)}% de qualidade</small></span>
      <button type="button" onClick={() => goToStep(1)}>Trocar base</button>
    </article>}

    {step === 3 && config && <article className="workflow-summary">
      <CheckCircle size={18} weight="fill"/>
      <span><strong>{config.objective.behavior || "Objetivo da análise"}</strong><small>{usedMetrics} colunas em uso, horizonte de {config.objective.horizonDays} dias</small></span>
      <button type="button" onClick={() => goToStep(2)}>Editar configuração</button>
    </article>}

    <section ref={stepPanelRef} className="analysis-step-panel" tabIndex={-1} aria-labelledby={`analysis-step-${step}-title`}>
      {step === 1 && <div className="adaptive-source-grid">
        <article className="panel adaptive-upload-panel">
          <div className="panel-heading"><div><span><UploadSimple size={13}/> Enviar base</span><h2 id="analysis-step-1-title">Importar Excel ou CSV</h2><p>Até 50 MB. O arquivo fica no servidor por até 60 minutos.</p></div></div>
          <label className={`data-file-drop${file ? " data-file-drop--selected" : ""}`}><FileXls size={28}/><span><strong>{file?.name ?? "Escolher arquivo"}</strong><small>{busy === "profile" ? "Lendo abas, tipos e relações..." : "Arraste aqui ou clique para selecionar"}</small></span><input className="sr-only" type="file" accept=".xlsx,.csv" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}/></label>
          {result && <div className="active-run-card"><CheckCircle size={18} weight="fill"/><span><strong>Execução ativa</strong><small>{result.source.fileName} · {result.summary.analyzedEntities} {result.config.objective.entityLabelPlural}</small></span><button type="button" onClick={editActiveConfig}><SlidersHorizontal size={14}/> Editar pesos</button><Link to="/">Abrir análise</Link></div>}
        </article>
        {source && <article className="panel profile-summary"><div className="panel-heading"><div><span>Perfil automático</span><h2>{source.profile.sheets.length} aba(s) · {source.profile.totalRows} linhas</h2></div></div><div className="profile-kpis"><div><strong>{Math.round(source.profile.quality * 100)}%</strong><span>qualidade</span></div><div><strong>{source.profile.relationships.length}</strong><span>relações sugeridas</span></div><div><strong>{source.profile.sheets.reduce((sum, sheet) => sum + sheet.columns.length, 0)}</strong><span>colunas</span></div></div><div className="capability-chips">{Object.entries(source.profile.capabilities).filter(([, enabled]) => enabled).map(([key]) => <span key={key} className="is-enabled">{capabilityLabels[key] ?? key}</span>)}{Object.values(source.profile.capabilities).filter((enabled) => !enabled).length > 0 && <span>{Object.values(source.profile.capabilities).filter((enabled) => !enabled).length} não identificadas</span>}</div><button type="button" className="primary-button step-primary-action" onClick={() => goToStep(2)}>Continuar para configuração <ArrowRight size={17}/></button></article>}
      </div>}

      {step === 2 && canConfigure && config && <>
        <div className="step-heading"><div><span>Definir análise</span><h2 id="analysis-step-2-title">O que deve orientar o risco?</h2><p>Revise a sugestão da IA ou abra todos os campos para um ajuste detalhado.</p></div></div>
        {schemaDiff && (schemaDiff.added.length + schemaDiff.removed.length + schemaDiff.changed.length > 0) && <section className="schema-diff"><Info size={19}/><div><strong>Diferenças em relação à execução ativa</strong><p>{schemaDiff.added.length} coluna(s) nova(s), {schemaDiff.removed.length} removida(s) e {schemaDiff.changed.length} com tipo alterado. Revise antes de executar.</p></div></section>}
        <div className="mode-switch" role="tablist" aria-label="Modo de configuração"><button role="tab" aria-selected={mode === "guided"} className={mode === "guided" ? "is-active" : ""} type="button" onClick={() => setMode("guided")}><ChatCircleDots size={17}/> Assistente guiado</button><button role="tab" aria-selected={mode === "manual"} className={mode === "manual" ? "is-active" : ""} type="button" onClick={() => setMode("manual")}><SlidersHorizontal size={17}/> Editar configuração</button></div>
        {mode === "guided" ? <section className="analysis-chat-layout"><article className="panel analysis-chat"><div className="chat-history">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`chat-message chat-message--${item.role}`}><span>{item.role === "assistant" ? <Sparkle size={15}/> : "Você"}</span><p>{item.text}</p></div>)}{busy === "assistant" && <div className="chat-message chat-message--assistant"><span><Sparkle size={15}/></span><p>Analisando sua resposta...</p></div>}</div><section className="guided-weights" aria-labelledby="guided-weights-title"><header><div><span>Sugestão inicial da IA</span><h3 id="guided-weights-title">Qual é a importância de cada coluna?</h3><p>O peso é relativo, não uma porcentagem. A direção diz se o risco está no valor alto ou no baixo.</p></div><strong aria-live="polite">{adjustedWeights ? `${adjustedWeights} ajustado(s)` : `${guidedMetrics.length} sugerido(s)`}</strong></header>{pendingDirection > 0 && <p className="direction-notice"><Warning size={16}/> <span>{pendingDirection === 1 ? "Uma coluna ainda não tem direção de risco e fica fora do cálculo." : `${pendingDirection} colunas ainda não têm direção de risco e ficam fora do cálculo.`} Pelo nome não dá para saber se o risco está no valor alto ou no baixo, então essa resposta é sua.</span></p>}<div className="guided-weight-list">{guidedMetrics.map((metric) => { const name = metric.meaning || metric.column; const undefinedDirection = metric.riskType === "INFORMATIONAL"; return <article className={undefinedDirection ? "guided-weight-row needs-direction" : "guided-weight-row"} key={metric.id}><div className="guided-weight-name"><strong>{name}</strong><span>{metric.sheet} · {metric.column}</span>{undefinedDirection && <em>Sem direção definida</em>}</div><div><div className="weight-pills" role="radiogroup" aria-label={`Importância de ${name}`}>{importanceOptions.map((option) => <button key={option.value} type="button" role="radio" aria-checked={metric.importance === option.value} className={metric.importance === option.value ? "is-selected" : ""} onClick={() => updateMetric(metric.id, { importance: option.value, numericWeight: option.weight })}><span>{option.label}</span><small>{option.weight}</small></button>)}</div><div className="direction-pills" role="radiogroup" aria-label={`Direção do risco de ${name}`}>{directionOptions.map((option) => <button key={option.value} type="button" role="radio" aria-checked={metric.riskType === option.value} className={metric.riskType === option.value ? "is-selected" : ""} onClick={() => updateMetric(metric.id, { riskType: option.value })}>{option.label}</button>)}</div></div></article>; })}</div><button type="button" className="link-button guided-weights-edit" onClick={() => setMode("manual")}><SlidersHorizontal size={14}/> Ver todas as colunas e configurações</button></section><form className="chat-composer" onSubmit={onChatSubmit}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explique o objetivo ou uma prioridade que não aparece acima"/><button className="primary-button" aria-label="Enviar" disabled={!message.trim() || Boolean(busy)}><PaperPlaneTilt size={18}/></button></form><div className="consent-row"><span><ShieldCheck size={14}/> A IA recebe cinco linhas de exemplo com dados sintéticos.</span><button type="button" className="link-button" onClick={() => setSampleInfo(true)}><Brain size={14}/> Como funciona</button></div></article></section> : <ConfigEditor config={config} onChange={setConfig}/>}
        <div className="step-actions"><button type="button" className="secondary-button" onClick={() => goToStep(1)}>Voltar</button><button type="button" className="primary-button" onClick={() => goToStep(3)}>Revisar e continuar <ArrowRight size={17}/></button></div>
      </>}

      {step === 3 && config && <article className="panel analysis-review">
        <div className="panel-heading"><div><span><ShieldCheck size={13}/> Revisar e executar</span><h2 id="analysis-step-3-title">Confirme antes de iniciar</h2><p>A execução usa a configuração abaixo e só começa após sua aprovação.</p></div></div>
        <dl className="review-grid"><div><dt>Objetivo</dt><dd>{config.objective.behavior || "Não informado"}</dd></div><div><dt>Horizonte</dt><dd>{config.objective.horizonDays} dias</dd></div><div><dt>Registros</dt><dd>{config.objective.entityLabelPlural}</dd></div><div><dt>Colunas em uso</dt><dd>{usedMetrics} de {config.metrics.length}</dd></div></dl>
        <label className="review-confirmation"><input type="checkbox" checked={config.objective.confirmed} onChange={(event) => setConfig({ ...config, objective: { ...config.objective, confirmed: event.target.checked } })}/><span><strong>Confirmo o objetivo e o horizonte</strong><small>{editingActive && !result?.source.token ? "Salve os pesos e reenvie a fonte para recalcular." : "Revise os dados acima antes de executar."}</small></span></label>
        <div className="step-actions"><button type="button" className="secondary-button" onClick={() => goToStep(2)}>Voltar</button>{editingActive && !result?.source.token ? <button className="primary-button" type="button" onClick={persistDraft}>Salvar pesos <CheckCircle size={17}/></button> : <button className="primary-button" type="button" disabled={!config.objective.confirmed || Boolean(busy)} onClick={() => void execute()}>{busy === "run" ? "Validando e executando..." : "Aprovar e analisar"} <ArrowRight size={17}/></button>}</div>
      </article>}
    </section>

    {notice && <p className="form-success data-feedback" role="status"><CheckCircle size={17} weight="fill"/>{notice}</p>}
    {warnings.length > 0 && <section className="analysis-warnings"><Warning size={19}/><div><strong>Pontos para revisar</strong>{warnings.map((item) => <p key={item}>{item}</p>)}</div></section>}
    {error && <p className="form-error data-feedback" role="alert">{error}</p>}
    <MiniDialog open={sampleInfo} title="Como os exemplos são gerados" onClose={() => setSampleInfo(false)}>
      <p>Nenhum dado da sua planilha é enviado à IA. O sistema gera cinco linhas sintéticas que imitam apenas o formato de cada coluna.</p>
      <p>CPF, CNPJ, telefone, e-mail, nomes e códigos viram valores inventados no mesmo formato. Números respeitam a faixa da coluna e datas mantêm o padrão.</p>
      <p>Situações e categorias (como "Ativo" ou "Plano Enterprise") são preservadas, porque dão contexto e não identificam ninguém.</p>
    </MiniDialog>
  </div>;
}
