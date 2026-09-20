import assert from "node:assert/strict";
import test from "node:test";
import { mappingProgress, suggestSpreadsheetMapping } from "./spreadsheetMapping.ts";
import type { SpreadsheetInspection } from "./types.ts";

test("sugere o contrato completo quando a planilha usa os nomes canônicos", () => {
  const columns = {
    clientes: ["cliente_id", "segmento", "porte", "plano", "valor_mensal", "sla_contratado_h", "inicio_contrato"],
    atendimento_mensal: ["cliente_id", "mes_ref", "chamados_abertos", "chamados_criticos", "chamados_reabertos", "pct_sla_cumprido", "tempo_medio_resolucao_h", "reclamacoes_formais", "uso_plataforma_pct", "dias_atraso_pagamento", "reunioes_previstas", "reunioes_realizadas"],
    pesquisas_nps: ["cliente_id", "mes_ref", "respondeu", "nota_nps", "classificacao_nps"],
    situacao_clientes: ["cliente_id", "situacao", "mes_cancelamento"],
  };
  const inspection: SpreadsheetInspection = { fileName: "base.xlsx", format: "xlsx", sheets: Object.entries(columns).map(([name, sheetColumns]) => ({ name, columns: sheetColumns, sample: [], rows: 10 })) };
  const mapping = suggestSpreadsheetMapping(inspection);
  assert.equal(mapping.sheets.clientes, "clientes");
  assert.deepEqual(mappingProgress(mapping), { mapped: 27, total: 27, complete: true });
});
