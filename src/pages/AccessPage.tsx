import {
  ArrowRight,
  Buildings,
  CheckCircle,
  FileXls,
  Robot,
  Sparkle,
  UploadSimple,
} from "@phosphor-icons/react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSupportedSpreadsheet, spreadsheetMetadata, useAuth } from "../auth/AuthContext";
import { analyzeSpreadsheet, saveChurnAnalysis } from "../churn/churnAnalysis";
import {
  type OnboardingDecision,
  type OnboardingMessage,
  type OnboardingTurn,
  fetchOnboardingEngine,
  firstOnboardingQuestion,
  onboardingStarters,
  sendOnboardingMessage,
} from "../onboarding/aiOnboarding";
import type { CompanyProfile } from "../types";

const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Revela a resposta letra a letra, como nos chats de IA. Com movimento reduzido, mostra de uma vez.
function AssistantText({ text, animate, onReveal }: { text: string; animate: boolean; onReveal: () => void }) {
  const [shown, setShown] = useState(animate ? "" : text);

  useEffect(() => {
    if (!animate) {
      setShown(text);
      return;
    }
    setShown("");
    let index = 0;
    const step = Math.min(26, Math.max(10, Math.round(1100 / text.length)));
    const timer = setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      onReveal();
      if (index >= text.length) clearInterval(timer);
    }, step);
    return () => clearInterval(timer);
  }, [text, animate, onReveal]);

  return (
    <>
      {shown}
      {animate && shown.length < text.length && <span className="typing-caret" aria-hidden="true" />}
    </>
  );
}

