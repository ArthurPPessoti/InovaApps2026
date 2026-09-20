import type { PortfolioProductRecord } from "../portfolio/PortfolioContext";

export interface ConnectionClientOption {
  id: string;
  companyId: string;
  name: string;
  companyName: string;
  displayName: string;
}

export function buildConnectionClientOptions(products: PortfolioProductRecord[]): ConnectionClientOption[] {
  return products.map((product) => ({
    id: product.id,
    companyId: product.companyId,
    name: product.productName,
    companyName: product.companyName,
    displayName: `${product.productName} · ${product.companyName}`,
  }));
}
