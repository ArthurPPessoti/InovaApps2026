import {
  BellSimple,
  Briefcase,
  ChartLineUp,
  FileXls,
  ListChecks,
  MagicWand,
  PlugsConnected,
  Pulse,
  SignOut,
  SidebarSimple,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAdaptiveAnalysis } from "../analysis/AnalysisContext";
import { useChurnAnalysis } from "../churn/churnAnalysis";

interface AppShellProps {
  children: ReactNode;
}

const technologyNav = [
  { label: "Visão geral", to: "/#resumo", hash: "#resumo", icon: ChartLineUp },
  { label: "Dados", to: "/dados", icon: FileXls },
  { label: "Previsões", to: "/previsoes", icon: MagicWand },
  { label: "Gestão", to: "/gestao", icon: Briefcase },
  { label: "Clientes", to: "/clientes", icon: UsersThree },
  { label: "Sinais", to: "/sinais", icon: Pulse },
  { label: "Conexões", to: "/conexoes", icon: PlugsConnected },
];

const generalNav = [
  { label: "Visão geral", to: "/#resumo", hash: "#resumo", icon: ChartLineUp },
  { label: "Dados", to: "/dados", icon: FileXls },
  { label: "Previsões", to: "/previsoes", icon: MagicWand },
  { label: "Gestão", to: "/gestao", icon: Briefcase },
  { label: "Clientes", to: "/clientes", icon: UsersThree },
];

export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { account, logout } = useAuth();
  const { result: adaptiveAnalysis } = useAdaptiveAnalysis();
  const { analysis: technologyAnalysis } = useChurnAnalysis(account?.id);
  const analysis = account?.profile === "technology" ? technologyAnalysis : adaptiveAnalysis;
  const navItems = account?.profile === "technology" ? technologyNav : generalNav;

  const leaveAccount = () => {
    logout();
    navigate("/acesso", { replace: true });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>

      <button
        className="mobile-menu-button icon-button"
        type="button"
        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={22} /> : <SidebarSimple size={22} />}
      </button>

      {menuOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <Link className="brand" to="/" aria-label="Globalsys - Página inicial" onClick={() => setMenuOpen(false)}>
          <img src="/brand/globalsys-logo.svg" alt="Globalsys" />
          <span>{account?.companyName}</span>
        </Link>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <p className="nav-label">{account?.profile === "technology" ? "Carteira tecnológica" : "Análise preditiva"}</p>
          {navItems.map(({ label, to, hash, icon: Icon }) => {
            const isActive = hash
              ? location.pathname === "/" && (location.hash === hash || (!location.hash && hash === "#resumo"))
              : to === "/clientes" ? location.pathname.startsWith("/clientes") : location.pathname === to;
            return (
            <Link
              key={to}
              className={isActive ? "nav-link nav-link--active" : "nav-link"}
              to={to}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={20} weight="duotone" />
              <span>{label}</span>
            </Link>
            );
          })}
        </nav>

        <div className="sidebar-insight">
          <ListChecks size={22} weight="duotone" />
          <div>
            <strong>Fonte de clientes</strong>
            <span>{analysis?.source.fileName ?? "Cadastre uma planilha"}</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar" aria-hidden="true">{account?.userName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
          <div>
            <strong>{account?.userName}</strong>
            <span>{account?.profile === "technology" ? "Inteligência de produto" : "Análise de clientes"}</span>
          </div>
          <button className="sidebar-logout" type="button" onClick={leaveAccount} aria-label="Sair da conta" title="Sair da conta">
            <SignOut size={18} />
          </button>
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-status">
            <span className="status-live" aria-hidden="true" />
            <span>{analysis ? `Execução de ${new Date(analysis.generatedAt).toLocaleDateString("pt-BR")}` : "Aguardando cadastro da fonte"}</span>
          </div>
          <div className="topbar-actions">
            <span className="demo-chip">{analysis ? `${analysis.summary.analyzedEntities} ${account?.profile === "technology" ? "clientes" : adaptiveAnalysis?.config.objective.entityLabelPlural ?? "entidades"} analisados` : "Fonte da conta"}</span>
            <button
              className="icon-button"
              type="button"
              aria-label="Ver sinais de atenção"
              onClick={() => navigate(account?.profile === "technology" ? "/sinais" : "/previsoes")}
            >
              <BellSimple size={20} />
              <span className="notification-dot" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
