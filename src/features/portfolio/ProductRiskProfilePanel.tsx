import { CheckCircle, FloppyDisk, Info, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { type FormEvent, useEffect, useState } from "react";
import { RiskBadge, formatCurrency } from "../../components/StatusUI";
import { type PortfolioProductRecord, usePortfolio } from "./PortfolioContext";
import { saveProductRiskProfile } from "./productRisk";
import "./product-risk.css";

interface RiskFormState {
  segment: string;
  plan: string;
  monthlyRevenue: string;
  slaPercent: string;
  nps: string;
  openTickets: string;
  criticalTickets: string;
  paymentDelayDays: string;
}

function formStateFor(product: PortfolioProductRecord): RiskFormState {
  const profile = product.riskProfile;
  return {
    segment: profile?.segment ?? "",
    plan: profile?.plan ?? "",
    monthlyRevenue: profile ? String(profile.monthlyRevenue) : "",
    slaPercent: profile ? String(profile.slaPercent) : "",
    nps: profile ? String(profile.nps) : "",
    openTickets: profile ? String(profile.openTickets) : "",
    criticalTickets: profile ? String(profile.criticalTickets) : "",
    paymentDelayDays: profile ? String(profile.paymentDelayDays) : "",
  };
}

export function ProductRiskProfilePanel({ product }: { product: PortfolioProductRecord }) {
  const { refresh } = usePortfolio();
  const [form, setForm] = useState(() => formStateFor(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const profile = product.riskProfile;

  useEffect(() => {
    setForm(formStateFor(product));
  }, [product.id, product.riskProfile]);

  const setField = (field: keyof RiskFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await saveProductRiskProfile(product.id, {
        segment: form.segment,
        plan: form.plan,
        monthlyRevenue: Number(form.monthlyRevenue),
        slaPercent: Number(form.slaPercent),
        nps: Number(form.nps),
        openTickets: Number(form.openTickets),
        criticalTickets: Number(form.criticalTickets),
        paymentDelayDays: Number(form.paymentDelayDays),
      });
      await refresh();
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar os dados do produto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel product-risk-panel">
      <div className="panel-heading product-risk-panel__heading">
        <div>
          <span>Classificação do produto</span>
          <h2>Dados comerciais e operacionais</h2>
          <p>O score usa somente os campos abaixo. Eventos do Product Analytics não entram neste cálculo.</p>
        </div>
        {profile && <RiskBadge level={profile.riskLevel} score={profile.riskScore} />}
      </div>

      {profile ? (
        <div className="product-risk-summary">
          <article><small>Plano e segmento</small><strong>{profile.plan}</strong><span>{profile.segment}</span></article>
          <article><small>Receita mensal</small><strong>{formatCurrency(profile.monthlyRevenue)}</strong><span>Informada no cadastro</span></article>
          <article><small>SLA / NPS</small><strong>{profile.slaPercent}% / {profile.nps}</strong><span>Indicadores explícitos</span></article>
          <article><small>Principal evidência</small><strong>{profile.primarySignal}</strong><span>Regra operacional v1</span></article>
        </div>
      ) : (
        <div className="product-risk-empty">
          <Info size={22} weight="duotone" />
          <div><strong>Ainda não há dados suficientes para classificar este produto.</strong><p>Preencha todos os campos para gerar a primeira classificação. Até lá, ele continuará aparecendo como “Sem dados”.</p></div>
        </div>
      )}

      {profile?.source === "demo" && (
        <div className="product-risk-demo-note">
          <ShieldCheck size={19} weight="duotone" />
          <div><strong>Dados demonstrativos do NexStock</strong><span>Este perfil acompanha o projeto para que qualquer pessoa visualize a experiência completa. Ao salvar, os valores passam a ser tratados como cadastro manual.</span></div>
        </div>
      )}

      <details className="product-risk-editor" open={!profile}>
        <summary>{profile ? "Editar dados usados na classificação" : "Cadastrar dados para classificar"}</summary>
        <form onSubmit={submit}>
          <label><span>Segmento</span><input required maxLength={80} value={form.segment} onChange={(event) => setField("segment", event.target.value)} placeholder="Ex.: Distribuição" /></label>
          <label><span>Plano</span><input required maxLength={80} value={form.plan} onChange={(event) => setField("plan", event.target.value)} placeholder="Ex.: Enterprise" /></label>
          <label><span>Receita mensal (R$)</span><input required type="number" min="0.01" max="1000000000" step="0.01" value={form.monthlyRevenue} onChange={(event) => setField("monthlyRevenue", event.target.value)} /></label>
          <label><span>SLA cumprido (%)</span><input required type="number" min="0" max="100" step="0.1" value={form.slaPercent} onChange={(event) => setField("slaPercent", event.target.value)} /></label>
          <label><span>NPS (0 a 10)</span><input required type="number" min="0" max="10" step="0.1" value={form.nps} onChange={(event) => setField("nps", event.target.value)} /></label>
          <label><span>Chamados abertos</span><input required type="number" min="0" step="1" value={form.openTickets} onChange={(event) => setField("openTickets", event.target.value)} /></label>
          <label><span>Chamados críticos</span><input required type="number" min="0" step="1" value={form.criticalTickets} onChange={(event) => setField("criticalTickets", event.target.value)} /></label>
          <label><span>Dias de atraso</span><input required type="number" min="0" max="3650" step="1" value={form.paymentDelayDays} onChange={(event) => setField("paymentDelayDays", event.target.value)} /></label>
          <div className="product-risk-editor__footer">
            <p><Info size={16} /> Pesos: SLA 35%, NPS 25%, chamados 25% e atraso 15%. Receita, plano e segmento dão contexto, mas não aumentam o risco.</p>
            <button className="primary-button" type="submit" disabled={saving}><FloppyDisk size={17} /> {saving ? "Salvando..." : "Salvar e classificar"}</button>
          </div>
          {error && <div className="product-risk-feedback product-risk-feedback--error" role="alert"><WarningCircle size={17} /> {error}</div>}
          {saved && <div className="product-risk-feedback product-risk-feedback--success" role="status"><CheckCircle size={17} /> Dados salvos e classificação atualizada.</div>}
        </form>
      </details>
    </section>
  );
}
