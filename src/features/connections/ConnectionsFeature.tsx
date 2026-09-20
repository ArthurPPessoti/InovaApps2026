import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  BracketsCurly,
  CheckCircle,
  ClipboardText,
  Code,
  IdentificationCard,
  LinkSimple,
  Plus,
  Pulse,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useChurnAnalysis } from "../../churn/churnAnalysis";
import { selectGlobalSysAnalysis } from "../../churn/globalSysPortfolio";
import {
  normalizePortfolioName,
  type PortfolioCompanyRecord,
  usePortfolio,
} from "../portfolio/PortfolioContext";
import {
  addFeature,
  createApplication,
  discardLegacyApplications,
  getApplication,
  linkApplicationClient,
  listApplications,
  listEvents,
} from "./connectionApi";
import {
  buildConnectionClientOptions,
  buildGlobalSysConnectionOptions,
  type ConnectionClientOption,
} from "./clientOptions";
import {
  buildTrackerTestCommand,
  TRACKER_CREDENTIAL_PLACEHOLDER,
  trackerTestCommandButtonLabel,
} from "./trackerTestCommand";
import type {
  ConnectedApplication,
  IntegrationEvent,
  NewApplicationInput,
  NewFeatureInput,
} from "./types";
import "./connections.css";

type DetailTab = "configuration" | "events" | "integration";
const NEW_PRODUCT_OPTION = "__new_product__";
const EXTERNAL_DEMO_CLIENT_ID = "C067";
const EXTERNAL_DEMO_URL = "http://127.0.0.1:4174/";

