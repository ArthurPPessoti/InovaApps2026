export type IntegrationStatus = "waiting_integration" | "connected";

export interface MonitoredFeature {
  id: string;
  name: string;
  eventName: string;
  createdAt: string;
}

export interface ConnectedApplication {
  id: string;
  clientId: string | null;
  client: string | null;
  status: IntegrationStatus;
  createdAt: string;
  features: MonitoredFeature[];
  featureCount: number;
  eventCount: number;
  lastEventAt: string | null;
  credential?: string;
}

export interface IntegrationEvent {
  id: string;
  applicationId: string;
  event: string;
  userId: string | null;
  receivedAt: string;
}

export interface ExistingProductApplicationInput {
  clientId: string;
  client: string;
  productName: string;
}

export interface NewProductApplicationInput {
  newProduct: {
    name: string;
    company:
      | { mode: "existing"; id: string; name: string }
      | { mode: "new"; name: string };
  };
}

export type NewApplicationInput = ExistingProductApplicationInput | NewProductApplicationInput;

export interface LinkApplicationClientInput {
  clientId: string;
  client: string;
}

export interface NewFeatureInput {
  name: string;
  eventName: string;
}
