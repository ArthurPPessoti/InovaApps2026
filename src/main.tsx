import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { PortfolioProvider } from "./features/portfolio/PortfolioContext";
import { ManagementProvider } from "./management/ManagementContext";
import { RetentionProvider } from "./retention/RetentionContext";
import { AnalysisProvider } from "./analysis/AnalysisContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AnalysisProvider>
          <ManagementProvider>
            <PortfolioProvider>
              <RetentionProvider>
                <App />
              </RetentionProvider>
            </PortfolioProvider>
          </ManagementProvider>
        </AnalysisProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
