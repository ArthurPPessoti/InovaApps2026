import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTracker } from "../tracker/createTracker.mjs";
import { createInventoryActions, DEMO_USER_ID } from "./actions.mjs";

const applicationId = process.env.DEMO_APPLICATION_ID;
const credential = process.env.DEMO_CREDENTIAL;
const endpoint = process.env.DEMO_PLATFORM_ENDPOINT;
const port = Number(process.env.DEMO_PORT ?? 4174);
const host = process.env.DEMO_HOST ?? "127.0.0.1";

const missingVariables = [
  ["DEMO_APPLICATION_ID", applicationId],
  ["DEMO_CREDENTIAL", credential],
  ["DEMO_PLATFORM_ENDPOINT", endpoint],
].filter(([, value]) => !value).map(([name]) => name);

if (missingVariables.length > 0) {
  console.error(`Configuração ausente: ${missingVariables.join(", ")}.`);
  console.error("Copie demo-app/.env.example para demo-app/.env e preencha os valores.");
  process.exit(1);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("DEMO_PORT deve ser uma porta TCP válida.");
  process.exit(1);
}

const tracker = createTracker({ applicationId, credential, endpoint });
const actions = createInventoryActions({ tracker });
const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));

const staticFiles = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", type: "text/css; charset=utf-8" }],
]);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function sendStaticFile(response, file) {
  response.writeHead(200, {
    "Content-Type": file.type,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'",
  });
  createReadStream(join(publicDirectory, file.file)).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

  if (request.method === "GET" && staticFiles.has(url.pathname)) {
    sendStaticFile(response, staticFiles.get(url.pathname));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ready: true,
      applicationId,
      userId: DEMO_USER_ID,
    });
    return;
  }

  const actionMatch = url.pathname.match(/^\/api\/actions\/([a-z-]+)$/);
  if (request.method === "POST" && actionMatch) {
    const action = actions[actionMatch[1]];
    if (!action) {
      sendJson(response, 404, { error: "Funcionalidade não encontrada." });
      return;
    }

    try {
      const result = await action();
      sendJson(response, 200, {
        success: true,
        message: result.message,
        event: result.event,
      });
    } catch (error) {
      console.error(`[demo-app] Falha ao executar ${actionMatch[1]}:`, error.message);
      sendJson(response, 502, {
        success: false,
        error: error.message,
      });
    }
    return;
  }

  if (request.method === "GET" && extname(url.pathname)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Arquivo não encontrado.");
    return;
  }

  sendJson(response, 404, { error: "Rota não encontrada." });
});

server.listen(port, host, () => {
  console.log(`Sistema de Estoque disponível em http://${host}:${port}`);
  console.log(`Aplicação monitorada: ${applicationId}`);
  console.log(`Endpoint da plataforma: ${endpoint}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
