import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { initialRetentionCases } from "../data/managementData";
import type { RetentionCase } from "../types";

const STORAGE_KEY = "inovaapps.mock.management.v1";

interface ManagementContextValue {
  cases: RetentionCase[];
  addCase: (item: Omit<RetentionCase, "id" | "createdAt" | "dataSource">) => void;
  updateCase: (id: string, changes: Partial<Omit<RetentionCase, "id" | "productId" | "createdAt" | "dataSource">>) => void;
}

const ManagementContext = createContext<ManagementContextValue | null>(null);

function readCases() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed as RetentionCase[] : initialRetentionCases;
  } catch {
    return initialRetentionCases;
  }
}

export function ManagementProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<RetentionCase[]>(readCases);

  const persist = (next: RetentionCase[]) => {
    setCases(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value = useMemo<ManagementContextValue>(() => ({
    cases,
    addCase(item) {
      persist([...cases, {
        ...item,
        id: `case-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
        dataSource: "mock",
      }]);
    },
    updateCase(id, changes) {
      persist(cases.map((item) => item.id === id ? { ...item, ...changes } : item));
    },
  }), [cases]);

  return <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>;
}

export function useManagement() {
  const value = useContext(ManagementContext);
  if (!value) throw new Error("useManagement deve ser usado dentro de ManagementProvider");
  return value;
}
