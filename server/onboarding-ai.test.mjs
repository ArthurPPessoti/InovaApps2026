import assert from "node:assert/strict";
import test from "node:test";
import { buildRoutingRequest, fallbackRouting, parseRoutingResponse, routeOnboarding, sanitizeMessages } from "./onboarding-ai.mjs";

const geminiReply = (payload) => ({
  ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
});

test("sanitizeMessages limita tamanho, quantidade e descarta vazios", () => {
  const messages = [{ role: "user", text: "  oi  " }, { role: "assistant", text: "" }, { role: "outro", text: "x".repeat(900) }];
  const result = sanitizeMessages(messages);
  assert.deepEqual(result[0], { role: "user", text: "oi" });
  assert.equal(result.length, 2);
  assert.equal(result[1].role, "user");
  assert.equal(result[1].text.length, 500);
  assert.equal(sanitizeMessages(Array.from({ length: 40 }, () => ({ role: "user", text: "a" }))).length, 20);
});

test("buildRoutingRequest envia histórico, empresa e schema estruturado", () => {
  const body = buildRoutingRequest({
    messages: [{ role: "user", text: "somos uma academia" }, { role: "assistant", text: "Entendi." }],
    company: "Corpo em Movimento",
  });
  assert.equal(body.contents[0].role, "user");
  assert.equal(body.contents[1].role, "model");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(body.generationConfig.responseSchema.properties.profile.enum.includes("technology"), true);
  assert.match(body.systemInstruction.parts[0].text, /Corpo em Movimento/);
});

test("parseRoutingResponse aceita decisão válida e deriva o primeiro passo", () => {
  const result = parseRoutingResponse({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Pronto.", quickReplies: ["a", "b", "c", "d", "e"], done: true, profile: "technology", segment: "Logística", goal: "Antecipar saídas", dataSource: "Planilha", rationale: "tem produto próprio" }) }] } }],
  });
  assert.equal(result.done, true);
  assert.equal(result.quickReplies.length, 4);
  assert.equal(result.decision.profile, "technology");
  assert.equal(result.decision.firstStep, "conexoes");
  assert.equal(result.decision.goal, "Antecipar saídas");
});

test("parseRoutingResponse não conclui com perfil inválido", () => {
  const result = parseRoutingResponse({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Ainda não sei.", quickReplies: [], done: true, profile: "indefinido", segment: "", rationale: "" }) }] } }],
  });
  assert.equal(result.done, false);
  assert.equal(result.decision, null);
});

test("parseRoutingResponse rejeita texto sem JSON válido", () => {
  assert.throws(() => parseRoutingResponse({ candidates: [{ content: { parts: [{ text: "desculpe, não sei" }] } }] }));
  assert.throws(() => parseRoutingResponse({}), /vazia/);
});

const conversaCompleta = (extras) => [
  { role: "user", text: extras.ramo },
  { role: "user", text: extras.publico },
  { role: "user", text: extras.objetivo },
  { role: "user", text: extras.dados },
  { role: "user", text: extras.perda },
];

test("fallbackRouting pergunta público, objetivo, dados e o que é perder um cliente", () => {
  const roteiro = ["própria empresa", "descobrir primeiro", "planilha que você envia", "perder um cliente"];
  const mensagens = [{ role: "user", text: "tenho um petshop" }];
  for (const esperado of roteiro) {
    const turno = fallbackRouting({ messages: mensagens });
    assert.equal(turno.done, false, esperado);
    assert.match(turno.reply, new RegExp(esperado));
    assert.ok(turno.quickReplies.length >= 2);
    mensagens.push({ role: "assistant", text: turno.reply }, { role: "user", text: "resposta" });
  }
});

test("fallbackRouting não decide antes de quatro respostas", () => {
  const parcial = fallbackRouting({
    messages: [
      { role: "user", text: "tenho um petshop e uso planilha" },
      { role: "user", text: "São clientes da minha empresa" },
    ],
  });
  assert.equal(parcial.done, false);
});

