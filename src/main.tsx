import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { PortfolioProvider } from "./features/portfolio/PortfolioContext";
import { ManagementProvider } from "./management/ManagementContext";
import { RetentionProvider } from "./retention/RetentionContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ManagementProvider>
          <PortfolioProvider>
            <RetentionProvider>
              <App />
            </RetentionProvider>
          </PortfolioProvider>
        </ManagementProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