export function ConnectionsFeature() {
  const { account } = useAuth();
  const {
    analysis,
    loading: analysisLoading,
    error: analysisError,
  } = useChurnAnalysis(account?.id);
  const {
    companies,
    persistedProducts,
    loading: portfolioLoading,
    error: portfolioError,
    refresh: refreshPortfolio,
  } = usePortfolio();
  const globalSysAnalysis = useMemo(
    () => analysis ? selectGlobalSysAnalysis(analysis) : null,
    [analysis],
  );
  const connectionClientOptions = useMemo(
    () => [
      ...buildGlobalSysConnectionOptions(globalSysAnalysis?.predictions ?? []),
      ...buildConnectionClientOptions(persistedProducts),
    ],
    [globalSysAnalysis, persistedProducts],
  );
  const persistedCompanies = useMemo(
    () => companies.filter((company) => company.source === "persisted"),
    [companies],
  );
  const productCatalogLoading = portfolioLoading || analysisLoading;
  const productCatalogError = analysisError || portfolioError;
  const [applications, setApplications] = useState<ConnectedApplication[]>([]);
  const availableConnectionClientOptions = useMemo(() => {
    const connectedProductIds = new Set(
      applications.map((application) => application.clientId).filter((id): id is string => Boolean(id)),
    );
    return connectionClientOptions.filter((client) => !connectedProductIds.has(client.id));
  }, [applications, connectionClientOptions]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const applicationId = searchParams.get("application");

  const loadApplicationList = useCallback(async () => {
    try {
      setApplications(await listApplications());
      setPageError("");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Não foi possível carregar as conexões.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      discardLegacyApplications();
      await loadApplicationList();
    };
    void initialize();
  }, [loadApplicationList]);

  const refreshApplication = useCallback(async (id: string) => {
    const application = await getApplication(id);
    setApplications((current) => {
      const exists = current.some((item) => item.id === id);
      return exists
        ? current.map((item) => item.id === id ? application : item)
        : [application, ...current];
    });
    return application;
  }, []);

  const selectedApplication = applicationId
    ? applications.find((item) => item.id === applicationId)
    : undefined;

  useEffect(() => {
    if (!applicationId || !selectedApplication || selectedApplication.credential) return;
    void refreshApplication(applicationId).catch((error: unknown) => {
      setPageError(error instanceof Error ? error.message : "Não foi possível carregar a conexão.");
    });
  }, [applicationId, refreshApplication, selectedApplication]);

  const showList = () => setSearchParams({});
  const showNewApplication = () => setSearchParams({ view: "new" });
  const showApplication = (id: string) => setSearchParams({ application: id, tab: "configuration" });

  const handleCreateApplication = async (input: NewApplicationInput) => {
    const application = await createApplication(input);
    if ("newProduct" in input) await refreshPortfolio();
    setApplications((current) => [application, ...current]);
    showApplication(application.id);
  };

  const handleAddFeature = async (id: string, input: NewFeatureInput) => {
    const application = await addFeature(id, input);
    setApplications((current) => current.map((item) => item.id === id ? application : item));
  };

  const handleLinkClient = async (id: string, clientId: string) => {
    const client = connectionClientOptions.find((item) => item.id === clientId);
    if (!client) throw new Error("Selecione um produto válido da carteira.");
    const application = await linkApplicationClient(id, {
      clientId: client.id,
      client: client.displayName,
    });
    setApplications((current) => current.map((item) => item.id === id ? application : item));
  };

  if (loading) {
    return <LoadingState label="Carregando conexões..." />;
  }

  if (view === "new") {
    return (
      <NewApplicationForm
        clients={availableConnectionClientOptions}
        catalogClients={connectionClientOptions}
        companies={persistedCompanies}
        portfolioLoading={productCatalogLoading}
        portfolioError={productCatalogError}
        onCancel={showList}
        onCreate={handleCreateApplication}
      />
    );
  }

  if (applicationId) {
    if (selectedApplication && !selectedApplication.credential) {
      return <LoadingState label="Carregando configuração da conexão..." />;
    }

    return (
      <ApplicationDetail
        application={selectedApplication}
        activeTab={normalizeTab(searchParams.get("tab"))}
        onBack={showList}
        onTabChange={(tab) => setSearchParams({ application: applicationId, tab })}
        onAddFeature={(input) => handleAddFeature(applicationId, input)}
        onLinkClient={(clientId) => handleLinkClient(applicationId, clientId)}
        onRefresh={() => refreshApplication(applicationId)}
        clients={availableConnectionClientOptions}
        identity={resolveConnectionIdentity(selectedApplication, connectionClientOptions, productCatalogLoading)}
        pageError={pageError}
      />
    );
  }

  return (
    <div className="connect-page">
      <header className="connect-page-header">
        <div>
          <span className="eyebrow"><LinkSimple size={15} weight="duotone" /> Integrações</span>
          <h1>Conexões</h1>
          <p>Conecte cada produto uma única vez e configure o recebimento de eventos de utilização.</p>
        </div>
        <button className="primary-button connect-button" type="button" onClick={showNewApplication}>
          <Plus size={17} weight="bold" /> Nova conexão
        </button>
      </header>

      <section className="connect-section" aria-labelledby="applications-title">
        <div className="connect-section-heading">
          <div>
            <span>Produtos</span>
            <h2 id="applications-title">Produtos conectados</h2>
          </div>
          {applications.length > 0 && <small>{applications.length} cadastrada(s)</small>}
        </div>

        {pageError && <ErrorMessage message={pageError} />}

        {applications.length === 0 ? (
          <div className="connect-empty-state">
            <span className="connect-empty-icon"><LinkSimple size={30} weight="duotone" /></span>
            <h3>Nenhum produto conectado</h3>
            <p>Conecte um produto para começar a monitorar seus eventos de utilização.</p>
            <button className="primary-button connect-button" type="button" onClick={showNewApplication}>
              <Plus size={17} weight="bold" /> Conectar produto
            </button>
          </div>
        ) : (
          <div className="connect-app-grid">
            {applications.map((application) => {
              const identity = resolveConnectionIdentity(application, connectionClientOptions, productCatalogLoading);
              const isExternalDemo = application.clientId === EXTERNAL_DEMO_CLIENT_ID;
              return <article className={`connect-app-card${isExternalDemo ? " connect-app-card--external-demo" : ""}`} key={application.id}>
                <div className="connect-app-card-top">
                  <span className="connect-app-icon">
                    <LinkSimple size={24} weight="duotone" />
                  </span>
                  <StatusBadge application={application} />
                </div>
                <div className="connect-app-copy">
                  <h3>{identity.productName}</h3>
                  <p>{identity.companyName}</p>
                </div>
                <div className="connect-app-meta">
                  <span><IdentificationCard size={15} /> {application.id}</span>
                  <span><BracketsCurly size={15} /> {application.featureCount} funcionalidade(s)</span>
                </div>
                {isExternalDemo && (
                  <aside className="connect-external-demo" aria-label="Projeto externo de exemplo">
                    <strong>* Projeto externo de exemplo</strong>
                    <span>{application.featureCount} funcionalidades conectadas enviando eventos para este produto.</span>
                    <a href={EXTERNAL_DEMO_URL} target="_blank" rel="noreferrer">
                      Abrir projeto externo <ArrowSquareOut size={14} weight="bold" />
                    </a>
                  </aside>
                )}
                <button className="secondary-button connect-button" type="button" onClick={() => showApplication(application.id)}>
                  Abrir
                </button>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function normalizeTab(tab: string | null): DetailTab {
  if (tab === "events" || tab === "integration") return tab;
  return "configuration";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

interface ConnectionIdentity {
  productName: string;
  companyName: string;
}

function resolveConnectionIdentity(
  application: ConnectedApplication | undefined,
  clients: ConnectionClientOption[],
  portfolioLoading = false,
): ConnectionIdentity {
  const product = application?.clientId
    ? clients.find((client) => client.id === application.clientId)
    : undefined;
  if (product) return { productName: product.name, companyName: product.companyName };
  if (portfolioLoading && application?.clientId) {
    return { productName: "Carregando produto...", companyName: "Catálogo da carteira" };
  }
  if (application?.clientId) {
    return { productName: "Produto não encontrado", companyName: `Application ID: ${application.id}` };
  }
  return { productName: "Produto não vinculado", companyName: "Conexão legada — vínculo necessário" };
}

function StatusBadge({ application }: { application: ConnectedApplication }) {
  const connected = application.status === "connected";
  return (
    <span className={`connect-status ${connected ? "connect-status--connected" : ""}`}>
      {connected ? <CheckCircle size={14} weight="fill" /> : <Pulse size={14} />}
      {connected ? "Conectado" : "Aguardando integração"}
    </span>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="connect-page">
      <div className="connect-loading"><SpinnerGap className="connect-spin" size={24} /> {label}</div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <div className="connect-form-error connect-page-error" role="alert"><WarningCircle size={18} /> {message}</div>;
}

function NewApplicationForm({
  clients,
  catalogClients,
  companies,
  portfolioLoading,
  portfolioError,
  onCancel,
  onCreate,
}: {
  clients: ConnectionClientOption[];
  catalogClients: ConnectionClientOption[];
  companies: PortfolioCompanyRecord[];
  portfolioLoading: boolean;
  portfolioError: string;
  onCancel: () => void;
  onCreate: (input: NewApplicationInput) => Promise<void>;
}) {
  const [clientId, setClientId] = useState("");
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const creatingProduct = clientId === NEW_PRODUCT_OPTION;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    setSubmitting(true);
    try {
      if (!creatingProduct) {
        const client = clients.find((item) => item.id === clientId);
        if (!client) {
          setError("Selecione um produto da carteira.");
          return;
        }
        await onCreate({ clientId: client.id, client: client.displayName, productName: client.name });
        return;
      }

      const selectedCompany = companyMode === "existing"
        ? companies.find((company) => company.id === companyId)
        : undefined;
      const effectiveCompanyName = selectedCompany?.name ?? companyName.trim();
      if (!productName.trim() || !effectiveCompanyName || (companyMode === "existing" && !selectedCompany)) {
        setError("Informe a empresa e o nome do novo produto.");
        return;
      }

      if (companyMode === "new") {
        const duplicateCompany = companies.find((company) => (
          normalizePortfolioName(company.name) === normalizePortfolioName(effectiveCompanyName)
        ));
        if (duplicateCompany) {
          setCompanyMode("existing");
          setCompanyId(duplicateCompany.id);
          setError(`A empresa ${duplicateCompany.name} já existe e foi selecionada. Revise e envie novamente.`);
          return;
        }
      }

      const effectiveCompanyId = selectedCompany?.id ?? "";
      const duplicateProduct = catalogClients.find((client) => (
        client.companyId === effectiveCompanyId
        && normalizePortfolioName(client.name) === normalizePortfolioName(productName)
      ));
      if (duplicateProduct) {
        const available = clients.some((client) => client.id === duplicateProduct.id);
        if (available) setClientId(duplicateProduct.id);
        setError(available
          ? `O produto ${duplicateProduct.name} já existe para esta empresa e foi selecionado. Envie novamente para conectar.`
          : `O produto ${duplicateProduct.name} já existe e já possui uma conexão técnica.`);
        return;
      }

      await onCreate({
        newProduct: {
          name: productName,
          company: companyMode === "existing"
            ? { mode: "existing", id: selectedCompany!.id, name: selectedCompany!.name }
            : { mode: "new", name: effectiveCompanyName },
        },
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível conectar o produto.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="connect-page connect-page--form">
      <button className="connect-back-button" type="button" onClick={onCancel}>
        <ArrowLeft size={16} /> Voltar para conexões
      </button>

      <header className="connect-page-header connect-page-header--compact">
        <div>
          <span className="eyebrow">Nova conexão</span>
          <h1>Conectar produto</h1>
          <p>Selecione o produto que enviará eventos de utilização para a plataforma.</p>
        </div>
      </header>

      <form className="connect-form-panel" onSubmit={submit}>
        <div className="connect-form-grid">
          <label className="connect-field">
            <span>Produto</span>
            <select
              required
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              disabled={portfolioLoading}
            >
              <option value="">{portfolioLoading ? "Carregando produtos..." : "Selecione um produto ainda não conectado"}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.id} — {client.displayName}</option>
              ))}
              <option disabled>────────────────────</option>
              <option value={NEW_PRODUCT_OPTION}>＋ Cadastrar novo produto</option>
            </select>
          </label>
        </div>

        {creatingProduct && (
          <section className="connect-new-product" aria-labelledby="new-product-title">
            <div className="connect-new-product-heading">
              <span>Novo produto</span>
              <h2 id="new-product-title">Cadastre somente os dados essenciais</h2>
              <p>Os dados comerciais poderão vir de outras fontes posteriormente.</p>
            </div>

            <fieldset className="connect-company-choice">
              <legend>Empresa</legend>
              <label>
                <input type="radio" name="company-mode" checked={companyMode === "existing"} onChange={() => setCompanyMode("existing")} />
                Empresa existente
              </label>
              <label>
                <input type="radio" name="company-mode" checked={companyMode === "new"} onChange={() => setCompanyMode("new")} />
                Nova empresa
              </label>
            </fieldset>

            <div className="connect-form-grid">
              {companyMode === "existing" ? (
                <label className="connect-field">
                  <span>Selecionar empresa</span>
                  <select required value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
                    <option value="">Selecione uma empresa</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                </label>
              ) : (
                <label className="connect-field">
                  <span>Nome da empresa</span>
                  <input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ex.: Transportadora XPTO" />
                </label>
              )}
              <label className="connect-field">
                <span>Nome do produto</span>
                <input required value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Ex.: Gestão de Frota" />
              </label>
            </div>
          </section>
        )}

        {(error || portfolioError) && <div className="connect-form-error" role="alert"><WarningCircle size={18} /> {error || portfolioError}</div>}

        <div className="connect-form-actions">
          <button className="secondary-button connect-button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-button connect-button" type="submit" disabled={submitting}>
            {submitting ? "Conectando..." : creatingProduct ? "Criar e conectar produto" : "Conectar produto"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ApplicationDetail({
  application,
  activeTab,
  onBack,
  onTabChange,
  onAddFeature,
  onLinkClient,
  onRefresh,
  clients,
  identity,
  pageError,
}: {
  application: ConnectedApplication | undefined;
  activeTab: DetailTab;
  onBack: () => void;
  onTabChange: (tab: DetailTab) => void;
  onAddFeature: (input: NewFeatureInput) => Promise<void>;
  onLinkClient: (clientId: string) => Promise<void>;
  onRefresh: () => Promise<ConnectedApplication>;
  clients: ConnectionClientOption[];
  identity: ConnectionIdentity;
  pageError: string;
}) {
  if (!application) {
    return (
      <div className="connect-page">
        <button className="connect-back-button" type="button" onClick={onBack}><ArrowLeft size={16} /> Voltar</button>
        <div className="connect-empty-state">
          <WarningCircle size={34} weight="duotone" />
          <h3>Conexão não encontrada</h3>
          <p>Ela pode não existir mais no banco local.</p>
          <button className="secondary-button connect-button" type="button" onClick={onBack}>Ver conexões</button>
        </div>
      </div>
    );
  }

  return (
    <div className="connect-page">
      <button className="connect-back-button" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Voltar para conexões
      </button>

      <header className="connect-detail-header">
        <div className="connect-detail-identity">
          <span className="connect-app-icon connect-app-icon--large">
            <LinkSimple size={28} weight="duotone" />
          </span>
          <div>
            <h1>{identity.productName}</h1>
            <p>{identity.companyName}</p>
          </div>
        </div>
        <StatusBadge application={application} />
      </header>

      {pageError && <ErrorMessage message={pageError} />}

      <nav className="connect-tabs" aria-label="Seções da conexão" role="tablist">
        <TabButton active={activeTab === "configuration"} onClick={() => onTabChange("configuration")}>Configuração</TabButton>
        <TabButton active={activeTab === "events"} onClick={() => onTabChange("events")}>Eventos</TabButton>
        <TabButton active={activeTab === "integration"} onClick={() => onTabChange("integration")}>Integração</TabButton>
      </nav>

      <div className="connect-tab-content">
        {activeTab === "configuration" && (
          <ConfigurationTab
            application={application}
            identity={identity}
            clients={clients}
            onAddFeature={onAddFeature}
            onLinkClient={onLinkClient}
            onOpenIntegration={() => onTabChange("integration")}
          />
        )}
        {activeTab === "events" && <EventsTab application={application} onRefresh={onRefresh} />}
        {activeTab === "integration" && <IntegrationTab application={application} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      className={active ? "connect-tab connect-tab--active" : "connect-tab"}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ConfigurationTab({
  application,
  identity,
  clients,
  onAddFeature,
  onLinkClient,
  onOpenIntegration,
}: {
  application: ConnectedApplication;
  identity: ConnectionIdentity;
  clients: ConnectionClientOption[];
  onAddFeature: (input: NewFeatureInput) => Promise<void>;
  onLinkClient: (clientId: string) => Promise<void>;
  onOpenIntegration: () => void;
}) {
  const [addingFeature, setAddingFeature] = useState(false);
  const [name, setName] = useState("");
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkingClient, setLinkingClient] = useState(!application.clientId);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  useEffect(() => {
    setSelectedClientId("");
    setLinkingClient(!application.clientId);
  }, [application.id, application.clientId]);

  const submitClientLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClientId) {
      setLinkError("Selecione um produto da carteira.");
      return;
    }
    setLinkSubmitting(true);
    setLinkError("");
    try {
      await onLinkClient(selectedClientId);
      setLinkingClient(false);
    } catch (submitError) {
      setLinkError(submitError instanceof Error ? submitError.message : "Não foi possível vincular o produto.");
    } finally {
      setLinkSubmitting(false);
    }
  };

  const submitFeature = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onAddFeature({ name, eventName });
      setName("");
      setEventName("");
      setAddingFeature(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível adicionar a funcionalidade.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="connect-config-layout">
      <section className="connect-panel">
        <div className="connect-panel-heading">
          <div><span>Dados básicos</span><h2>Produto conectado</h2></div>
        </div>
        <dl className="connect-data-list">
          <div><dt>Produto</dt><dd>{identity.productName}</dd></div>
          <div><dt>Empresa</dt><dd>{identity.companyName}</dd></div>
          <div><dt>Application ID</dt><dd><code>{application.id}</code></dd></div>
          <div><dt>Status</dt><dd>{application.status === "connected" ? "Conectado" : "Aguardando integração"}</dd></div>
        </dl>
        {linkingClient && (
          <form className="connect-client-link-form" onSubmit={submitClientLink}>
            <label className="connect-field">
              <span>Vincular produto</span>
              <select required value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                <option value="">Selecione um produto da carteira</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.id} — {client.displayName}</option>
                ))}
              </select>
            </label>
            {linkError && <div className="connect-form-error" role="alert"><WarningCircle size={16} /> {linkError}</div>}
            <div className="connect-client-link-actions">
              <button className="secondary-button connect-button" type="submit" disabled={linkSubmitting}>
                {linkSubmitting ? "Salvando..." : "Salvar vínculo"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="connect-panel connect-feature-panel">
        <div className="connect-panel-heading connect-panel-heading--action">
          <div>
            <span>Eventos de produto</span>
            <h2>Funcionalidades monitoradas</h2>
            <p>Cadastre eventos de utilização, sem depender de botões ou seletores da interface.</p>
          </div>
          {!addingFeature && (
            <button className="secondary-button connect-button" type="button" onClick={() => setAddingFeature(true)}>
              <Plus size={16} /> Adicionar funcionalidade
            </button>
          )}
        </div>

        <aside className="connect-instrumentation-guide" aria-label="Como ativar o envio de eventos">
          <div className="connect-instrumentation-guide__intro">
            <span className="connect-instrumentation-guide__icon"><Code size={21} weight="duotone" /></span>
            <div>
              <strong>Cadastrar a funcionalidade não instala o rastreamento automaticamente.</strong>
              <p>Aqui você define o evento esperado. Depois, um desenvolvedor precisa adicionar a chamada <code>POST /api/events</code> no backend do produto real.</p>
            </div>
            <button className="connect-instrumentation-guide__action" type="button" onClick={onOpenIntegration}>
              Ver código e credenciais <ArrowRight size={15} />
            </button>
          </div>
          <ol className="connect-instrumentation-steps">
            <li><span>1</span><div><strong>Cadastre</strong><small>Defina o nome amigável e o identificador técnico do evento.</small></div></li>
            <li><span>2</span><div><strong>Integre</strong><small>O desenvolvedor usa Application ID, credencial e endpoint no sistema real.</small></div></li>
            <li><span>3</span><div><strong>Valide</strong><small>Execute a ação no produto e confirme o recebimento na aba Eventos.</small></div></li>
          </ol>
        </aside>

        {addingFeature && (
          <form className="connect-feature-form" onSubmit={submitFeature}>
            <label className="connect-field">
              <span>Nome amigável</span>
              <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Gerar relatório" />
            </label>
            <label className="connect-field">
              <span>Identificador do evento</span>
              <input
                required
                pattern="[a-z][a-z0-9_]{2,63}"
                title="Use letras minúsculas, números e underscores."
                value={eventName}
                onChange={(event) => setEventName(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                placeholder="relatorio_gerado"
              />
            </label>
            {error && <div className="connect-form-error" role="alert"><WarningCircle size={17} /> {error}</div>}
            <div className="connect-feature-actions">
              <button className="connect-text-button" type="button" onClick={() => setAddingFeature(false)}>Cancelar</button>
              <button className="primary-button connect-button" type="submit" disabled={submitting}>
                {submitting ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </form>
        )}

        {application.features.length === 0 && !addingFeature ? (
          <div className="connect-inline-empty">
            <BracketsCurly size={24} weight="duotone" />
            <div><strong>Nenhuma funcionalidade cadastrada</strong><span>Adicione o primeiro evento que representa utilização do produto.</span></div>
          </div>
        ) : (
          <div className="connect-feature-list">
            {application.features.map((feature) => (
              <div key={feature.id}>
                <span className="connect-feature-icon"><Code size={18} /></span>
                <span><strong>{feature.name}</strong><code>{feature.eventName}</code></span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventsTab({
  application,
  onRefresh,
}: {
  application: ConnectedApplication;
  onRefresh: () => Promise<ConnectedApplication>;
}) {
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const receivedEvents = await listEvents(application.id);
      setEvents(receivedEvents);
      setError("");
      if (receivedEvents.length > 0 && application.status !== "connected") {
        await onRefresh();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os eventos.");
    } finally {
      setLoading(false);
    }
  }, [application.id, application.status, onRefresh]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <section className="connect-panel">
      <div className="connect-panel-heading">
        <div><span>Histórico real</span><h2>Eventos recebidos</h2></div>
        {events.length > 0 && <small className="connect-count-badge">{events.length} evento(s)</small>}
      </div>
      {error && <ErrorMessage message={error} />}
      {loading ? (
        <div className="connect-loading connect-loading--inside"><SpinnerGap className="connect-spin" size={22} /> Carregando eventos...</div>
      ) : events.length === 0 ? (
        <div className="connect-empty-state connect-empty-state--inside">
          <Pulse size={32} weight="duotone" />
          <h3>Nenhum evento recebido</h3>
          <p>Quando o produto começar a enviar eventos, eles aparecerão aqui.</p>
        </div>
      ) : (
        <div className="connect-events-table" role="table" aria-label="Eventos recebidos">
          <div className="connect-events-row connect-events-row--header" role="row">
            <span role="columnheader">Evento</span>
            <span role="columnheader">Usuário</span>
            <span role="columnheader">Data/hora</span>
          </div>
          {events.map((receivedEvent) => (
            <div className="connect-events-row" role="row" key={receivedEvent.id}>
              <code role="cell">{receivedEvent.event}</code>
              <span role="cell">{receivedEvent.userId ?? "Não informado"}</span>
              <time role="cell" dateTime={receivedEvent.receivedAt}>{formatDateTime(receivedEvent.receivedAt)}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function IntegrationTab({ application }: { application: ConnectedApplication }) {
  const endpoint = `${window.location.origin}/api/events`;
  const credential = application.credential ?? "Carregando credencial...";
  const [commandCopied, setCommandCopied] = useState(false);
  const trackerExample = useMemo(() => `import { createTracker } from "./tracker/createTracker.mjs";

const tracker = createTracker({
  applicationId: "${application.id}",
  credential: process.env.CONNECTION_CREDENTIAL,
  endpoint: "${endpoint}"
});

try {
  const event = await tracker.track("relatorio_gerado", {
    userId: "user_001"
  });
  console.log("Evento recebido:", event.id);
} catch (error) {
  console.error("Falha ao enviar evento:", error.message);
}`, [application.id, endpoint]);
  const testCommand = useMemo(
    () => buildTrackerTestCommand(application.id, application.credential),
    [application.credential, application.id],
  );

  useEffect(() => setCommandCopied(false), [application.id, testCommand.ready]);

  const copyTestCommand = async () => {
    try {
      await navigator.clipboard.writeText(testCommand.command);
      setCommandCopied(true);
    } catch {
      setCommandCopied(false);
    }
  };

  return (
    <section className="connect-panel">
      <div className="connect-panel-heading">
        <div>
          <span>Integração server-side</span>
          <h2>Integração</h2>
          <p>Utilize o tracker em um processo Node.js no servidor para enviar eventos à plataforma.</p>
        </div>
        <span className="connect-server-badge">Backend-to-backend</span>
      </div>

      <div className="connect-integration-fields">
        <IntegrationField label="Application ID" value={application.id} />
        <IntegrationField label="Credencial de integração" value={credential} secret />
        <IntegrationField label="Endpoint" value={endpoint} />
      </div>

      <div className="connect-request-example">
        <div>
          <span>Exemplo com o tracker</span>
          <button
            className="connect-copy-button"
            type="button"
            title="Copiar exemplo"
            onClick={() => void navigator.clipboard.writeText(trackerExample)}
          >
            <ClipboardText size={17} /> Copiar
          </button>
        </div>
        <pre><code>{trackerExample}</code></pre>
      </div>

      <div className="connect-tracker-test">
        <div>
          <BracketsCurly size={22} />
          <span><strong>Teste real pelo terminal</strong><small>O script usa o tracker e envia o evento pela API existente.</small></span>
        </div>
        {!testCommand.ready && (
          <div className="connect-command-placeholder-note" role="note">
            <WarningCircle size={18} />
            <span>
              <strong>Este é um modelo e precisa ser editado.</strong>
              <small>1. Copie a credencial secreta exibida acima. 2. Substitua <code>{TRACKER_CREDENTIAL_PLACEHOLDER}</code>. 3. Execute o comando no terminal.</small>
            </span>
          </div>
        )}
        <pre><code>{testCommand.command}</code></pre>
        <button
          className="connect-copy-button"
          type="button"
          onClick={() => void copyTestCommand()}
        >
          <ClipboardText size={17} /> {trackerTestCommandButtonLabel(testCommand, commandCopied)}
        </button>
      </div>

      <p className="connect-security-note">
        <WarningCircle size={16} /> A credencial é secreta. Use-a somente em variáveis de ambiente do servidor e nunca em JavaScript executado no navegador.
      </p>
    </section>
  );
}

function IntegrationField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="connect-integration-field">
      <span>{label}</span>
      <code className={secret ? "connect-integration-secret" : ""}>{value}</code>
      <button
        className="connect-copy-button"
        type="button"
        title={`Copiar ${label.toLowerCase()}`}
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        <ClipboardText size={17} /> Copiar
      </button>
    </div>
  );
}
