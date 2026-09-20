import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import type { CompanyProfile, MockAccount, SpreadsheetMetadata } from "../types";

const SESSION_KEY = "inovaapps.mock.session.v1";
const ACCOUNTS_KEY = "inovaapps.mock.accounts.v1";

const demoAccounts: MockAccount[] = [
  {
    id: "demo-technology",
    userName: "Marina Costa",
    email: "tecnologia@demo.com",
    companyName: "Nexora Sistemas",
    segment: "Tecnologia",
    profile: "technology",
    onboardingComplete: true,
    spreadsheet: {
      fileName: "INOVAAPPS_base_de_dados.xlsx",
      importedAt: "19/09/2026 às 09:42",
      rows: 80,
      sourceName: "Carteira real · conexões demonstrativas",
      objective: "churn-90",
    },
  },
  {
    id: "demo-general",
    userName: "Rafael Lima",
    email: "dados@demo.com",
    companyName: "Grupo Horizonte",
    segment: "Serviços",
    profile: "general",
    onboardingComplete: true,
    spreadsheet: {
      fileName: "INOVAAPPS_base_de_dados.xlsx",
      importedAt: "19/09/2026 às 09:42",
      rows: 80,
      sourceName: "Base INOVAAPPS 2026",
      objective: "churn-90",
    },
  },
];

interface RegisterAccountInput {
  userName: string;
  email: string;
  companyName: string;
  segment: string;
  profile: CompanyProfile;
  spreadsheet?: SpreadsheetMetadata;
}

interface AuthContextValue {
  account: MockAccount | null;
  accounts: MockAccount[];
  login: (email: string) => boolean;
  quickLogin: (profile: CompanyProfile) => void;
  register: (input: RegisterAccountInput) => MockAccount;
  updateSpreadsheet: (fileName: string, rows?: number, sourceName?: string, mapping?: SpreadsheetMetadata["mapping"]) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAccounts() {
  try {
    const stored = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as MockAccount[];
    return [...demoAccounts, ...stored.filter((account) => !account.id.startsWith("demo-"))];
  } catch {
    return demoAccounts;
  }
}

export function isSupportedSpreadsheet(fileName: string) {
  return /\.(xlsx|xls|csv)$/i.test(fileName);
}

export function spreadsheetMetadata(fileName: string, rows = 80, sourceName = "Base de clientes", mapping?: SpreadsheetMetadata["mapping"]): SpreadsheetMetadata {
  return {
    fileName,
    importedAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
    rows,
    sourceName,
    objective: "churn-90",
    mapping,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<MockAccount[]>(readStoredAccounts);
  const [account, setAccount] = useState<MockAccount | null>(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    return readStoredAccounts().find((item) => item.id === sessionId) ?? null;
  });

  const persistAccounts = (next: MockAccount[]) => {
    setAccounts(next);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next.filter((item) => !item.id.startsWith("demo-"))));
  };

  const startSession = (next: MockAccount) => {
    setAccount(next);
    localStorage.setItem(SESSION_KEY, next.id);
  };

  const value = useMemo<AuthContextValue>(() => ({
    account,
    accounts,
    login(email) {
      const found = accounts.find((item) => item.email.toLocaleLowerCase("pt-BR") === email.trim().toLocaleLowerCase("pt-BR"));
      if (!found) return false;
      startSession(found);
      return true;
    },
    quickLogin(profile) {
      startSession(demoAccounts.find((item) => item.profile === profile)!);
    },
    register(input) {
      const next: MockAccount = {
        ...input,
        id: crypto.randomUUID(),
        email: input.email.trim().toLocaleLowerCase("pt-BR"),
        onboardingComplete: true,
      };
      const updated = [...accounts.filter((item) => item.email !== next.email), next];
      persistAccounts(updated);
      startSession(next);
      return next;
    },
    updateSpreadsheet(fileName, rows, sourceName, mapping) {
      if (!account || !isSupportedSpreadsheet(fileName)) return;
      const updatedAccount = { ...account, spreadsheet: spreadsheetMetadata(fileName, rows, sourceName, mapping) };
      const updated = accounts.map((item) => item.id === updatedAccount.id ? updatedAccount : item);
      persistAccounts(updated);
      startSession(updatedAccount);
    },
    logout() {
      localStorage.removeItem(SESSION_KEY);
      setAccount(null);
    },
  }), [account, accounts]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return value;
}
