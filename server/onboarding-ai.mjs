import { loadEnv } from "vite";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// O alias gemini-flash-latest aponta para um modelo com 20 requisições/dia no plano gratuito; o lite tem cota maior.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;
// Mínimo de respostas da pessoa antes de qualquer conclusão, para a IA não decidir com pouca informação.
const MIN_USER_ANSWERS = 3;

const SYSTEM_INSTRUCTION = `Você conduz o cadastro na INOVAAPPS, uma plataforma que antecipa a perda de clientes.

COMO A PLATAFORMA FUNCIONA (não invente outra coisa):
- A base de tudo é a planilha de dados que a empresa envia (Excel ou CSV) com o histórico dos clientes dela.
- A partir dessa planilha a plataforma calcula quem está em risco, por quê e quanta receita está em jogo.
- Acompanhar eventos de uso de um sistema (cliques, acessos, funcionalidades) é um COMPLEMENTO opcional, disponível para quem tem um produto digital próprio. Nunca trate isso como a característica principal, nem como alternativa à planilha.

A PERGUNTA QUE DEFINE O PERFIL é de quem são os clientes analisados:
- "general": a pessoa quer acompanhar os clientes da PRÓPRIA empresa (petshop, academia, clínica, escola, loja, prestador de serviço, indústria, e também empresas de tecnologia que só querem analisar a própria carteira).
- "technology": a pessoa oferece um produto ou sistema contratado por OUTRAS empresas e quer acompanhar essas empresas clientes, podendo complementar a planilha com os eventos de uso do produto.
Na dúvida, escolha "general".

O QUE VOCÊ PRECISA DESCOBRIR, em português do Brasil:
1. De quem são os clientes: da própria empresa ou de um produto oferecido a outras empresas.
2. O ramo de atuação.
3. O que a pessoa quer descobrir primeiro (quem está prestes a sair, quem já parou de comprar, onde está perdendo receita).
4. Como os dados dela estão hoje (planilha, sistema de gestão ou CRM, ou nada organizado) e o que significa "perder um cliente" no negócio dela (cancelou, parou de comprar, deixou de frequentar).

REGRAS:
- Faça no mínimo 3 e no máximo 5 perguntas antes de concluir. Não conclua com pouca informação.
- Uma pergunta por vez, curta, em linguagem simples. Nunca use jargão como tracking, SaaS, integração, churn ou cliques com quem não é da área.
- Use o que a pessoa já disse: não repita pergunta respondida e demonstre que entendeu.
- Nunca peça dados pessoais dos clientes finais.
- Em cada pergunta ofereça de 2 a 4 respostas rápidas em "quickReplies". Ao concluir, deixe "quickReplies" vazio.
- Ao concluir, responda "done": true, preencha "profile", "segment", "goal" (o que ela quer descobrir), "dataSource" (como os dados estão hoje) e "rationale", e escreva em "reply" uma confirmação de uma frase citando o que ela contou.
- "segment", "goal" e "dataSource" são rótulos curtos para a interface: no máximo 2 palavras em "segment" (ex.: Petshop, Academia, Saúde) e no máximo 6 palavras nos outros dois.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    quickReplies: { type: "array", items: { type: "string" } },
    done: { type: "boolean" },
    profile: { type: "string", enum: ["technology", "general", "indefinido"] },
    segment: { type: "string" },
    goal: { type: "string" },
    dataSource: { type: "string" },
    rationale: { type: "string" },
  },
  required: ["reply", "quickReplies", "done", "profile", "segment", "goal", "dataSource", "rationale"],
};

const FOLLOW_UP_QUESTIONS = [
  {
    key: "audience",
    reply: "Entendi. E esses clientes são da sua própria empresa, ou são empresas que contratam um produto seu?",
    quickReplies: ["São clientes da minha empresa", "São empresas que contratam um produto meu"],
  },
  {
    key: "goal",
    reply: "Certo. O que você quer descobrir primeiro sobre eles?",
    quickReplies: ["Quem está prestes a sair", "Quem já parou de comprar", "Onde estou perdendo receita"],
  },
  {
    key: "dataSource",
    reply: "E como esses dados estão hoje? A análise começa por uma planilha que você envia.",
    quickReplies: ["Tenho planilha em Excel ou CSV", "Está num sistema de gestão ou CRM", "Ainda não organizei"],
  },
  {
    key: "churn",
    reply: "Por último: no seu negócio, o que significa perder um cliente?",
    quickReplies: ["Cancelou o contrato", "Parou de comprar", "Deixou de frequentar"],
  },
];

const AUDIENCE_PRODUCT_HINTS = ["contratam um produto", "outras empresas", "empresas que contratam", "meus clientes sao empresas", "meus clientes são empresas", "produto meu", "vendo para empresas", "b2b"];
const AUDIENCE_OWN_HINTS = ["minha empresa", "meus proprios", "meus próprios", "propria empresa", "própria empresa", "meus clientes finais", "uso pessoal"];

const TECHNOLOGY_HINTS = ["sistema próprio", "sistema proprio", "software", "saas", "aplicativo", "nosso app", "plataforma que", "produto digital", "api", "eventos do produto", "meus clientes usam o sistema", "clientes usam nosso"];
const GENERAL_HINTS = ["planilha", "excel", "csv", "meus dados", "nossos dados", "proprios dados", "próprios dados", "caderno", "anotações", "anotacoes", "sistema de gestão", "sistema de gestao", "erp", "agenda"];

const GOAL_HINTS = [
  { goal: "Antecipar quem está prestes a sair", terms: ["prestes a sair", "vai sair", "antecipar", "antes de cancelar", "risco"] },
  { goal: "Recuperar quem já parou", terms: ["parou de comprar", "parou de vir", "ja saiu", "já saiu", "voltar", "recuperar", "sumiu"] },
  { goal: "Entender onde a receita está sendo perdida", terms: ["receita", "faturamento", "dinheiro", "perdendo"] },
];

const DATA_HINTS = [
  { source: "Planilha (Excel ou CSV)", terms: ["planilha", "excel", "csv", "tabela"] },
  { source: "Sistema de gestão ou CRM", terms: ["sistema de gestão", "sistema de gestao", "crm", "erp", "software de gestão", "software de gestao"] },
  { source: "Ainda não organizados", terms: ["não organiz", "nao organiz", "caderno", "anotações", "anotacoes", "memória", "memoria", "nada ainda"] },
];

const SEGMENT_HINTS = [
  { segment: "Petshop", terms: ["pet", "petshop", "veterin", "banho e tosa"] },
  { segment: "Fitness", terms: ["academia", "fitness", "treino", "personal", "pilates", "crossfit"] },
  { segment: "Educação", terms: ["escola", "curso", "aluno", "faculdade", "ensino", "educação", "educacao"] },
  { segment: "Saúde", terms: ["clínica", "clinica", "paciente", "hospital", "saúde", "saude", "odonto", "dentista"] },
  { segment: "Beleza", terms: ["salão", "salao", "barbearia", "estética", "estetica", "manicure"] },
  { segment: "Alimentação", terms: ["restaurante", "lanchonete", "delivery", "padaria", "pizzaria"] },
  { segment: "Varejo", terms: ["loja", "varejo", "supermercado", "farmácia", "farmacia", "e-commerce"] },
  { segment: "Indústria", terms: ["indústria", "industria", "fábrica", "fabrica", "produção", "producao"] },
  { segment: "Logística", terms: ["logística", "logistica", "transportadora", "frota", "entrega"] },
  { segment: "Tecnologia", terms: ["software", "saas", "tecnologia", "plataforma", "aplicativo", "devops"] },
];

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("pt-BR");
}

export function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      text: String(message?.text ?? "").trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((message) => message.text)
    .slice(-MAX_MESSAGES);
}

export function buildRoutingRequest({ messages, company }) {
  const history = sanitizeMessages(messages);
  const answered = history.filter((message) => message.role === "user").length;
  const intro = company ? `A empresa se chama ${company}.` : "";
  const progress = answered < MIN_USER_ANSWERS
    ? `A pessoa respondeu ${answered} vez(es). Você só pode concluir a partir da ${MIN_USER_ANSWERS + 1}ª resposta dela, então faça a próxima pergunta.`
    : `A pessoa já respondeu ${answered} vezes. Conclua assim que tiver o necessário.`;
  return {
    systemInstruction: { parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n${intro}\n${progress}`.trim() }] },
    contents: history.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }],
    })),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 600,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };
}

