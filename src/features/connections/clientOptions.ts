import { getCompany, portfolioProducts } from "../../data/mockData";

export interface ConnectionClientOption {
  id: string;
  name: string;
  companyName: string;
  displayName: string;
}

export const connectionClientOptions: ConnectionClientOption[] = portfolioProducts.map((client) => {
  const company = getCompany(client.companyId);
  const companyName = company?.name ?? client.companyId;
  return {
    id: client.id,
    name: client.productName,
    companyName,
    displayName: `${client.productName} · ${companyName}`,
  };
});
