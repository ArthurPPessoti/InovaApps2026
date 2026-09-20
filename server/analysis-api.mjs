import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadEnv } from "vite";
import { sanitizeProfile } from "./sample-sanitizer.mjs";

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = join(ROOT, "ml", "adaptive_analysis.py");
const MAX_BYTES = 50 * 1024 * 1024;
const TTL_MS = 60 * 60 * 1000;
const sources = new Map();

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function errorWithStatus(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function readBody(request, limit = MAX_BYTES) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > limit) {
        reject(errorWithStatus("O conteúdo excede o limite permitido.", 413));
        request.destroy();
      } else chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function readJson(request) {
  const body = await readBody(request, 2 * 1024 * 1024);
  try { return JSON.parse(body.toString("utf8") || "{}"); }
  catch { throw errorWithStatus("JSON inválido."); }
}

function sourceExtension(name) {
  const extension = extname(name).toLowerCase();
  if (![".xlsx", ".csv"].includes(extension)) throw errorWithStatus("Envie um arquivo .xlsx ou .csv.", 415);
  return extension;
}

async function runPython(command, source, config) {
  const output = join(source.directory, `${command}-${crypto.randomUUID()}.json`);
  const args = [ENGINE, command, "--input", source.path, "--output", output, "--file-name", source.fileName];
  let configPath;
  if (config) {
    configPath = join(source.directory, `config-${crypto.randomUUID()}.json`);
    await writeFile(configPath, JSON.stringify(config), "utf8");
    args.push("--config", configPath);
  }
  try {
    await execFileAsync("python", args, { cwd: ROOT, windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
    return JSON.parse(await readFile(output, "utf8"));
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error);
    throw Object.assign(new Error(detail.split("\n").filter(Boolean).at(-1) || "Falha no motor de análise."), { statusCode: 422, detail });
  }
}

function purgeExpired() {
  const now = Date.now();
  for (const [token, source] of sources) {
    if (source.expiresAt <= now) {
      sources.delete(token);
      void rm(source.directory, { recursive: true, force: true });
    }
  }
}

function getSource(token) {
  purgeExpired();
  const source = sources.get(String(token || ""));
  if (!source) throw errorWithStatus("A fonte expirou. Reimporte o arquivo para continuar.", 410);
  return source;
}

// A IA recebe sempre cinco linhas de exemplo, mas sintéticas: o formato vai, o dado real não.
function maskedProfile(profile) {
  return sanitizeProfile(profile, 5);
}

function deterministicAssistant({ profile, messages, config }) {
  const userTurns = (messages || []).filter((message) => message.role === "user").length;
  const questions = [
    ["O que você quer antecipar com estes dados?", ["Cancelamento", "Não retorno", "Inadimplência", "Não renovação"]],
    ["Em quanto tempo uma intervenção ainda seria útil?", ["30 dias", "60 dias", "90 dias", "180 dias"]],
    ["Quais dimensões mais importam para o seu negócio?", ["Relacionamento", "Frequência e uso", "Financeiro", "Atendimento"]],
  ];
  if (userTurns < questions.length) return { engine: "deterministic", reply: questions[userTurns][0], quickReplies: questions[userTurns][1], warnings: profile.warnings, configPatch: {} };
  return { engine: "deterministic", reply: "Organizei a sugestão. Revise o objetivo, os pesos e as colunas antes de aprovar a execução.", quickReplies: [], warnings: profile.warnings, configPatch: { ...config, objective: { ...config.objective, confirmed: false } } };
}

async function assistantTurn(body, apiKey, model) {
  if (!apiKey) return deterministicAssistant(body);
  const safeProfile = maskedProfile(body.profile);
  const prompt = `Você é um analista de dados da INOVAAPPS. Ajude a configurar uma análise preditiva genérica. A IA apenas sugere alterações estruturadas; nunca calcula scores. Faça uma pergunta curta por vez e não declare probabilidade. Perfil (os valores de exemplo são sintéticos, servem só para mostrar o formato): ${JSON.stringify(safeProfile)}. Configuração: ${JSON.stringify(body.config)}. Conversa: ${JSON.stringify((body.messages || []).slice(-12))}`;
  const schema = { type: "object", properties: { reply: { type: "string" }, quickReplies: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "string" } }, objectiveBehavior: { type: "string" }, horizonDays: { type: "integer" } }, required: ["reply", "quickReplies", "warnings", "objectiveBehavior", "horizonDays"] };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: .25, maxOutputTokens: 700, responseMimeType: "application/json", responseSchema: schema } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Gemini respondeu ${response.status}.`);
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    const parsed = JSON.parse(text);
    return { engine: "gemini", reply: String(parsed.reply), quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies.slice(0, 4) : [], warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [], configPatch: { objective: { ...body.config.objective, behavior: String(parsed.objectiveBehavior || body.config.objective.behavior), horizonDays: Number(parsed.horizonDays || body.config.objective.horizonDays), confirmed: false } } };
  } catch (error) {
    console.warn("[analysis-assistant] fallback:", error?.message || error);
    return deterministicAssistant(body);
  }
}

function contactDraft(entity, objective) {
  const factor = entity?.factors?.[0]?.label || "mudanças recentes no relacionamento";
  const behavior = objective?.behavior || "interromper o relacionamento";
  return {
    urgency: entity?.band === "CRITICAL" ? "Hoje" : entity?.band === "HIGH" ? "Em até 2 dias" : "Nesta semana",
    channel: entity?.context?.email ? "E-mail" : "Contato consultivo",
    owner: entity?.owner || "Definir responsável",
    goal: `Entender o contexto antes que o cliente possa ${behavior}.`,
    tone: "Consultivo, empático e sem afirmar que o cliente está sendo monitorado.",
    facts: [`Foi observada uma mudança em ${factor}.`, `A análise tem ${Math.round((entity?.coverage || 0) * 100)}% de cobertura.`],
    avoid: ["Mencionar score interno ou monitoramento individual.", "Tratar a previsão como certeza ou causalidade."],
    subject: "Podemos entender melhor sua experiência?",
    message: `Olá! Queremos entender como tem sido sua experiência e se existe algo que poderíamos fazer para entregar mais valor. Podemos conversar por alguns minutos?`,
  };
}

export function analysisApiPlugin() {
  let env = {};
  const install = (server) => {
    env = loadEnv(server.config.mode, ROOT, "");
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || "/", "http://localhost");
      if (request.method !== "POST" || !url.pathname.startsWith("/api/analysis/")) return next();
      try {
        purgeExpired();
        if (url.pathname === "/api/analysis/sources") {
          const fileName = decodeURIComponent(String(request.headers["x-file-name"] || "base.xlsx")).trim();
          const extension = sourceExtension(fileName);
          const buffer = await readBody(request);
          if (!buffer.length) throw errorWithStatus("O arquivo está vazio.");
          const directory = await mkdtemp(join(tmpdir(), "inovaapps-analysis-"));
          const path = join(directory, `source${extension}`);
          await writeFile(path, buffer);
          const token = crypto.randomUUID();
          const source = { directory, path, fileName, expiresAt: Date.now() + TTL_MS };
          sources.set(token, source);
          const result = await runPython("profile", source);
          return sendJson(response, 200, { sourceToken: token, expiresAt: new Date(source.expiresAt).toISOString(), ...result });
        }
        const body = await readJson(request);
        if (url.pathname === "/api/analysis/assistant") return sendJson(response, 200, await assistantTurn(body, env.GEMINI_API_KEY, env.GEMINI_MODEL || "gemini-3.5-flash-lite"));
        if (url.pathname === "/api/analysis/contact-draft") return sendJson(response, 200, contactDraft(body.entity, body.objective));
        const source = getSource(body.sourceToken);
        if (url.pathname === "/api/analysis/validate") return sendJson(response, 200, await runPython("validate", source, body.config));
        if (url.pathname === "/api/analysis/runs") return sendJson(response, 200, await runPython("run", source, body.config));
        return sendJson(response, 404, { error: "Endpoint não encontrado." });
      } catch (error) {
        console.error("[analysis-api]", error?.detail || error);
        if (!response.headersSent) sendJson(response, error?.statusCode || 500, { error: error.message || "Falha na análise." });
      }
    });
  };
  return { name: "analysis-api", configureServer: install, configurePreviewServer: install };
}

export const analysisInternals = { maskedProfile, deterministicAssistant, contactDraft };
