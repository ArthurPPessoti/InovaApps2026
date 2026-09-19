import {
  ArrowRight,
  Buildings,
  CheckCircle,
  FileXls,
  Robot,
  Sparkle,
  UploadSimple,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSupportedSpreadsheet, spreadsheetMetadata, useAuth } from "../auth/AuthContext";
import type { CompanyProfile } from "../types";

const questions = [
  {
    id: "segment",
    text: "Em qual segmento sua empresa atua?",
    options: ["Tecnologia", "Serviços", "Educação", "Indústria"],
  },
  {
    id: "offer",
    text: "O que sua empresa oferece principalmente?",
    options: ["Software ou plataforma", "Serviços recorrentes", "Produtos e operação", "Outro modelo"],
  },
  {
    id: "hasTechnology",
    text: "Vocês possuem uma solução tecnológica própria utilizada pelos clientes?",
    options: ["Sim, acompanhamos o uso do produto", "Não, queremos analisar nossos dados"],
  },
  {
    id: "objective",
    text: "Qual resultado é mais importante agora?",
    options: ["Antecipar cancelamentos", "Priorizar clientes", "Entender perda de valor", "Analisar uma carteira"],
  },
  {
    id: "source",
    text: "Qual fonte de dados está disponível primeiro?",
    options: ["Eventos do produto", "CRM e atendimento", "Financeiro", "Excel ou CSV"],
  },
] as const;

type AnswerMap = Partial<Record<(typeof questions)[number]["id"], string>>;

export function AccessPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signup, setSignup] = useState({ userName: "", companyName: "", email: "", password: "" });
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const navigate = useNavigate();
  const { login, quickLogin, register } = useAuth();

  const profile: CompanyProfile = answers.hasTechnology?.startsWith("Sim") ? "technology" : "general";
  const onboardingComplete = questionIndex >= questions.length;

  const enterDemo = (selectedProfile: CompanyProfile) => {
    quickLogin(selectedProfile);
    navigate("/", { replace: true });
  };

  const submitLogin = (event: FormEvent) => {
    event.preventDefault();
    if (!loginPassword.trim()) {
      setLoginError("Digite uma senha demonstrativa.");
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
    setQuestionIndex(0);
  };

  const answerQuestion = (answer: string) => {
    const question = questions[questionIndex];
    setAnswers((current) => ({ ...current, [question.id]: answer }));
    setQuestionIndex((current) => current + 1);
  };

  const selectFile = (file?: File) => {
    if (!file) return;
    if (!isSupportedSpreadsheet(file.name)) {
      setFileError("Use um arquivo .xlsx, .xls ou .csv.");
      setFileName("");
      return;
    }
    setFileError("");
    setFileName(file.name);
  };

  const finishSignup = () => {
    register({
      userName: signup.userName,
      email: signup.email,
      companyName: signup.companyName,
      segment: answers.segment ?? "Outros",
      profile,
      spreadsheet: profile === "general" && fileName ? spreadsheetMetadata(fileName) : undefined,
    });
    navigate("/", { replace: true });
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
          <span><CheckCircle size={17} weight="fill" /> Impacto financeiro demonstrativo</span>
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
                <p>Este ambiente usa autenticação demonstrativa e não envia credenciais.</p>
              </div>
              <form className="access-form" onSubmit={submitLogin}>
                <label>E-mail<input type="email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="voce@empresa.com" /></label>
                <label>Senha<input type="password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Senha demonstrativa" /></label>
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
              {questionIndex < 0 ? (
                <>
                  <div className="access-title">
                    <span>Nova organização</span>
                    <h2>Conte quem você é. A IA adapta a experiência.</h2>
                    <p>A conversa é simulada e nenhuma informação sai do navegador.</p>
                  </div>
                  <form className="access-form signup-form" onSubmit={startOnboarding}>
                    <label>Seu nome<input required value={signup.userName} onChange={(event) => setSignup({ ...signup, userName: event.target.value })} /></label>
                    <label>Empresa<input required value={signup.companyName} onChange={(event) => setSignup({ ...signup, companyName: event.target.value })} /></label>
                    <label>E-mail<input type="email" required value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} /></label>
                    <label>Senha demonstrativa<input type="password" minLength={4} required value={signup.password} onChange={(event) => setSignup({ ...signup, password: event.target.value })} /></label>
                    <button className="primary-button access-submit" type="submit">Conversar com a IA <ArrowRight size={17} /></button>
                  </form>
                </>
              ) : !onboardingComplete ? (
                <div className="onboarding-chat">
                  <div className="chat-heading">
                    <span className="demo-access-icon"><Robot size={22} weight="duotone" /></span>
                    <div><strong>Assistente de configuração</strong><small>IA simulada</small></div>
                  </div>
                  <div className="chat-history" aria-live="polite">
                    <div className="chat-message chat-message--assistant">Olá, {signup.userName.split(" ")[0]}. Vou entender o perfil da {signup.companyName}.</div>
                    {questions.slice(0, questionIndex).map((question) => (
                      <div className="chat-exchange" key={question.id}>
                        <div className="chat-message chat-message--assistant">{question.text}</div>
                        <div className="chat-message chat-message--user">{answers[question.id]}</div>
                      </div>
                    ))}
                    <div className="chat-message chat-message--assistant">{questions[questionIndex].text}</div>
                  </div>
                  <div className="chat-options">
                    {questions[questionIndex].options.map((option) => <button type="button" key={option} onClick={() => answerQuestion(option)}>{option}</button>)}
                  </div>
                  <span className="chat-progress">Pergunta {questionIndex + 1} de {questions.length}</span>
                </div>
              ) : (
                <div className="onboarding-result">
                  <span className="result-icon"><CheckCircle size={30} weight="fill" /></span>
                  <span className="eyebrow">Perfil identificado</span>
                  <h2>{profile === "technology" ? "Experiência para produto tecnológico" : "Experiência de análise preditiva"}</h2>
                  <p>{profile === "technology" ? "Seu ambiente combinará uso de funcionalidades, CRM, suporte, financeiro e planilhas." : "Seu ambiente analisará clientes a partir das colunas e tendências de uma planilha."}</p>

                  {profile === "general" && (
                    <label className={fileName ? "onboarding-upload onboarding-upload--ready" : "onboarding-upload"}>
                      <UploadSimple size={23} />
                      <span><strong>{fileName || "Adicionar Excel ou CSV"}</strong><small>{fileName ? "Arquivo pronto para a demonstração" : "Você também poderá fazer isso depois"}</small></span>
                      <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => selectFile(event.target.files?.[0])} />
                    </label>
                  )}
                  {fileError && <p className="form-error" role="alert">{fileError}</p>}

                  <div className="result-summary">
                    <span><Buildings size={17} /> {signup.companyName}</span>
                    <span><CheckCircle size={17} /> {profile === "technology" ? "Tecnologia" : "Análise por dados"}</span>
                  </div>
                  <button className="primary-button access-submit" type="button" onClick={finishSignup}>Criar ambiente <ArrowRight size={17} /></button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