function firstStepFor(profile) {
  return profile === "technology" ? "conexoes" : "dados";
}

export function parseRoutingResponse(payload) {
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text ?? "").join("") ?? "";
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  if (!cleaned) throw new Error("Resposta vazia do modelo.");

  const parsed = JSON.parse(cleaned);
  const reply = String(parsed.reply ?? "").trim();
  if (!reply) throw new Error("Resposta sem texto para o usuário.");

  const quickReplies = Array.isArray(parsed.quickReplies)
    ? parsed.quickReplies.map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
    : [];
  const profile = parsed.profile === "technology" || parsed.profile === "general" ? parsed.profile : null;
  const done = parsed.done === true && profile !== null;

  return {
    reply,
    quickReplies,
    done,
    decision: done
      ? {
          profile,
          segment: String(parsed.segment ?? "").trim() || "Serviços",
          goal: String(parsed.goal ?? "").trim(),
          dataSource: String(parsed.dataSource ?? "").trim(),
          firstStep: firstStepFor(profile),
          rationale: String(parsed.rationale ?? "").trim(),
        }
      : null,
  };
}

export function fallbackRouting({ messages }) {
  const history = sanitizeMessages(messages);
  const answered = history.filter((message) => message.role === "user");
  const combined = normalize(answered.map((message) => message.text).join(" "));

  // Só decide depois de entender público, objetivo, dados e o que é perder um cliente.
  if (answered.length <= FOLLOW_UP_QUESTIONS.length) {
    const { key, ...question } = FOLLOW_UP_QUESTIONS[answered.length - 1];
    void key;
    return { ...question, done: false, decision: null };
  }

  const segmentHit = SEGMENT_HINTS.find((item) => item.terms.some((term) => combined.includes(term)))?.segment;
  const audienceProduct = AUDIENCE_PRODUCT_HINTS.some((hint) => combined.includes(hint));
  const audienceOwn = AUDIENCE_OWN_HINTS.some((hint) => combined.includes(hint));
  const technologyScore = TECHNOLOGY_HINTS.filter((hint) => combined.includes(hint)).length + (audienceProduct ? 2 : 0);
  const generalScore = GENERAL_HINTS.filter((hint) => combined.includes(hint)).length + (audienceOwn ? 2 : 0);

  const profile = technologyScore > generalScore ? "technology" : "general";
  const segment = segmentHit ?? (profile === "technology" ? "Tecnologia" : "Serviços");
  const goal = GOAL_HINTS.find((item) => item.terms.some((term) => combined.includes(term)))?.goal ?? "Antecipar quem está em risco";
  const dataSource = DATA_HINTS.find((item) => item.terms.some((term) => combined.includes(term)))?.source ?? "A definir";

  return {
    reply: profile === "technology"
      ? `Certo. Vou preparar o ambiente para acompanhar o uso do seu sistema${segmentHit ? ` no setor de ${segment.toLocaleLowerCase("pt-BR")}` : ""}.`
      : `Certo. Vou preparar o ambiente para analisar os seus clientes a partir dos seus próprios dados${segmentHit ? ` (${segment.toLocaleLowerCase("pt-BR")})` : ""}.`,
    quickReplies: [],
    done: true,
    decision: {
      profile,
      segment,
      goal,
      dataSource,
      firstStep: firstStepFor(profile),
      rationale: profile === "technology"
        ? "As respostas indicam um produto próprio usado pelos clientes."
        : "As respostas indicam acompanhamento por dados e planilhas.",
    },
  };
}

