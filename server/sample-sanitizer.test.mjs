import assert from "node:assert/strict";
import test from "node:test";
import { detectKind, sanitizeColumn, sanitizeProfile } from "./sample-sanitizer.mjs";

const column = (patch) => ({ name: "campo", physicalType: "text", semanticRole: "CONTEXT", uniqueCount: 100, possiblePersonalData: false, examples: ["a", "b", "c"], ...patch });

test("detecta o tipo de cada coluna pelo nome e pelos exemplos", () => {
  assert.equal(detectKind(column({ name: "email_contato", examples: ["joao@empresa.com.br"] })), "email");
  assert.equal(detectKind(column({ name: "documento", examples: ["12.345.678/0001-99"] })), "cnpj");
  assert.equal(detectKind(column({ name: "documento", examples: ["529.982.247-25"] })), "cpf");
  assert.equal(detectKind(column({ name: "telefone" })), "phone");
  assert.equal(detectKind(column({ name: "razao_social" })), "company");
  assert.equal(detectKind(column({ name: "responsavel" })), "person");
  assert.equal(detectKind(column({ name: "data_cadastro", physicalType: "date" })), "date");
  assert.equal(detectKind(column({ name: "receita_mensal", physicalType: "number" })), "money");
  assert.equal(detectKind(column({ name: "quantidade", physicalType: "number" })), "number");
  assert.equal(detectKind(column({ name: "ativo", physicalType: "boolean" })), "boolean");
  assert.equal(detectKind(column({ name: "cliente_id", semanticRole: "ENTITY_ID" })), "id");
  assert.equal(detectKind(column({ name: "plano", uniqueCount: 3 })), "category");
});

test("não devolve nenhum dado pessoal original", () => {
  const emails = sanitizeColumn(column({ name: "email", examples: ["joao.silva@acme.com.br", "maria@acme.com.br"] }));
  assert.equal(emails.some((value) => String(value).includes("acme")), false);
  assert.deepEqual(emails, ["contato1@exemplo.com.br", "contato2@exemplo.com.br"]);

  const cnpjs = sanitizeColumn(column({ name: "cnpj", examples: ["12.345.678/0001-99"] }));
  assert.equal(cnpjs.includes("12.345.678/0001-99"), false);
  assert.match(String(cnpjs[0]), /^\d{2}\.\d{3}\.\d{3}\/0001-\d{2}$/);

  const nomes = sanitizeColumn(column({ name: "nome_responsavel", examples: ["Gabriel Aguiar", "Marina Costa"] }));
  assert.equal(nomes.includes("Gabriel Aguiar"), false);
  assert.equal(nomes.length, 2);
});

test("preserva booleanos e categorias, que dão contexto e não identificam ninguém", () => {
  assert.deepEqual(sanitizeColumn(column({ name: "ativo", physicalType: "boolean", examples: [true, false] })), [true, false]);
  assert.deepEqual(sanitizeColumn(column({ name: "plano", uniqueCount: 3, examples: ["Enterprise", "Essencial"] })), ["Enterprise", "Essencial"]);
});

test("números ficam dentro da faixa real e datas mantêm o formato", () => {
  const valores = sanitizeColumn(column({ name: "receita", physicalType: "number", examples: [1200, 3400], statistics: { min: 1000, max: 5000 } }));
  for (const valor of valores) {
    assert.ok(typeof valor === "number" && valor >= 1000 && valor <= 5000, String(valor));
    assert.equal(valores.includes(1200) && valores.includes(3400), false);
  }
  assert.match(String(sanitizeColumn(column({ name: "data", physicalType: "date", examples: ["2025-03-14"] }))[0]), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(String(sanitizeColumn(column({ name: "data", physicalType: "date", examples: ["14/03/2025"] }))[0]), /^\d{2}\/\d{2}\/\d{4}$/);
});

test("identificadores mantêm o formato sem repetir o valor", () => {
  const ids = sanitizeColumn(column({ name: "cliente_id", semanticRole: "ENTITY_ID", examples: ["CLI-2024/07"] }));
  assert.match(String(ids[0]), /^[A-Z]{3}-\d{4}\/\d{2}$/);
  assert.notEqual(ids[0], "CLI-2024/07");
});

test("é determinístico e limita a cinco exemplos por coluna", () => {
  const base = column({ name: "cliente_id", semanticRole: "ENTITY_ID", examples: ["A1", "B2", "C3", "D4", "E5", "F6", "G7"] });
  assert.equal(sanitizeColumn(base).length, 5);
  assert.deepEqual(sanitizeColumn(base), sanitizeColumn(base));
});

test("sanitizeProfile percorre todas as abas e colunas", () => {
  const profile = { sheets: [{ name: "Clientes", columns: [column({ name: "email", examples: ["real@empresa.com"] }), column({ name: "plano", uniqueCount: 2, examples: ["Pro"] })] }] };
  const safe = sanitizeProfile(profile);
  assert.deepEqual(safe.sheets[0].columns[0].examples, ["contato1@exemplo.com.br"]);
  assert.deepEqual(safe.sheets[0].columns[1].examples, ["Pro"]);
  assert.equal(JSON.stringify(safe).includes("real@empresa.com"), false);
});
