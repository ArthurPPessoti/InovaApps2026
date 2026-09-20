import type { ChurnPrediction } from "../../churn/types";
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

export function buildGlobalSysConnectionOptions(predictions: ChurnPrediction[]): ConnectionClientOption[] {
  return predictions
    .map((prediction) => ({
      id: prediction.subjectId,
      companyId: prediction.subjectId,
      name: `Plano ${prediction.plan}`,
      companyName: `Cliente ${prediction.subjectId}`,
      displayName: `Plano ${prediction.plan} · Cliente ${prediction.subjectId}`,
    }))
    .sort((left, right) => left.id.localeCompare(right.id, "pt-BR", { numeric: true }));
}
