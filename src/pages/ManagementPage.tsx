import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  ClipboardText,
  Funnel,
  Lightbulb,
  Plus,
  ShieldWarning,
  Target,
  TrendDown,
  TrendUp,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { RiskBadge, formatCurrency } from "../components/StatusUI";
import {
  managementDemoToday,
  managementFinancialSeries,
  managementOwners,
  portfolioHealthSeries,
  productFamily,
  renewalMocks,
} from "../data/managementData";
import { allProducts, companyPortfolios, getCompany } from "../data/mockData";
import { useManagement } from "../management/ManagementContext";
import { cancelledClients } from "../retention/RetentionContext";
import type { RetentionCaseStage } from "../types";

const stageOrder: RetentionCaseStage[] = ["detected", "contacted", "in_progress", "recovered"];
const stageLabels: Record<RetentionCaseStage, string> = {
  detected: "Sinal detectado",
  contacted: "Cliente contatado",
  in_progress: "Ação em andamento",
  recovered: "Recuperado",
};
const heatmapFamilies = ["Operações", "Analytics", "Suporte", "Integrações", "Automação", "IA", "Transformação"];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}: {item.value} mil</span>)}</div>;
}

export function ManagementPage() {
  const { account } = useAuth();
  const { cases, addCase, updateCase } = useManagement();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ productId: allProducts[0].id, title: "", owner: managementOwners[0], dueDate: "2026-09-26", stage: "detected" as RetentionCaseStage, note: "" });
  const isTechnology = account?.profile === "technology";

  const funnelData = stageOrder.map((stage, index) => {
    const matching = cases.filter((item) => stageOrder.indexOf(item.stage) >= index);
    return {
      stage,
      label: stageLabels[stage],
      value: matching.length,
      revenue: matching.reduce((sum, item) => sum + (allProducts.find((product) => product.id === item.productId)?.monthlyRevenue ?? 0), 0),
    };
  });

  const overdueCases = cases.filter((item) => item.stage !== "recovered" && item.dueDate < managementDemoToday);
  const inProgressCases = cases.filter((item) => item.stage === "in_progress");
  const septemberLost = cancelledClients.filter((item) => item.cancellationMonth === "Set").reduce((sum, item) => sum + item.monthlyRevenueLost, 0);

  const ownerData = useMemo(() => managementOwners.map((owner) => {
    const ownedCompanies = companyPortfolios.filter((portfolio) => portfolio.company.owner === owner);
    const ownedProducts = ownedCompanies.flatMap((portfolio) => portfolio.products);
    return {
      owner: owner.split(" ")[0],
      fullName: owner,
      companies: ownedCompanies.length,
      overdue: overdueCases.filter((item) => item.owner === owner).length,
      Alto: Math.round(ownedProducts.filter((product) => product.riskLevel === "Alto").reduce((sum, product) => sum + product.monthlyRevenue, 0) / 1000),
      Médio: Math.round(ownedProducts.filter((product) => product.riskLevel === "Médio").reduce((sum, product) => sum + product.monthlyRevenue, 0) / 1000),
      Baixo: Math.round(ownedProducts.filter((product) => product.riskLevel === "Baixo").reduce((sum, product) => sum + product.monthlyRevenue, 0) / 1000),
    };
  }), [overdueCases]);

  const mostExposedOwner = [...ownerData].sort((a, b) => (b.Alto + b.Médio) - (a.Alto + a.Médio))[0];
  const overdueRevenue = overdueCases.reduce((sum, item) => sum + (allProducts.find((product) => product.id === item.productId)?.monthlyRevenue ?? 0), 0);
  const supportProducts = allProducts.filter((product) => product.productName === "Suporte Dedicado");
  const supportAverage = Math.round(supportProducts.reduce((sum, product) => sum + product.riskScore, 0) / supportProducts.length);
  const atlasPortfolio = companyPortfolios.find((portfolio) => portfolio.company.id === "atlas-logistica");
  const funnelEfficiency = funnelData[0].value ? Math.round((funnelData[3].value / funnelData[0].value) * 100) : 0;

  const createCase = (event: FormEvent) => {
    event.preventDefault();
    addCase(draft);
    setDraft({ productId: allProducts[0].id, title: "", owner: managementOwners[0], dueDate: "2026-09-26", stage: "detected", note: "" });
    setShowForm(false);
  };

  return (
    <div className="management-page">
      <header className="page-heading management-heading">
        <div><span className="eyebrow"><Briefcase size={16} weight="duotone" /> Gestão da retenção</span><h1>O time está agindo sobre os riscos?</h1><p>{isTechnology ? "Transforme sinais de uso, suporte e relacionamento em uma operação clara de retenção." : "Transforme evidências da base de dados em responsáveis, prazos e resultados mensuráveis."}</p></div>
        <div className="management-period"><small>Período demonstrativo</small><strong>Abr — Set 2026</strong><span>Atualizado hoje às 09:42</span></div>
      </header>

      <section className="management-metrics" aria-label="Indicadores de gestão">
        <article><span><Target size={20} /></span><small>Produtos acompanhados</small><strong>{funnelData[0].value}</strong><p>Com sinal e caso aberto</p></article>
        <article><span><ClipboardText size={20} /></span><small>Ações em andamento</small><strong>{inProgressCases.length}</strong><p>Execução ativa</p></article>
        <article className="management-metric--warning"><span><WarningCircle size={20} /></span><small>Ações atrasadas</small><strong>{overdueCases.length}</strong><p>{formatCurrency(overdueRevenue)} associados</p></article>
        <article className="management-metric--positive"><span><TrendUp size={20} /></span><small>Receita recuperada</small><strong>R$ 74 mil</strong><p>No mês demonstrativo</p></article>
        <article className="management-metric--loss"><span><TrendDown size={20} /></span><small>Receita perdida</small><strong>R$ 30,5 mil</strong><p>{formatCurrency(septemberLost)} reconciliados</p></article>
        <article><span><CalendarCheck size={20} /></span><small>Renovações próximas</small><strong>{renewalMocks.length}</strong><p>Nos próximos 90 dias</p></article>
      </section>

      <section className="management-insights" aria-label="Insights explicáveis">
        <div className="management-insights__heading"><Lightbulb size={22} weight="duotone" /><div><small>Leitura automática demonstrativa</small><h2>O que merece atenção da gestão</h2></div></div>
        <div className="management-insights__rail">
          <Link to="/clientes?status=atencao"><strong>Risco sistêmico em Suporte</strong><p>{supportProducts.length} contratos têm score médio {supportAverage}.</p><span>Ver produtos <ArrowRight size={13} /></span></Link>
          <Link to="/empresas/atlas-logistica"><strong>Risco oculto na Atlas</strong><p>{atlasPortfolio?.criticalAlert?.productName} está crítico mesmo com a conta consolidada em nível médio.</p><span>Ver empresa <ArrowRight size={13} /></span></Link>
          <a href="#responsaveis"><strong>Concentração por responsável</strong><p>{mostExposedOwner.fullName} concentra R$ {mostExposedOwner.Alto + mostExposedOwner.Médio} mil em atenção.</p><span>Comparar carteira <ArrowRight size={13} /></span></a>
          <a href="#acoes"><strong>Prazos comprometidos</strong><p>{overdueCases.length} ações vencidas afetam {formatCurrency(overdueRevenue)}.</p><span>Revisar ações <ArrowRight size={13} /></span></a>
          <a href="#funil-retencao"><strong>Eficiência do funil</strong><p>{funnelEfficiency}% dos casos detectados chegaram à recuperação.</p><span>Entender conversão <ArrowRight size={13} /></span></a>
          <a href="#movimento-financeiro"><strong>Saldo positivo de retenção</strong><p>Recuperado supera perdas em R$ 43,5 mil neste mês.</p><span>Ver movimento <ArrowRight size={13} /></span></a>
        </div>
      </section>

      <section className="management-grid">
        <article id="funil-retencao" className="panel management-funnel-panel">
          <div className="panel-heading"><div><span>Execução</span><h2>Funil de retenção</h2><p>Conversão acumulada desde a detecção até a recuperação.</p></div><Funnel size={24} /></div>
          <div className="retention-funnel-chart">
            {funnelData.map((item, index) => <div className={`retention-funnel-step retention-funnel-step--${item.stage}`} key={item.stage} style={{ width: `${100 - index * 12}%` }}><div><span>{item.label}</span><small>{index ? `${Math.round(item.value / funnelData[index - 1].value * 100)}% da etapa anterior` : "Base monitorada"}</small></div><strong>{item.value}<small>{formatCurrency(item.revenue)}</small></strong></div>)}
          </div>
        </article>

        <article id="responsaveis" className="panel owner-portfolio-panel">
          <div className="panel-heading"><div><span>Capacidade do time</span><h2>Carteira por responsável</h2><p>Receita mensal por nível de risco, em milhares.</p></div></div>
          <div className="management-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={ownerData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="owner" tick={{ fill: "#b9b9b9", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8593ae", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="Baixo" stackId="risk" fill="#00f3ff" /><Bar dataKey="Médio" stackId="risk" fill="#ffba49" /><Bar dataKey="Alto" stackId="risk" fill="#ff6b78" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <div className="owner-summary">{ownerData.map((owner) => <div key={owner.fullName}><strong>{owner.fullName}</strong><span>{owner.companies} empresas · {owner.overdue} atrasada(s)</span></div>)}</div>
        </article>
      </section>

      <section className="panel heatmap-panel">
        <div className="panel-heading"><div><span>Padrões da carteira</span><h2>Empresa × família de produto</h2><p>{isTechnology ? "Compare a saúde de uso e relacionamento para separar problemas da conta de problemas sistêmicos do produto." : "Compare a saúde encontrada nos dados para separar problemas da conta de padrões recorrentes por contrato."}</p></div><span className="heatmap-legend"><i className="low" /> Baixo <i className="medium" /> Médio <i className="high" /> Alto</span></div>
        <div className="heatmap-scroll"><table className="management-heatmap"><thead><tr><th>Empresa</th>{heatmapFamilies.map((family) => <th key={family}>{family}</th>)}</tr></thead><tbody>{companyPortfolios.map((portfolio) => <tr key={portfolio.company.id}><th><Link to={`/empresas/${portfolio.company.id}`}>{portfolio.company.name}</Link></th>{heatmapFamilies.map((family) => { const product = portfolio.products.find((item) => productFamily(item.productName) === family); return <td key={family}>{product ? <Link className={`heatmap-cell heatmap-cell--${product.riskLevel.toLocaleLowerCase("pt-BR")}`} to={`/clientes/${product.id}`} title={`${portfolio.company.name} · ${product.productName} · score ${product.riskScore} · ${formatCurrency(product.monthlyRevenue)} · ${product.primarySignal}`}><span>{product.riskScore}</span></Link> : <span className="heatmap-cell heatmap-cell--empty" title="Produto não contratado">—</span>}</td>; })}</tr>)}</tbody></table></div>
        <p className="heatmap-insight"><Lightbulb size={17} /> Suporte Dedicado apresenta deterioração em mais de uma empresa; isso pode indicar um padrão do serviço, não apenas da conta.</p>
      </section>

      <section className="management-grid">
        <article id="movimento-financeiro" className="panel">
          <div className="panel-heading"><div><span>Resultado financeiro</span><h2>Movimentação da receita em risco</h2><p>Valores mensais em milhares de reais.</p></div><strong className="management-balance">+ R$ 43,5 mil<small>saldo de retenção em Set</small></strong></div>
          <div className="management-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={managementFinancialSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="month" tick={{ fill: "#b9b9b9", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8593ae", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="atRisk" name="Entrou em risco" fill="#ffba49" radius={[4, 4, 0, 0]} /><Bar dataKey="recovered" name="Recuperada" fill="#00ff91" radius={[4, 4, 0, 0]} /><Bar dataKey="lost" name="Perdida" fill="#ff6b78" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><span>Tendência da operação</span><h2>Evolução da saúde da carteira</h2><p>Score médio observado comparado à meta.</p></div></div>
          <div className="management-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={portfolioHealthSeries} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="month" tick={{ fill: "#b9b9b9", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis domain={[50, 85]} tick={{ fill: "#8593ae", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Line isAnimationActive={false} type="monotone" dataKey="target" name="Meta" stroke="#8593ae" strokeDasharray="6 6" dot={false} /><Line isAnimationActive={false} type="monotone" dataKey="score" name="Saúde" stroke="#00f3ff" strokeWidth={3} dot={{ fill: "#00f3ff", r: 4 }} /></LineChart></ResponsiveContainer></div>
          <div className="health-events">{portfolioHealthSeries.filter((item) => item.event).map((item) => <span key={item.month}><strong>{item.month}</strong>{item.event}</span>)}</div>
        </article>
      </section>

      <section className="panel renewals-panel">
        <div className="panel-heading"><div><span>Próximos 90 dias</span><h2>Renovações que exigem preparação</h2><p>Priorize contratos de maior risco e confirme um plano antes do vencimento.</p></div></div>
        <div className="table-scroll"><table className="clients-table"><thead><tr><th>Produto / empresa</th><th>Renovação</th><th>Janela</th><th>Receita</th><th>Risco</th><th>Responsável</th><th>Plano</th><th>Ação</th></tr></thead><tbody>{renewalMocks.map((renewal) => { const product = allProducts.find((item) => item.id === renewal.productId)!; const company = getCompany(product.companyId)!; return <tr key={renewal.id}><td><strong>{product.productName}</strong><small>{company.name}</small></td><td>{renewal.renewalDate}</td><td>Até {renewal.dueInDays} dias</td><td>{formatCurrency(product.monthlyRevenue)}</td><td><RiskBadge level={product.riskLevel} score={product.riskScore} /></td><td>{company.owner}</td><td><span className={`plan-status ${renewal.hasPlan ? "plan-status--ready" : "plan-status--missing"}`}>{renewal.hasPlan ? "Definido" : "Pendente"}</span></td><td><Link className="table-action" to={`/clientes/${product.id}`}>Abrir <ArrowRight size={14} /></Link></td></tr>; })}</tbody></table></div>
      </section>

      <section id="acoes" className="panel management-actions-panel">
        <div className="panel-heading"><div><span>Execução do time</span><h2>Planos de ação da carteira</h2><p>Alterações ficam salvas somente neste navegador.</p></div><button className="primary-button compact-button" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? "Fechar" : "Nova ação"}</button></div>
        {showForm && <form className="management-action-form" onSubmit={createCase}>
          <label>Produto<select value={draft.productId} onChange={(event) => { const product = allProducts.find((item) => item.id === event.target.value)!; setDraft({ ...draft, productId: product.id, owner: getCompany(product.companyId)?.owner ?? draft.owner }); }}>{allProducts.map((product) => <option key={product.id} value={product.id}>{product.productName} · {getCompany(product.companyId)?.name}</option>)}</select></label>
          <label>Título<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Retomar reunião executiva" /></label>
          <label>Responsável<select value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })}>{managementOwners.map((owner) => <option key={owner}>{owner}</option>)}</select></label>
          <label>Prazo<input required type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
          <label>Etapa<select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as RetentionCaseStage })}>{stageOrder.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label>
          <label className="management-action-form__note">Observação<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Contexto para o próximo contato" /></label>
          <button className="primary-button" type="submit">Criar ação</button>
        </form>}
        <div className="table-scroll"><table className="clients-table management-actions-table"><thead><tr><th>Produto / empresa</th><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Etapa</th><th>Observação</th><th>Abrir</th></tr></thead><tbody>{cases.map((item) => { const product = allProducts.find((candidate) => candidate.id === item.productId); if (!product) return null; const company = getCompany(product.companyId)!; const overdue = item.stage !== "recovered" && item.dueDate < managementDemoToday; return <tr key={item.id} className={overdue ? "action-row--overdue" : ""}><td><strong>{product.productName}</strong><small>{company.name}</small></td><td>{item.title}</td><td><select aria-label={`Responsável por ${item.title}`} value={item.owner} onChange={(event) => updateCase(item.id, { owner: event.target.value })}>{managementOwners.map((owner) => <option key={owner}>{owner}</option>)}</select></td><td><input aria-label={`Prazo de ${item.title}`} type="date" value={item.dueDate} onChange={(event) => updateCase(item.id, { dueDate: event.target.value })} />{overdue && <small className="overdue-label">Atrasada</small>}</td><td><select aria-label={`Etapa de ${item.title}`} value={item.stage} onChange={(event) => updateCase(item.id, { stage: event.target.value as RetentionCaseStage })}>{stageOrder.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></td><td><input aria-label={`Observação de ${item.title}`} value={item.note} onChange={(event) => updateCase(item.id, { note: event.target.value })} /></td><td><Link className="table-action" to={`/clientes/${product.id}`}><ArrowRight size={15} /></Link></td></tr>; })}</tbody></table></div>
      </section>

      <footer className="management-disclaimer"><ShieldWarning size={18} /><span><strong>Ambiente demonstrativo:</strong> regras, séries, recuperações e recomendações não representam um modelo real. As ações editadas permanecem somente neste navegador.</span></footer>
    </div>
  );
}