test("fallbackRouting decide general para quem acompanha os próprios clientes", () => {
  const result = fallbackRouting({
    messages: conversaCompleta({
      ramo: "Tenho um petshop em Vitória",
      publico: "São clientes da minha empresa",
      objetivo: "Quem já parou de comprar",
      dados: "Tenho planilha em Excel ou CSV",
      perda: "Deixou de frequentar",
    }),
  });
  assert.equal(result.done, true);
  assert.equal(result.decision.profile, "general");
  assert.equal(result.decision.segment, "Petshop");
  assert.equal(result.decision.goal, "Recuperar quem já parou");
  assert.equal(result.decision.dataSource, "Planilha (Excel ou CSV)");
  assert.equal(result.decision.firstStep, "dados");
});

test("fallbackRouting decide technology para quem vende um produto a outras empresas", () => {
  const result = fallbackRouting({
    messages: conversaCompleta({
      ramo: "Temos um software de logística",
      publico: "São empresas que contratam um produto meu",
      objetivo: "Quem está prestes a sair",
      dados: "Está num sistema de gestão ou CRM",
      perda: "Cancelou o contrato",
    }),
  });
  assert.equal(result.decision.profile, "technology");
  assert.equal(result.decision.firstStep, "conexoes");
  assert.equal(result.decision.dataSource, "Sistema de gestão ou CRM");
});

test("routeOnboarding usa o Gemini quando há chave e não devolve a chave", async () => {
  let receivedKey = "";
  const result = await routeOnboarding({
    messages: [
      { role: "user", text: "temos um SaaS" },
      { role: "user", text: "São empresas que contratam um produto meu" },
      { role: "user", text: "Quem está prestes a sair" },
    ],
    company: "Nexora",
    apiKey: "chave-secreta-123",
    fetchImpl: async (_url, init) => {
      receivedKey = init.headers["x-goog-api-key"];
      return geminiReply({ reply: "Pronto.", quickReplies: [], done: true, profile: "technology", segment: "Tecnologia", goal: "Antecipar saídas", dataSource: "Planilha", rationale: "produto próprio" });
    },
  });
  assert.equal(receivedKey, "chave-secreta-123");
  assert.equal(result.engine, "gemini");
  assert.equal(result.decision.profile, "technology");
  assert.equal(JSON.stringify(result).includes("chave-secreta-123"), false);
});

test("routeOnboarding cai no simulado sem chave, com erro HTTP e com timeout", async () => {
  const messages = conversaCompleta({
    ramo: "somos uma clínica",
    publico: "São clientes da minha empresa",
    objetivo: "Quem está prestes a sair",
    dados: "Tenho planilha em Excel ou CSV",
    perda: "Parou de comprar",
  });

  const semChave = await routeOnboarding({ messages, apiKey: "" });
  assert.equal(semChave.engine, "simulado");
  assert.equal(semChave.decision.segment, "Saúde");
  assert.equal(semChave.decision.profile, "general");

  const erroHttp = await routeOnboarding({ messages, apiKey: "k", fetchImpl: async () => ({ ok: false, status: 500 }) });
  assert.equal(erroHttp.engine, "simulado");
  assert.equal(erroHttp.done, true);

  const timeout = await routeOnboarding({
    messages,
    apiKey: "k",
    timeoutMs: 5,
    // Resposta lenta de verdade: o AbortSignal dispara antes de o timer terminar.
    fetchImpl: (_url, init) => new Promise((resolve, reject) => {
      const slow = setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 80);
      init.signal.addEventListener("abort", () => { clearTimeout(slow); reject(new Error("abortado")); });
    }),
  });
  assert.equal(timeout.engine, "simulado");
});

test("routeOnboarding não deixa o Gemini concluir com poucas respostas", async () => {
  const result = await routeOnboarding({
    messages: [{ role: "user", text: "tenho um petshop" }],
    apiKey: "k",
    fetchImpl: async () => geminiReply({ reply: "Pronto, já sei tudo.", quickReplies: [], done: true, profile: "general", segment: "Petshop", goal: "x", dataSource: "y", rationale: "z" }),
  });
  assert.equal(result.engine, "gemini");
  assert.equal(result.done, false);
  assert.equal(result.decision, null);
  assert.match(result.reply, /própria empresa/);
  assert.ok(result.quickReplies.length >= 2);
});
