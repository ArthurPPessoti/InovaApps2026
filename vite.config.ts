import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error O backend local da feature Conectar é executado diretamente pelo Node.
import { connectionsApiPlugin } from "./server/connections-api.mjs";
// @ts-expect-error O processamento local do piloto de churn é executado diretamente pelo Node.
import { churnApiPlugin } from "./server/churn-api.mjs";
// @ts-expect-error O roteamento do cadastro pela IA roda no servidor para a chave não ir ao navegador.
import { onboardingAiPlugin } from "./server/onboarding-ai.mjs";
// @ts-expect-error O motor adaptativo roda no servidor local para não expor arquivos ou a chave Gemini.
import { analysisApiPlugin } from "./server/analysis-api.mjs";

export default defineConfig({
  plugins: [react(), connectionsApiPlugin(), churnApiPlugin(), onboardingAiPlugin(), analysisApiPlugin()],
});