export async function routeOnboarding({
  messages,
  company,
  apiKey,
  model = DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!apiKey) return { engine: "simulado", ...fallbackRouting({ messages }) };

  try {
    const response = await fetchImpl(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(buildRoutingRequest({ messages, company })),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Gemini respondeu ${response.status}.`);
    const turn = parseRoutingResponse(await response.json());
    const answered = sanitizeMessages(messages).filter((message) => message.role === "user").length;
    // O modelo às vezes conclui cedo demais; nesse caso seguimos com a próxima pergunta do roteiro.
    if (turn.done && answered < MIN_USER_ANSWERS) {
      const { key, ...question } = FOLLOW_UP_QUESTIONS[Math.min(answered, FOLLOW_UP_QUESTIONS.length) - 1];
      void key;
      return { engine: "gemini", ...question, done: false, decision: null };
    }
    return { engine: "gemini", ...turn };
  } catch (error) {
    // A mensagem nunca inclui a chave: só o status ou o motivo da falha.
    console.warn("[onboarding-ai] usando modo simulado:", error?.message ?? error);
    return { engine: "simulado", ...fallbackRouting({ messages }) };
  }
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 64 * 1024) {
        reject(Object.assign(new Error("Conversa longa demais."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(Object.assign(new Error("Corpo inválido."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

export function onboardingAiPlugin() {
  let apiKey = "";
  let model = DEFAULT_MODEL;

  const installMiddleware = (server) => {
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/api/onboarding/status" && request.method === "GET") {
        sendJson(response, 200, { engine: apiKey ? "gemini" : "simulado" });
        return;
      }
      if (url.pathname !== "/api/onboarding/chat" || request.method !== "POST") {
        next();
        return;
      }

      try {
        const body = await readJson(request);
        const result = await routeOnboarding({ messages: body.messages, company: body.company, apiKey, model });
        sendJson(response, 200, result);
      } catch (error) {
        console.error("[onboarding-ai]", error?.message ?? error);
        if (!response.headersSent) sendJson(response, error?.statusCode ?? 500, { error: error.message });
      }
    });
  };

  return {
    name: "onboarding-ai",
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), "");
      apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
      model = env.GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    },
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  };
}