export function AccessPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signup, setSignup] = useState({ userName: "", companyName: "", email: "", password: "" });
  const [stage, setStage] = useState<"form" | "chat" | "result">("form");
  const [messages, setMessages] = useState<OnboardingMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState("");
  const [engine, setEngine] = useState<OnboardingTurn["engine"]>("simulado");
  const [decision, setDecision] = useState<OnboardingDecision | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [reducedMotion] = useState(prefersReducedMotion);
  const navigate = useNavigate();
  const { login, quickLogin, register } = useAuth();

  // Mantém a última mensagem à vista, tanto no scroll interno (desktop) quanto no da página (celular).
  const scrollChatToEnd = useCallback(() => chatEndRef.current?.scrollIntoView({ block: "nearest" }), []);

  useEffect(() => {
    if (stage === "chat") scrollChatToEnd();
  }, [messages, thinking, stage, scrollChatToEnd]);

  // Mostra desde o início se a conversa está com o Gemini ou em modo simulado.
  useEffect(() => {
    if (stage === "chat") void fetchOnboardingEngine().then(setEngine);
  }, [stage]);

  const profile: CompanyProfile = decision?.profile ?? "general";

  const enterDemo = (selectedProfile: CompanyProfile) => {
    quickLogin(selectedProfile);
    navigate("/", { replace: true });
  };

  const submitLogin = (event: FormEvent) => {
    event.preventDefault();
    if (!loginPassword.trim()) {
      setLoginError("Digite sua senha para continuar.");
      return;
    }
    if (!login(loginEmail)) {
      setLoginError("Conta não encontrada. Use uma conta demo ou crie uma nova.");
      return;
    }
    navigate("/", { replace: true });
  };

  const startOnboarding = (event: FormEvent) => {
    event.preventDefault();
    setMessages([{ role: "assistant", text: firstOnboardingQuestion }]);
    setQuickReplies(onboardingStarters);
    setChatError("");
    setStage("chat");
  };

  const sendAnswer = async (answer: string) => {
    const text = answer.trim();
    if (!text || thinking) return;
    const history: OnboardingMessage[] = [...messages, { role: "user", text }];
    setMessages(history);
    setDraft("");
    setQuickReplies([]);
    setChatError("");
    setThinking(true);
    try {
      const turn = await sendOnboardingMessage(history, signup.companyName);
      setEngine(turn.engine);
      setMessages([...history, { role: "assistant", text: turn.reply }]);
      setQuickReplies(turn.quickReplies);
      if (turn.done && turn.decision) {
        setDecision(turn.decision);
        // Deixa a última frase ser lida (e digitada) antes de trocar de tela.
        const pause = reducedMotion ? 500 : Math.min(2800, 1000 + turn.reply.length * 22);
        setTimeout(() => setStage("result"), pause);
      }
    } catch (caught) {
      setMessages(messages);
      setDraft(text);
      setChatError(caught instanceof Error ? caught.message : "O assistente não respondeu.");
    } finally {
      setThinking(false);
    }
  };

  const selectFile = (file?: File) => {
    if (!file) return;
    if (!isSupportedSpreadsheet(file.name) || !/\.xlsx$/i.test(file.name)) {
      setFileError("Use um arquivo .xlsx compatível com o contrato de dados.");
      setSelectedFile(null);
      return;
    }
    setFileError("");
    setSelectedFile(file);
  };

  const finishSignup = async () => {
    setCreatingAccount(true);
    setFileError("");
    try {
      const analysis = profile === "general" && selectedFile ? await analyzeSpreadsheet(selectedFile) : null;
      const created = register({
        userName: signup.userName,
        email: signup.email,
        companyName: signup.companyName,
        segment: decision?.segment ?? "Outros",
        profile,
        spreadsheet: analysis && selectedFile ? spreadsheetMetadata(selectedFile.name, analysis.source.entities, "Base inicial") : undefined,
      });
      if (analysis) saveChurnAnalysis(created.id, analysis);
      navigate(analysis || profile === "technology" ? "/" : "/dados", { replace: true });
    } catch (caught) {
      setFileError(caught instanceof Error ? caught.message : "Não foi possível analisar a planilha.");
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <main className="access-page">
      <section className="access-aside" aria-label="Apresentação da plataforma">
        <img src="/brand/globalsys-logo.svg" alt="Globalsys" />
        <div className="access-aside-copy">
          <span className="eyebrow"><Sparkle size={15} weight="fill" /> Inteligência adaptativa</span>
          <h1>Encontre a perda de valor antes que ela vire uma saída.</h1>
          <p>Uma plataforma para produtos tecnológicos e empresas que desejam transformar seus próprios dados em prioridades explicáveis.</p>
        </div>
        <div className="access-proof">
          <span><CheckCircle size={17} weight="fill" /> Tracking e dados empresariais</span>
          <span><CheckCircle size={17} weight="fill" /> Excel e CSV com contexto</span>
          <span><CheckCircle size={17} weight="fill" /> Impacto financeiro mensurável</span>
        </div>
      </section>

      <section className="access-workspace">
        <div className="access-card">
          <div className="access-tabs" role="tablist" aria-label="Acesso à plataforma">
            <button className={tab === "login" ? "access-tab access-tab--active" : "access-tab"} type="button" role="tab" aria-selected={tab === "login"} onClick={() => setTab("login")}>Entrar</button>
            <button className={tab === "signup" ? "access-tab access-tab--active" : "access-tab"} type="button" role="tab" aria-selected={tab === "signup"} onClick={() => setTab("signup")}>Criar conta</button>
          </div>

          {tab === "login" ? (
            <div className="access-content">
              <div className="access-title">
                <span>Bem-vindo</span>
                <h2>Acesse sua inteligência de carteira.</h2>
                <p>Acesse o ambiente associado à sua empresa.</p>
              </div>
              <form className="access-form" onSubmit={submitLogin}>
                <label>E-mail<input type="email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="voce@empresa.com" /></label>
                <label>Senha<input type="password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Sua senha" /></label>
                {loginError && <p className="form-error" role="alert">{loginError}</p>}
                <button className="primary-button access-submit" type="submit">Entrar <ArrowRight size={17} /></button>
              </form>

              <div className="demo-access">
                <span>Acessos rápidos</span>
                <button type="button" onClick={() => enterDemo("technology")}>
                  <span className="demo-access-icon"><Robot size={21} weight="duotone" /></span>
                  <span><strong>Nexora Sistemas</strong><small>Produto tecnológico e tracking</small></span>
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => enterDemo("general")}>
                  <span className="demo-access-icon"><FileXls size={21} weight="duotone" /></span>
                  <span><strong>Grupo Horizonte</strong><small>Análise preditiva por planilha</small></span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="access-content">
              {stage === "form" ? (
                <>
                  <div className="access-title">
                    <span>Nova organização</span>
                    <h2>Conte quem você é. A IA adapta a experiência.</h2>
                    <p>A IA faz algumas perguntas para configurar o seu ambiente. As respostas da conversa são enviadas ao Gemini; sem chave configurada, o assistente responde em modo simulado.</p>
                  </div>
                  <form className="access-form signup-form" onSubmit={startOnboarding}>
                    <label>Seu nome<input required value={signup.userName} onChange={(event) => setSignup({ ...signup, userName: event.target.value })} /></label>
                    <label>Empresa<input required value={signup.companyName} onChange={(event) => setSignup({ ...signup, companyName: event.target.value })} /></label>
                    <label>E-mail<input type="email" required value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} /></label>
                    <label>Senha<input type="password" minLength={4} required value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })} /></label>
                    <button className="primary-button access-submit" type="submit">Conversar com a IA <ArrowRight size={17} /></button>
                  </form>
                </>
              ) : stage === "chat" ? (
                <div className="onboarding-chat">
                  <div className="chat-heading">
                    <span className="demo-access-icon"><Robot size={22} weight="duotone" /></span>
                    <div><strong>Assistente de configuração</strong><small data-engine={engine}>{engine === "gemini" ? "Gemini" : "IA simulada"}</small></div>
                  </div>
                  <div className="chat-history" aria-live="polite">
                    <div className="chat-message chat-message--assistant">Olá, {signup.userName.split(" ")[0]}. Vou entender o perfil da {signup.companyName}.</div>
                    {messages.map((message, index) => (
                      <div className={message.role === "assistant" ? "chat-message chat-message--assistant" : "chat-message chat-message--user"} key={`${message.role}-${index}`}>
                        {message.role === "assistant"
                          ? <AssistantText text={message.text} animate={index === messages.length - 1 && index > 0 && !reducedMotion} onReveal={scrollChatToEnd} />
                          : message.text}
                      </div>
                    ))}
                    {thinking && <div className="chat-message chat-message--assistant chat-typing"><span /><span /><span /></div>}
                    <div ref={chatEndRef} aria-hidden="true" />
                  </div>
                  {quickReplies.length > 0 && (
                    <div className="chat-options">
                      {quickReplies.map((option) => <button type="button" key={option} disabled={thinking} onClick={() => void sendAnswer(option)}>{option}</button>)}
                    </div>
                  )}
                  {chatError && <p className="form-error" role="alert">{chatError}</p>}
                  <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendAnswer(draft); }}>
                    <label className="sr-only" htmlFor="chat-draft">Sua resposta</label>
                    <input id="chat-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva com suas palavras" disabled={thinking} autoComplete="off" />
                    <button className="primary-button" type="submit" disabled={thinking || !draft.trim()} aria-label="Enviar resposta"><ArrowRight size={17} /></button>
                  </form>
                </div>
              ) : (
                <div className="onboarding-result">
                  <span className="result-icon"><CheckCircle size={30} weight="fill" /></span>
                  <span className="eyebrow">Perfil identificado</span>
                  <h2>{profile === "technology" ? "Experiência para produto tecnológico" : "Experiência de análise preditiva"}</h2>
                  <p>{profile === "technology" ? "Seu ambiente combinará uso de funcionalidades, CRM, suporte, financeiro e planilhas." : "Seu ambiente analisará clientes a partir das colunas e tendências de uma planilha."}</p>

                  {profile === "general" && (
                    <label className={selectedFile ? "onboarding-upload onboarding-upload--ready" : "onboarding-upload"}>
                      <UploadSimple size={23} />
                      <span><strong>{selectedFile?.name || "Cadastrar planilha .xlsx"}</strong><small>{selectedFile ? "Será validada antes da criação da conta" : "Opcional agora; também disponível na área Dados"}</small></span>
                      <input className="sr-only" type="file" accept=".xlsx" onChange={(event) => selectFile(event.target.files?.[0])} />
                    </label>
                  )}
                  {fileError && <p className="form-error" role="alert">{fileError}</p>}

                  {decision?.rationale && <p className="result-rationale"><Robot size={16} weight="duotone" /> {decision.rationale}</p>}
                  <div className="result-summary">
                    <span><Buildings size={17} /> {signup.companyName}</span>
                    <span><CheckCircle size={17} /> {decision?.segment ?? (profile === "technology" ? "Tecnologia" : "Análise por dados")}</span>
                    {decision?.goal && <span><Sparkle size={17} /> {decision.goal}</span>}
                    {decision?.dataSource && <span><FileXls size={17} /> {decision.dataSource}</span>}
                  </div>
                  <button className="primary-button access-submit" type="button" disabled={creatingAccount} onClick={() => void finishSignup()}>{creatingAccount ? "Validando dados..." : "Criar ambiente"} <ArrowRight size={17} /></button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
