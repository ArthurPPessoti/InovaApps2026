import {
  ArrowLeft,
  BracketsCurly,
  Check,
  CheckCircle,
  ClipboardText,
  Code,
  DeviceMobile,
  IdentificationCard,
  LinkSimple,
  Plus,
  Pulse,
  SpinnerGap,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  addFeature,
  createApplication,
  getApplication,
  listApplications,
  listEvents,
  migrateLegacyApplications,
} from "./connectionApi";
import type {
  ApplicationType,
  ConnectedApplication,
  IntegrationEvent,
  NewApplicationInput,
  NewFeatureInput,
} from "./types";
import "./connections.css";

type DetailTab = "configuration" | "events" | "integration";

const applicationTypeLabels: Record<ApplicationType, string> = {
  internal: "Uso interno",
  multiuser: "Multiusuário",
};

export function ConnectionsFeature() {
  const [applications, setApplications] = useState<ConnectedApplication[]>([]);
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
      setPageError(error instanceof Error ? error.message : "Não foi possível carregar as aplicações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        await migrateLegacyApplications();
      } catch (error) {
        setPageError(error instanceof Error ? error.message : "Não foi possível migrar os dados locais.");
      }
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
      setPageError(error instanceof Error ? error.message : "Não foi possível carregar a aplicação.");
    });
  }, [applicationId, refreshApplication, selectedApplication]);

  const showList = () => setSearchParams({});
  const showNewApplication = () => setSearchParams({ view: "new" });
  const showApplication = (id: string) => setSearchParams({ application: id, tab: "configuration" });

  const handleCreateApplication = async (input: NewApplicationInput) => {
    const application = await createApplication(input);
    setApplications((current) => [application, ...current]);
    showApplication(application.id);
  };

  const handleAddFeature = async (id: string, input: NewFeatureInput) => {
    const application = await addFeature(id, input);
    setApplications((current) => current.map((item) => item.id === id ? application : item));
  };

  if (loading) {
    return <LoadingState label="Carregando aplicações..." />;
  }

  if (view === "new") {
    return <NewApplicationForm onCancel={showList} onCreate={handleCreateApplication} />;
  }

  if (applicationId) {
    if (selectedApplication && !selectedApplication.credential) {
      return <LoadingState label="Carregando configuração da aplicação..." />;
    }

    return (
      <ApplicationDetail
        application={selectedApplication}
        activeTab={normalizeTab(searchParams.get("tab"))}
        onBack={showList}
        onTabChange={(tab) => setSearchParams({ application: applicationId, tab })}
        onAddFeature={(input) => handleAddFeature(applicationId, input)}
        onRefresh={() => refreshApplication(applicationId)}
        pageError={pageError}
      />
    );
  }

  return (
    <div className="connect-page">
      <header className="connect-page-header">
        <div>
          <span className="eyebrow"><LinkSimple size={15} weight="duotone" /> Integrações</span>
          <h1>Conectar</h1>
          <p>Conecte aplicações à plataforma e configure o monitoramento de eventos de utilização.</p>
        </div>
        <button className="primary-button connect-button" type="button" onClick={showNewApplication}>
          <Plus size={17} weight="bold" /> Nova aplicação
        </button>
      </header>

      <section className="connect-section" aria-labelledby="applications-title">
        <div className="connect-section-heading">
          <div>
            <span>Aplicações</span>
            <h2 id="applications-title">Aplicações conectadas</h2>
          </div>
          {applications.length > 0 && <small>{applications.length} cadastrada(s)</small>}
        </div>

        {pageError && <ErrorMessage message={pageError} />}

        {applications.length === 0 ? (
          <div className="connect-empty-state">
            <span className="connect-empty-icon"><LinkSimple size={30} weight="duotone" /></span>
            <h3>Nenhuma aplicação conectada</h3>
            <p>Cadastre uma aplicação para começar a monitorar eventos de utilização.</p>
            <button className="primary-button connect-button" type="button" onClick={showNewApplication}>
              <Plus size={17} weight="bold" /> Conectar aplicação
            </button>
          </div>
        ) : (
          <div className="connect-app-grid">
            {applications.map((application) => (
              <article className="connect-app-card" key={application.id}>
                <div className="connect-app-card-top">
                  <span className="connect-app-icon">
                    {application.type === "multiuser"
                      ? <UsersThree size={24} weight="duotone" />
                      : <DeviceMobile size={24} weight="duotone" />}
                  </span>
                  <StatusBadge application={application} />
                </div>
                <div className="connect-app-copy">
                  <span>{applicationTypeLabels[application.type]}</span>
                  <h3>{application.name}</h3>
                  <p>Cliente: {application.client}</p>
                </div>
                <div className="connect-app-meta">
                  <span><IdentificationCard size={15} /> {application.id}</span>
                  <span><BracketsCurly size={15} /> {application.featureCount} funcionalidade(s)</span>
                </div>
                <button className="secondary-button connect-button" type="button" onClick={() => showApplication(application.id)}>
                  Abrir
                </button>
              </article>
            ))}
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
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: NewApplicationInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<ApplicationType | "">("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name.trim() || !client.trim() || !type) {
      setError("Preencha todos os campos e selecione o tipo da aplicação.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({ name, client, type });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível criar a aplicação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="connect-page connect-page--form">
      <button className="connect-back-button" type="button" onClick={onCancel}>
        <ArrowLeft size={16} /> Voltar para aplicações
      </button>

      <header className="connect-page-header connect-page-header--compact">
        <div>
          <span className="eyebrow">Nova aplicação</span>
          <h1>Conectar uma aplicação</h1>
          <p>Identifique a aplicação que futuramente enviará eventos de utilização para a plataforma.</p>
        </div>
      </header>

      <form className="connect-form-panel" onSubmit={submit}>
        <div className="connect-form-grid">
          <label className="connect-field">
            <span>Nome da aplicação</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Sistema de Estoque"
            />
          </label>
          <label className="connect-field">
            <span>Cliente</span>
            <input
              required
              value={client}
              onChange={(event) => setClient(event.target.value)}
              placeholder="Ex.: Empresa XPTO"
            />
          </label>
        </div>

        <fieldset className="connect-type-fieldset">
          <legend>Tipo da aplicação</legend>
          <div className="connect-type-grid">
            <TypeOption
              type="internal"
              selected={type === "internal"}
              icon={<DeviceMobile size={23} weight="duotone" />}
              title="Uso interno"
              description="Aplicação utilizada internamente pelo cliente."
              examples="Sistema administrativo, estoque ou ferramenta operacional."
              onSelect={setType}
            />
            <TypeOption
              type="multiuser"
              selected={type === "multiuser"}
              icon={<UsersThree size={23} weight="duotone" />}
              title="Multiusuário"
              description="Aplicação utilizada por uma base de usuários finais."
              examples="SaaS, streaming, portal ou plataforma comercializada."
              onSelect={setType}
            />
          </div>
        </fieldset>

        {error && <div className="connect-form-error" role="alert"><WarningCircle size={18} /> {error}</div>}

        <div className="connect-form-actions">
          <button className="secondary-button connect-button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-button connect-button" type="submit" disabled={submitting}>
            {submitting ? "Criando..." : "Criar aplicação"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TypeOption({
  type,
  selected,
  icon,
  title,
  description,
  examples,
  onSelect,
}: {
  type: ApplicationType;
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  examples: string;
  onSelect: (type: ApplicationType) => void;
}) {
  return (
    <label className={`connect-type-option ${selected ? "connect-type-option--selected" : ""}`}>
      <input
        type="radio"
        name="application-type"
        value={type}
        checked={selected}
        required
        onChange={() => onSelect(type)}
      />
      <span className="connect-type-icon">{icon}</span>
      <span className="connect-type-copy">
        <strong>{title}</strong>
        <span>{description}</span>
        <small>{examples}</small>
      </span>
      <span className="connect-type-check" aria-hidden="true">{selected && <Check size={13} weight="bold" />}</span>
    </label>
  );
}

function ApplicationDetail({
  application,
  activeTab,
  onBack,
  onTabChange,
  onAddFeature,
  onRefresh,
  pageError,
}: {
  application: ConnectedApplication | undefined;
  activeTab: DetailTab;
  onBack: () => void;
  onTabChange: (tab: DetailTab) => void;
  onAddFeature: (input: NewFeatureInput) => Promise<void>;
  onRefresh: () => Promise<ConnectedApplication>;
  pageError: string;
}) {
  if (!application) {
    return (
      <div className="connect-page">
        <button className="connect-back-button" type="button" onClick={onBack}><ArrowLeft size={16} /> Voltar</button>
        <div className="connect-empty-state">
          <WarningCircle size={34} weight="duotone" />
          <h3>Aplicação não encontrada</h3>
          <p>Ela pode ter sido removida do armazenamento deste navegador.</p>
          <button className="secondary-button connect-button" type="button" onClick={onBack}>Ver aplicações</button>
        </div>
      </div>
    );
  }

  return (
    <div className="connect-page">
      <button className="connect-back-button" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Voltar para aplicações
      </button>

      <header className="connect-detail-header">
        <div className="connect-detail-identity">
          <span className="connect-app-icon connect-app-icon--large">
            {application.type === "multiuser"
              ? <UsersThree size={28} weight="duotone" />
              : <DeviceMobile size={28} weight="duotone" />}
          </span>
          <div>
            <span className="eyebrow">{applicationTypeLabels[application.type]}</span>
            <h1>{application.name}</h1>
            <p>{application.client}</p>
          </div>
        </div>
        <StatusBadge application={application} />
      </header>

      {pageError && <ErrorMessage message={pageError} />}

      <nav className="connect-tabs" aria-label="Seções da aplicação" role="tablist">
        <TabButton active={activeTab === "configuration"} onClick={() => onTabChange("configuration")}>Configuração</TabButton>
        <TabButton active={activeTab === "events"} onClick={() => onTabChange("events")}>Eventos</TabButton>
        <TabButton active={activeTab === "integration"} onClick={() => onTabChange("integration")}>Integração</TabButton>
      </nav>

      <div className="connect-tab-content">
        {activeTab === "configuration" && <ConfigurationTab application={application} onAddFeature={onAddFeature} />}
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
  onAddFeature,
}: {
  application: ConnectedApplication;
  onAddFeature: (input: NewFeatureInput) => Promise<void>;
}) {
  const [addingFeature, setAddingFeature] = useState(false);
  const [name, setName] = useState("");
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          <div><span>Dados básicos</span><h2>Aplicação</h2></div>
        </div>
        <dl className="connect-data-list">
          <div><dt>Nome</dt><dd>{application.name}</dd></div>
          <div><dt>Cliente</dt><dd>{application.client}</dd></div>
          <div><dt>Tipo</dt><dd>{applicationTypeLabels[application.type]}</dd></div>
          <div><dt>Application ID</dt><dd><code>{application.id}</code></dd></div>
          <div><dt>Status</dt><dd>{application.status === "connected" ? "Conectado" : "Aguardando integração"}</dd></div>
        </dl>
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
          <p>Quando a aplicação começar a enviar eventos, eles aparecerão aqui.</p>
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
  const testExample = useMemo(() => `$env:TRACKER_APPLICATION_ID = "${application.id}"
$env:TRACKER_CREDENTIAL = "<cole a credencial acima>"
$env:TRACKER_EVENT = "tracker_test_event"
$env:TRACKER_USER_ID = "user_001"
npm run test:tracker:real`, [application.id]);

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
        <pre><code>{testExample}</code></pre>
        <button
          className="connect-copy-button"
          type="button"
          onClick={() => void navigator.clipboard.writeText(testExample)}
        >
          <ClipboardText size={17} /> Copiar comando
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
