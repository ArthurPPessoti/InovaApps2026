import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ManagementProvider } from "./management/ManagementContext";
import { RetentionProvider } from "./retention/RetentionContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ManagementProvider>
          <RetentionProvider>
            <App />
          </RetentionProvider>
        </ManagementProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
