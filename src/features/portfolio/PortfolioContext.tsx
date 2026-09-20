import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { allProducts, companies, portfolioProducts } from "../../data/mockData";
import type { CompanyMock, ProductContractMock } from "../../types";
import {
  productTelemetryFor,
  type ProductTelemetrySummary,
} from "./productTelemetry";
import type { ProductRiskProfile } from "./productRisk";

export interface PersistedPortfolioCompany {
  id: string;
  name: string;
  createdAt: string;
}

export interface PersistedPortfolioProduct {
  id: string;
  companyId: string;
  companyName: string;
  productName: string;
  createdAt: string;
}

export interface PortfolioCompanyRecord {
  id: string;
  name: string;
  source: "mock" | "persisted";
  mockData: CompanyMock | null;
}

export interface PortfolioProductRecord {
  id: string;
  companyId: string;
  companyName: string;
  productName: string;
  source: "mock" | "persisted";
  mockData: ProductContractMock | null;
  createdAt: string | null;
  telemetry: ProductTelemetrySummary;
  riskProfile: ProductRiskProfile | null;
}

interface PortfolioCatalog {
  companies: PortfolioCompanyRecord[];
  products: PortfolioProductRecord[];
  clientProducts: PortfolioProductRecord[];
  persistedProducts: PortfolioProductRecord[];
}

interface PortfolioContextValue extends PortfolioCatalog {
  loading: boolean;
  error: string;
  refresh: () => Promise<PortfolioCatalog>;
  getCompany: (companyId: string) => PortfolioCompanyRecord | undefined;
  getProduct: (productId: string) => PortfolioProductRecord | undefined;
}

interface PersistedPortfolioResponse {
  companies: PersistedPortfolioCompany[];
  products: PersistedPortfolioProduct[];
  telemetryByProduct?: Record<string, ProductTelemetrySummary>;
  riskByProduct?: Record<string, ProductRiskProfile>;
}

const mockClientProductIds = new Set(portfolioProducts.map((product) => product.id));

export function normalizePortfolioName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function mergePortfolio(response: PersistedPortfolioResponse): PortfolioCatalog {
  const telemetryFor = (productId: string) => productTelemetryFor(response.telemetryByProduct, productId);
  const riskFor = (productId: string) => response.riskByProduct?.[productId] ?? null;
  const companyRecords: PortfolioCompanyRecord[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    source: "mock",
    mockData: company,
  }));
  const companyIds = new Set(companyRecords.map((company) => company.id));
  response.companies.forEach((company) => {
    if (companyIds.has(company.id)) return;
    companyIds.add(company.id);
    companyRecords.push({
      id: company.id,
      name: company.name,
      source: "persisted",
      mockData: null,
    });
  });

  const companyNames = new Map(companyRecords.map((company) => [company.id, company.name]));
  const productRecords: PortfolioProductRecord[] = allProducts.map((product) => ({
    id: product.id,
    companyId: product.companyId,
    companyName: companyNames.get(product.companyId) ?? product.companyId,
    productName: product.productName,
    source: "mock",
    mockData: product,
    createdAt: null,
    telemetry: telemetryFor(product.id),
    riskProfile: null,
  }));
  const productIds = new Set(productRecords.map((product) => product.id));
  response.products.forEach((product) => {
    if (productIds.has(product.id)) return;
    productIds.add(product.id);
    productRecords.push({
      ...product,
      source: "persisted",
      mockData: null,
      telemetry: telemetryFor(product.id),
      riskProfile: riskFor(product.id),
    });
  });

  const persistedProducts = productRecords.filter((product) => product.source === "persisted");
  return {
    companies: companyRecords,
    products: productRecords,
    clientProducts: productRecords.filter((product) => product.source === "persisted" || mockClientProductIds.has(product.id)),
    persistedProducts,
  };
}

const initialCatalog = mergePortfolio({ companies: [], products: [], telemetryByProduct: {}, riskByProduct: {} });
const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/portfolio", { headers: { Accept: "application/json" } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar a carteira persistida.");
    const nextCatalog = mergePortfolio(body as PersistedPortfolioResponse);
    setCatalog(nextCatalog);
    setError("");
    return nextCatalog;
  }, []);

  useEffect(() => {
    void refresh()
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a carteira persistida.");
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<PortfolioContextValue>(() => ({
    ...catalog,
    loading,
    error,
    refresh,
    getCompany: (companyId) => catalog.companies.find((company) => company.id === companyId),
    getProduct: (productId) => catalog.products.find((product) => product.id === productId),
  }), [catalog, error, loading, refresh]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error("usePortfolio precisa estar dentro de PortfolioProvider");
  return value;
}
