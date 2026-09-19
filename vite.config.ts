import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error O backend local da feature Conectar é executado diretamente pelo Node.
import { connectionsApiPlugin } from "./server/connections-api.mjs";

export default defineConfig({
  plugins: [react(), connectionsApiPlugin()],
});
