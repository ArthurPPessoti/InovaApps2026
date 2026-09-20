import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { analyzeWorkbook, inspectWorkbook } from "./churn-api.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("analisa a planilha oficial e retorna o contrato versionado", async () => {
  const path = resolve(root, "Informacoes_fornecidas", "INOVAAPPS_base_de_dados.xlsx");
  const result = await analyzeWorkbook(await readFile(path), "INOVAAPPS_base_de_dados.xlsx");
  assert.equal(result.schemaVersion, "1.0");
  assert.equal(result.summary.analyzedEntities, 58);
  assert.equal(result.readiness.stage, "active");
  assert.equal(result.predictions.length, 58);
});

test("inspeciona as abas e colunas antes de analisar", async () => {
  const path = resolve(root, "Informacoes_fornecidas", "INOVAAPPS_base_de_dados.xlsx");
  const result = await inspectWorkbook(await readFile(path), "INOVAAPPS_base_de_dados.xlsx");
  assert.ok(result.sheets.some((sheet) => sheet.name === "clientes" && sheet.columns.includes("cliente_id")));
});

test("rejeita extensão sem suporte", async () => {
  await assert.rejects(() => analyzeWorkbook(Buffer.from("cliente_id"), "base.txt"), /\.xlsx ou \.csv/);
});
