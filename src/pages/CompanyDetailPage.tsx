import { ArrowLeft, ArrowRight, Buildings, CurrencyCircleDollar, ShieldWarning, UsersThree, WarningDiamond } from "@phosphor-icons/react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { RiskBadge, formatCurrency } from "../components/StatusUI";
import { companyPortfolios } from "../data/mockData";
import { type PortfolioProductRecord, usePortfolio } from "../features/portfolio/PortfolioContext";

export function CompanyDetailPage() {
  const { companyId } = useParams();
  const location = useLocation();
  const { account } = useAuth();
  const hasTechnology = account?.profile === "technology";
  const { getCompany, loading, persistedProducts } = usePortfolio();
  const portfolio = companyPortfolios.find((item) => item.company.id === companyId);
  const companyRecord = companyId ? getCompany(companyId) : undefined;
  const persistedCompanyProducts = persistedProducts.filter((product) => product.companyId === companyId);
  const backTarget = (location.state as { from?: string } | null)?.from ?? "/?visao=empresas";

  if (!portfolio && loading) return <section className="not-found"><Buildings size={40} /><h1>Carregando empresa...</h1></section>;
  if (!portfolio && companyRecord && persistedCompanyProducts.length > 0) {
    return <PersistedCompanyDetail company={companyRecord} products={persistedCompanyProducts} backTarget={backTarget} hasTechnology={hasTechnology} />;
  }
  if (!portfolio) return <section className="not-found"><ShieldWarning size={40} /><h1>Empresa não encontrada</h1><Link className="primary-button" to="/?visao=empresas">Voltar à carteira</Link></section>;

  const { company, products, contributions } = portfolio;
  return (
    <div className="company-detail-page">
      <Link className="back-link" to={backTarget}><ArrowLeft size={18} /> Voltar à visão por empresa</Link>
      <section className="client-hero">
        <div className="client-heading"><span className="eyebrow"><Buildings size={16} weight="duotone" /> Conta consolidada</span><div className="client-title-row"><div><h1>{company.name}</h1><p>{company.segment} · Responsável: {company.owner}</p></div><RiskBadge level={portfolio.riskLevel} score={portfolio.riskScore} /></div></div>
        <div className="client-value"><span>Receita mensal total</span><strong>{formatCurrency(portfolio.monthlyRevenue)}</strong><small>{products.length + persistedCompanyProducts.length} {products.length + persistedCompanyProducts.length === 1 ? "produto contratado" : "produtos contratados"}</small></div>
      </section>

      {hasTechnology && portfolio.criticalAlert && <section className="company-critical-alert"><WarningDiamond size={24} weight="fill" /><div><strong>Risco crítico oculto no consolidado</strong><p>{portfolio.criticalAlert.productName} tem score {portfolio.criticalAlert.riskScore} e criticidade {portfolio.criticalAlert.strategicCriticality}/5. Por isso, a empresa nunca aparece abaixo de risco médio.</p></div></section>}

      <section className="company-summary-grid">
        <article><CurrencyCircleDollar size={20} /><small>Receita total</small><strong>{formatCurrency(portfolio.monthlyRevenue)}</strong></article>
        <article><ShieldWarning size={20} /><small>Risco dos produtos</small><strong>{Math.round(portfolio.productRiskScore)}</strong><p>70% do consolidado</p></article>
        <article><UsersThree size={20} /><small>Risco de relacionamento</small><strong>{company.relationshipRiskScore}</strong><p>NPS {company.nps ?? "sem resposta"} · {company.paymentDelay ? `${company.paymentDelay}d de atraso` : "em dia"}</p></article>
        <article><Buildings size={20} /><small>Produtos em atenção</small><strong>{portfolio.productsAtRisk} de {products.length}</strong></article>
      </section>

      <section className="panel company-formula-panel">
        <div className="panel-heading"><div><span>Cálculo local e explicável</span><h2>Como o risco da empresa foi composto</h2><p>Score da empresa = 70% do risco ponderado dos produtos + 30% do relacionamento.</p></div></div>
        <div className="formula-note">{hasTechnology ? <>O peso de cada produto combina <strong>50% receita</strong>, <strong>30% criticidade estratégica</strong> e <strong>20% usuários ativos</strong>.</> : <>A leitura combina <strong>risco contratual</strong>, <strong>receita</strong> e <strong>relacionamento</strong>, sem sinais provenientes das aplicações.</>}</div>
      </section>

      <section className="panel clients-panel">
        <div className="panel-heading"><div><span>Portfólio contratado</span><h2>Contribuição de cada produto</h2><p>Scores individuais demonstrativos; consolidação calculada neste navegador.</p></div></div>
        <div className="table-scroll"><table className="clients-table company-products-table"><thead><tr><th>Produto</th><th>Risco</th><th>Receita</th><th>Criticidade</th>{hasTechnology && <th>Usuários</th>}<th>Peso</th><th>Contribuição</th><th>Ação</th></tr></thead><tbody>
          {contributions.map(({ product, weight, contribution }) => <tr key={product.id}><td><strong>{product.productName}</strong><small>{product.plan}</small></td><td><RiskBadge level={product.riskLevel} score={product.riskScore} /></td><td>{formatCurrency(product.monthlyRevenue)}</td><td>{product.strategicCriticality}/5</td>{hasTechnology && <td>{product.activeUsers}</td>}<td>{Math.round(weight * 100)}%</td><td>{contribution.toFixed(1)} pts</td><td><Link className="table-action" to={`/clientes/${product.id}`} state={{ from: location.pathname }}>Ver produto <ArrowRight size={14} /></Link></td></tr>)}
          {persistedCompanyProducts.map((product) => <PersistedCompanyProductRow key={product.id} product={product} from={location.pathname} hasTechnology={hasTechnology} />)}
        </tbody></table></div>
      </section>
      <footer className="mock-footer"><Buildings size={18} /> Agregação calculada localmente sobre produtos e relacionamento demonstrativos.</footer>
    </div>
  );
}

