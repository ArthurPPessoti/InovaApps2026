import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRAINING_SCRIPT = join(PROJECT_ROOT, "ml", "train_churn_model.py");
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function readBinary(request) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_FILE_BYTES) {
        reject(Object.assign(new Error("A planilha excede o limite de 50 MB."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function sourceExtension(fileName) {
  const match = fileName.toLowerCase().match(/\.(xlsx|csv)$/);
  if (!match) throw Object.assign(new Error("Envie um arquivo .xlsx ou .csv."), { statusCode: 415 });
  return `.${match[1]}`;
}

async function runWorkbookCommand(buffer, fileName, args, mapping) {
  if (!buffer.length) throw Object.assign(new Error("O arquivo está vazio."), { statusCode: 400 });

  const directory = await mkdtemp(join(tmpdir(), "inovaapps-churn-"));
  const inputPath = join(directory, `input${sourceExtension(fileName)}`);
  const outputPath = join(directory, "result.json");
  const mappingPath = join(directory, "mapping.json");
  try {
    await writeFile(inputPath, buffer);
    if (mapping) await writeFile(mappingPath, JSON.stringify(mapping), "utf8");
    await execFileAsync("python", [TRAINING_SCRIPT, "--input", inputPath, "--output", outputPath, ...args, ...(mapping ? ["--mapping", mappingPath] : [])], {
      cwd: PROJECT_ROOT,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch (error) {
    const detail = String(error?.stderr || error?.message || "Falha desconhecida.");
    const incompatible = detail.includes('"compatible": false') || detail.includes("missingSheets");
    throw Object.assign(
      new Error(incompatible
        ? "A planilha não possui as abas e colunas necessárias para calcular churn real."
        : "Não foi possível treinar o modelo com esta planilha."),
      { statusCode: incompatible ? 422 : 500, detail },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function inspectWorkbook(buffer, fileName) {
  const inspection = await runWorkbookCommand(buffer, fileName, ["--inspect"]);
  inspection.fileName = fileName;
  return inspection;
}

export async function analyzeWorkbook(buffer, fileName, mapping) {
  const result = await runWorkbookCommand(buffer, fileName, [], mapping);
  result.source.fileName = fileName;
  return result;
}

async function installMiddleware(server) {
  server.middlewares.use(async (request, response, next) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method !== "POST" || !["/api/churn/analyze", "/api/churn/inspect"].includes(url.pathname)) {
      next();
      return;
    }

    try {
      const fileName = decodeURIComponent(String(request.headers["x-file-name"] ?? "base.xlsx")).trim();
      const mappingHeader = request.headers["x-column-mapping"];
      const mapping = mappingHeader ? JSON.parse(decodeURIComponent(String(mappingHeader))) : undefined;
      const buffer = await readBinary(request);
      const result = url.pathname.endsWith("/inspect")
        ? await inspectWorkbook(buffer, fileName)
        : await analyzeWorkbook(buffer, fileName, mapping);
      sendJson(response, 200, result);
    } catch (error) {
      console.error("[churn-api]", error?.detail || error);
      if (!response.headersSent) sendJson(response, error?.statusCode ?? 500, { error: error.message });
    }
  });
}

export function churnApiPlugin() {
  return {
    name: "churn-api",
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  };
}
