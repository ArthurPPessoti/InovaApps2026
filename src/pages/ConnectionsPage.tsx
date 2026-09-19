import {
  CheckCircle,
  Code,
  CurrencyDollar,
  Database,
  FileXls,
  Headset,
  PlugsConnected,
  UploadSimple,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

const sources = [
  {
    id: "tracking",
    title: "Tracking de produto",
    description: "Receba eventos das funcionalidades que representam entrega de valor.",
    detail: "SDK ou API",
    icon: Code,
    connected: true,
  },
  {
    id: "crm",
    title: "CRM e contratos",
    description: "Combine plano, receita, renovação e responsáveis pela conta.",
    detail: "Dados comerciais",
    icon: Database,
    connected: true,
  },
  {
    id: "support",
    title: "Atendimento",
    description: "Acompanhe chamados, reincidências, criticidade e cumprimento de SLA.",
    detail: "Suporte e SLA",
    icon: Headset,
    connected: false,
  },
  {
    id: "finance",
    title: "Financeiro",
    description: "Relacione sinais operacionais à receita e aos atrasos de pagamento.",
    detail: "Faturamento",
    icon: CurrencyDollar,
    connected: false,
  },
] as const;

export function ConnectionsPage() {
  const [connected, setConnected] = useState<Set<string>>(
    () => new Set(sources.filter((source) => source.connected).map((source) => source.id)),
  );
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [fileName, setFileName] = useState("");

  const activeCount = useMemo(() => connected.size + (fileName ? 1 : 0), [connected, fileName]);

  const toggleConnection = (id: string) => {
    setConnected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="connections-page">
      <header className="page-heading connections-heading">
        <div>
          <span className="eyebrow"><PlugsConnected size={15} weight="duotone" /> Central de dados</span>
          <h1>Conecte os sinais que explicam a perda de valor.</h1>
          <p>
            Una tracking de funcionalidades, dados comerciais e arquivos próprios. Neste protótipo, as conexões são demonstrativas e não enviam dados externos.
          </p>
        </div>
      </header>

      <section className="connection-overview" aria-label="Resumo das conexões">
        <div>
          <span>Fontes ativas</span>
          <strong>{activeCount}</strong>
          <small>de {sources.length + 1} disponíveis</small>
        </div>
        <div className="connection-overview-copy">
          <strong>Mais contexto, alertas mais explicáveis</strong>
          <p>O tracking mostra o comportamento. CRM, suporte, financeiro e planilhas ajudam a explicar por que ele mudou.</p>
        </div>
        <span className="demo-chip">Configuração demonstrativa</span>
      </section>

      <section className="connections-section" aria-labelledby="continuous-connections-title">
        <div className="section-heading connection-section-heading">
          <div>
            <span className="eyebrow">Fluxo contínuo</span>
            <h2 id="continuous-connections-title">Integrações da operação</h2>
          </div>
          <p>Ative as fontes que complementam a visão de saúde dos clientes.</p>
        </div>

        <div className="connections-grid">
          {sources.map(({ id, title, description, detail, icon: Icon }) => {
            const isConnected = connected.has(id);
            return (
              <article className={isConnected ? "connection-card connection-card--active" : "connection-card"} key={id}>
                <div className="connection-card-top">
                  <span className="connection-icon"><Icon size={24} weight="duotone" /></span>
                  <span className={isConnected ? "connection-status connection-status--active" : "connection-status"}>
                    {isConnected && <CheckCircle size={14} weight="fill" />}
                    {isConnected ? "Conectado" : "Disponível"}
                  </span>
                </div>
                <small>{detail}</small>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="connection-actions">
                  <button
                    className={isConnected ? "secondary-button" : "primary-button"}
                    type="button"
                    onClick={() => toggleConnection(id)}
                  >
                    {isConnected ? "Desconectar" : "Conectar fonte"}
                  </button>
                  {id === "tracking" && (
                    <button className="text-button" type="button" onClick={() => setTrackingOpen((open) => !open)}>
                      {trackingOpen ? "Ocultar instruções" : "Ver instruções"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {trackingOpen && (
          <div className="tracking-instructions">
            <div>
              <span className="eyebrow">Exemplo de evento</span>
              <h3>Envie somente ações que representem valor.</h3>
              <p>Use uma identificação da conta ou unidade e evite conteúdo digitado ou cliques sem significado operacional.</p>
            </div>
            <pre><code>{`POST /v1/eventos
{
  "contaId": "atlas-logistica",
  "funcionalidade": "pesagem",
  "evento": "processo_concluido"
}`}</code></pre>
          </div>
        )}
      </section>

      <section className="connections-section" aria-labelledby="file-connection-title">
        <div className="section-heading connection-section-heading">
          <div>
            <span className="eyebrow">Fluxo adaptativo</span>
            <h2 id="file-connection-title">Planilhas e dados próprios</h2>
          </div>
          <p>A IA poderá interpretar as colunas e confirmar com o usuário o que é importante.</p>
        </div>

        <div className={fileName ? "file-connection file-connection--active" : "file-connection"}>
          <span className="connection-icon connection-icon--large"><FileXls size={30} weight="duotone" /></span>
          <div>
            <strong>{fileName || "Importar Excel ou CSV"}</strong>
            <p>{fileName ? "Arquivo selecionado localmente para a demonstração." : "Selecione uma base para iniciar a etapa de entendimento assistido."}</p>
          </div>
          <label className="primary-button file-button">
            <UploadSimple size={17} />
            {fileName ? "Trocar arquivo" : "Selecionar arquivo"}
            <input
              className="sr-only"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
