import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ClientFormInput,
  emptyClientForm,
  findDuplicate,
  getRegisteredClients,
  saveClient,
  subscribeRegisteredClients,
  validateClient,
} from "./clientRegistry.ts";

const validInput: ClientFormInput = {
  companyName: "Cooperativa Serra Azul",
  segment: "Logística",
  owner: "Helena Prado",
  productName: "Sistema de Pesagem",
  plan: "Avançado",
  monthlyRevenue: "12500",
  criticality: "4",
  startDate: "2026-03-01",
  renewalDate: "2027-03-01",
  contactName: "Otávio Reis",
  contactEmail: "otavio.reis@serraazul.example",
  consentSource: "Contrato assinado",
  externalId: "serra-azul_01",
};

test("entrada válida não gera erros", () => {
  assert.deepEqual(validateClient(validInput, { requireExternalId: true }), {});
});

test("campos obrigatórios vazios geram erro", () => {
  const errors = validateClient(emptyClientForm, { requireExternalId: false });
  for (const field of ["companyName", "segment", "owner", "productName", "plan", "monthlyRevenue", "startDate", "renewalDate", "contactName", "contactEmail", "consentSource"] as const) {
    assert.equal(errors[field], "Campo obrigatório.", field);
  }
  assert.equal(errors.externalId, undefined);
});

test("e-mail inválido é recusado", () => {
  const errors = validateClient({ ...validInput, contactEmail: "otavio@serra" }, { requireExternalId: true });
  assert.equal(errors.contactEmail, "Informe um e-mail válido.");
});

test("valor mensal precisa ser número maior que zero", () => {
  for (const monthlyRevenue of ["0", "-10", "abc"]) {
    const errors = validateClient({ ...validInput, monthlyRevenue }, { requireExternalId: true });
    assert.equal(errors.monthlyRevenue, "Informe um valor maior que zero.", monthlyRevenue);
  }
  assert.equal(validateClient({ ...validInput, monthlyRevenue: "12500,50" }, { requireExternalId: true }).monthlyRevenue, undefined);
});

test("renovação precisa ser depois do início", () => {
  for (const renewalDate of ["2026-03-01", "2026-02-01"]) {
    const errors = validateClient({ ...validInput, renewalDate }, { requireExternalId: true });
    assert.equal(errors.renewalDate, "A renovação precisa ser depois do início.", renewalDate);
  }
});

test("ID externo é obrigatório só no perfil tecnologia", () => {
  const withoutId = { ...validInput, externalId: "" };
  assert.ok(validateClient(withoutId, { requireExternalId: true }).externalId);
  assert.equal(validateClient(withoutId, { requireExternalId: false }).externalId, undefined);
});

test("ID externo recusa caracteres fora do padrão", () => {
  const errors = validateClient({ ...validInput, externalId: "serra azul/01" }, { requireExternalId: false });
  assert.equal(errors.externalId, "Use apenas letras, números, hífen e sublinhado.");
});

test("duplicidade ignora acentos, caixa e espaços extras", () => {
  const existing = ["Atlas Logística", "Rede Vitta Farmácias"];
  assert.equal(findDuplicate("  atlas   logistica ", existing), "Atlas Logística");
  assert.equal(findDuplicate("Atlas Transportes", existing), undefined);
  assert.equal(findDuplicate("   ", existing), undefined);
});

test("saveClient guarda o cliente normalizado e avisa quem está ouvindo", async () => {
  let notified = 0;
  const unsubscribe = subscribeRegisteredClients(() => notified++);
  const saved = await saveClient({ ...validInput, companyName: "  Cooperativa Serra Azul  ", monthlyRevenue: "12500,50" });
  unsubscribe();

  assert.equal(notified, 1);
  assert.equal(getRegisteredClients()[0], saved);
  assert.equal(saved.companyName, "Cooperativa Serra Azul");
  assert.equal(saved.monthlyRevenue, 12500.5);
  assert.equal(saved.criticality, 4);
  assert.ok(saved.id);
});
