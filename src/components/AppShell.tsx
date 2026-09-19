import {
  BellSimple,
  ChartLineUp,
  ListChecks,
  Pulse,
  SidebarSimple,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface AppShellProps {
  children: ReactNode;
}

const navItems = [
  { label: "Visão geral", hash: "#resumo", icon: ChartLineUp },
  { label: "Clientes", hash: "#clientes", icon: UsersThree },
  { label: "Sinais", hash: "#sinais", icon: Pulse },
];

export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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
          <span>INOVAAPPS 2026</span>
        </Link>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <p className="nav-label">Carteira</p>
          {navItems.map(({ label, hash, icon: Icon }) => {
            const isActive = location.pathname === "/" && (location.hash === hash || (!location.hash && hash === "#resumo"));
            return (
            <Link
              key={hash}
              className={isActive ? "nav-link nav-link--active" : "nav-link"}
              to={`/${hash}`}
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
            <strong>Dados demonstrativos</strong>
            <span>Scores e prioridades são mocks.</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar" aria-hidden="true">CS</div>
          <div>
            <strong>Equipe de Sucesso</strong>
            <span>Gestão da carteira</span>
          </div>
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-status">
            <span className="status-live" aria-hidden="true" />
            <span>Atualizado hoje às 09:42</span>
          </div>
          <div className="topbar-actions">
            <span className="demo-chip">Ambiente demonstrativo</span>
            <button className="icon-button" type="button" aria-label="Notificações">
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