function PersistedCompanyProductRow({ product, from, hasTechnology }: { product: PortfolioProductRecord; from: string; hasTechnology: boolean }) {
  return <tr><td><strong>{product.productName}</strong><small>Dados comerciais não informados</small></td><td>Sem dados</td><td>Não informado</td><td>Não informado</td>{hasTechnology && <td>Sem dados</td>}<td>—</td><td>—</td><td><Link className="table-action" to={`/clientes/${product.id}`} state={{ from }}>Ver produto <ArrowRight size={14} /></Link></td></tr>;
}

function PersistedCompanyDetail({
  company,
  products,
  backTarget,
  hasTechnology,
}: {
  company: { id: string; name: string };
  products: PortfolioProductRecord[];
  backTarget: string;
  hasTechnology: boolean;
}) {
  return (
    <div className="company-detail-page">
      <Link className="back-link" to={backTarget}><ArrowLeft size={18} /> Voltar à visão por empresa</Link>
      <section className="client-hero">
        <div className="client-heading"><span className="eyebrow"><Buildings size={16} weight="duotone" /> Conta consolidada</span><div className="client-title-row"><div><h1>{company.name}</h1><p>Dados comerciais ainda não informados</p></div></div></div>
        <div className="client-value"><span>Receita mensal total</span><strong>Não informado</strong><small>{products.length} {products.length === 1 ? "produto cadastrado" : "produtos cadastrados"}</small></div>
      </section>

      <section className="panel company-formula-panel">
        <div className="panel-heading"><div><span>Dados da empresa</span><h2>Aguardando fontes comerciais</h2><p>Risco, receita, relacionamento, NPS e demais indicadores ainda não foram informados.</p></div></div>
      </section>

      <section className="panel clients-panel">
        <div className="panel-heading"><div><span>Portfólio cadastrado</span><h2>Produtos da empresa</h2><p>{hasTechnology ? "A telemetria será exibida no detalhe de cada produto assim que a aplicação enviar eventos." : "Os indicadores serão exibidos quando uma fonte comercial for cadastrada."}</p></div></div>
        <div className="table-scroll"><table className="clients-table company-products-table"><thead><tr><th>Produto</th><th>Risco</th><th>Receita</th><th>Criticidade</th>{hasTechnology && <th>Usuários</th>}<th>Peso</th><th>Contribuição</th><th>Ação</th></tr></thead><tbody>
          {products.map((product) => <PersistedCompanyProductRow key={product.id} product={product} from={`/empresas/${company.id}`} hasTechnology={hasTechnology} />)}
        </tbody></table></div>
      </section>
    </div>
  );
}
