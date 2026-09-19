import { useSyncExternalStore } from "react";

export interface ClientFormInput {
  companyName: string;
  segment: string;
  owner: string;
  productName: string;
  plan: string;
  monthlyRevenue: string;
  criticality: string;
  startDate: string;
  renewalDate: string;
  contactName: string;
  contactEmail: string;
  consentSource: string;
  externalId: string;
}

export type ClientFormErrors = Partial<Record<keyof ClientFormInput, string>>;

export interface RegisteredClient {
  id: string;
  companyName: string;
  segment: string;
  owner: string;
  productName: string;
  plan: string;
  monthlyRevenue: number;
  criticality: number;
  startDate: string;
  renewalDate: string;
  contactName: string;
  contactEmail: string;
  consentSource: string;
  externalId: string;
  createdAt: string;
}

export const emptyClientForm: ClientFormInput = {
  companyName: "",
  segment: "",
  owner: "",
  productName: "",
  plan: "",
  monthlyRevenue: "",
  criticality: "3",
  startDate: "",
  renewalDate: "",
  contactName: "",
  contactEmail: "",
  consentSource: "",
  externalId: "",
};

const requiredFields: Array<keyof ClientFormInput> = [
  "companyName",
  "segment",
  "owner",
  "productName",
  "plan",
  "monthlyRevenue",
  "startDate",
  "renewalDate",
  "contactName",
  "contactEmail",
  "consentSource",
];

export function validateClient(input: ClientFormInput, { requireExternalId }: { requireExternalId: boolean }): ClientFormErrors {
  const errors: ClientFormErrors = {};
  for (const field of requiredFields) {
    if (!input[field].trim()) errors[field] = "Campo obrigatório.";
  }

  if (input.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) {
    errors.contactEmail = "Informe um e-mail válido.";
  }

  const revenue = Number(input.monthlyRevenue.replace(",", "."));
  if (input.monthlyRevenue.trim() && !(revenue > 0)) {
    errors.monthlyRevenue = "Informe um valor maior que zero.";
  }

  const criticality = Number(input.criticality);
  if (!Number.isInteger(criticality) || criticality < 1 || criticality > 5) {
    errors.criticality = "Escolha uma criticidade de 1 a 5.";
  }

  // Datas ISO (aaaa-mm-dd) comparam corretamente como texto.
  if (input.startDate && input.renewalDate && input.renewalDate <= input.startDate) {
    errors.renewalDate = "A renovação precisa ser depois do início.";
  }

  const externalId = input.externalId.trim();
  if (!externalId && requireExternalId) {
    errors.externalId = "Obrigatório para ligar os eventos do tracking a este cliente.";
  } else if (externalId && !/^[A-Za-z0-9_-]+$/.test(externalId)) {
    errors.externalId = "Use apenas letras, números, hífen e sublinhado.";
  }

  return errors;
}

const normalizeName = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();

export function findDuplicate(name: string, existingNames: string[]) {
  const target = normalizeName(name);
  if (!target) return undefined;
  return existingNames.find((existing) => normalizeName(existing) === target);
}

let registered: RegisteredClient[] = [];
const listeners = new Set<() => void>();

export function subscribeRegisteredClients(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ponytail: memória da sessão (some ao recarregar); trocar pelo insert no Supabase quando o backend existir, as telas não mudam.
export async function saveClient(input: ClientFormInput): Promise<RegisteredClient> {
  const client: RegisteredClient = {
    id: crypto.randomUUID(),
    companyName: input.companyName.trim(),
    segment: input.segment,
    owner: input.owner.trim(),
    productName: input.productName.trim(),
    plan: input.plan,
    monthlyRevenue: Number(input.monthlyRevenue.replace(",", ".")),
    criticality: Number(input.criticality),
    startDate: input.startDate,
    renewalDate: input.renewalDate,
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail.trim(),
    consentSource: input.consentSource,
    externalId: input.externalId.trim(),
    createdAt: new Date().toISOString(),
  };
  registered = [client, ...registered];
  listeners.forEach((listener) => listener());
  return client;
}

export function getRegisteredClients() {
  return registered;
}

export function useRegisteredClients() {
  return useSyncExternalStore(subscribeRegisteredClients, getRegisteredClients);
}
