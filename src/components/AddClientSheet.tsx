import { WarningCircle, X } from "@phosphor-icons/react";
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import {
  type ClientFormErrors,
  type ClientFormInput,
  type RegisteredClient,
  emptyClientForm,
  findDuplicate,
  saveClient,
  validateClient,
} from "../data/clientRegistry";

const plans = ["Essencial", "Avançado", "Enterprise"];
const criticalityLabels = ["1 · Baixa", "2 · Moderada", "3 · Relevante", "4 · Alta", "5 · Crítica"];
const consentSources = ["Contrato assinado", "Formulário de cadastro", "Solicitação do cliente"];
const fieldOrder = Object.keys(emptyClientForm) as Array<keyof ClientFormInput>;

interface AddClientSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (client: RegisteredClient) => void;
  segments: string[];
  existingNames: string[];
  requireExternalId: boolean;
}

function Field({ id, label, error, hint, wide, children }: { id: string; label: string; error?: string; hint?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sheet-field sheet-field--wide" : "sheet-field"}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint}
    </div>
  );
}

export function AddClientSheet({ open, onClose, onSaved, segments, existingNames, requireExternalId }: AddClientSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<ClientFormInput>(emptyClientForm);
  const [errors, setErrors] = useState<ClientFormErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setForm(emptyClientForm);
      setErrors({});
      setFormError("");
      dialog.showModal();
      formRef.current?.querySelector<HTMLElement>('[name="companyName"]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const duplicate = findDuplicate(form.companyName, existingNames);

  const control = (name: keyof ClientFormInput) => ({
    id: `client-${name}`,
    name,
    value: form[name],
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `client-${name}-error` : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [name]: event.target.value }));
      if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateClient(form, { requireExternalId });
    setErrors(nextErrors);
    const firstInvalid = fieldOrder.find((field) => nextErrors[field]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      onSaved(await saveClient(form));
    } catch {
      setFormError("Não foi possível salvar o cliente. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="client-sheet" aria-labelledby="client-sheet-title" onClose={onClose}>
      <form ref={formRef} className="client-sheet__form" noValidate onSubmit={submit}>
        <header className="client-sheet__header">
          <div>
            <h2 id="client-sheet-title">Adicionar cliente</h2>
            <p>Cadastre a empresa e o primeiro produto contratado.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="client-sheet__body">
          <fieldset>
            <legend>Empresa</legend>
            <Field id="client-companyName" label="Nome da empresa" error={errors.companyName} wide
              hint={duplicate && <p className="field-warning"><WarningCircle size={14} weight="fill" /> Já existe “{duplicate}” na carteira. Confira antes de salvar.</p>}>
              <input {...control("companyName")} autoComplete="organization" />
            </Field>
            <Field id="client-segment" label="Segmento" error={errors.segment}>
              <select {...control("segment")}>
                <option value="">Selecione</option>
                {segments.map((segment) => <option key={segment}>{segment}</option>)}
              </select>
            </Field>
            <Field id="client-owner" label="Responsável interno" error={errors.owner}>
              <input {...control("owner")} placeholder="Quem acompanha a conta" />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Contrato</legend>
            <Field id="client-productName" label="Produto contratado" error={errors.productName}>
              <input {...control("productName")} />
            </Field>
            <Field id="client-plan" label="Plano" error={errors.plan}>
              <select {...control("plan")}>
                <option value="">Selecione</option>
                {plans.map((plan) => <option key={plan}>{plan}</option>)}
              </select>
            </Field>
            <Field id="client-monthlyRevenue" label="Valor mensal (R$)" error={errors.monthlyRevenue}>
              <input {...control("monthlyRevenue")} inputMode="decimal" placeholder="12500" />
            </Field>
            <Field id="client-criticality" label="Criticidade estratégica" error={errors.criticality}>
              <select {...control("criticality")}>
                {criticalityLabels.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
              </select>
            </Field>
            <Field id="client-startDate" label="Início do contrato" error={errors.startDate}>
              <input {...control("startDate")} type="date" />
            </Field>
            <Field id="client-renewalDate" label="Renovação" error={errors.renewalDate}>
              <input {...control("renewalDate")} type="date" />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Contato para pesquisas</legend>
            <Field id="client-contactName" label="Nome do contato" error={errors.contactName}>
              <input {...control("contactName")} autoComplete="name" />
            </Field>
            <Field id="client-contactEmail" label="E-mail" error={errors.contactEmail}>
              <input {...control("contactEmail")} type="email" autoComplete="email" />
            </Field>
            <Field id="client-consentSource" label="Origem do consentimento (LGPD)" error={errors.consentSource} wide>
              <select {...control("consentSource")}>
                <option value="">Selecione</option>
                {consentSources.map((source) => <option key={source}>{source}</option>)}
              </select>
            </Field>
          </fieldset>

          <fieldset>
            <legend>Integração</legend>
            <Field id="client-externalId" label={requireExternalId ? "ID externo do cliente" : "Código do cliente na planilha (opcional)"} error={errors.externalId} wide
              hint={<p className="field-hint">{requireExternalId ? "O mesmo identificador que o seu produto envia junto com os eventos de uso." : "Ajuda a ligar este cadastro às próximas planilhas importadas."}</p>}>
              <input {...control("externalId")} placeholder="ex.: cliente-1042" spellCheck={false} />
            </Field>
          </fieldset>
        </div>

        <footer className="client-sheet__footer">
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <p className="client-sheet__notice">Ambiente demonstrativo: o cadastro não é salvo permanentemente.</p>
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando…" : "Salvar cliente"}</button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
