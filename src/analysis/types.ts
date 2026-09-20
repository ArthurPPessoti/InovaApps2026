export type SemanticRole =
  | "ENTITY_ID" | "TIME" | "TARGET" | "METRIC" | "CONTEXT"
  | "BUSINESS_VALUE" | "STATUS_FILTER" | "OWNER" | "CONTACT" | "IGNORE";

export type PhysicalType = "number" | "date" | "boolean" | "category" | "text";
export type MetricRiskType = "HIGH_IS_RISK" | "LOW_IS_RISK" | "TARGET_RANGE" | "BINARY_RISK" | "CATEGORICAL_RISK" | "TREND_RISK" | "INFORMATIONAL";
export type Aggregation = "FIRST" | "LATEST" | "MEAN" | "RECENT_MEAN" | "SUM" | "MIN" | "MAX" | "TREND";
export type ImportanceLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AnalysisMethod = "weighted_score" | "calibrated_probability" | "discrete_time_probability";

export interface ColumnProfile {
  name: string;
  physicalType: PhysicalType;
  semanticRole: SemanticRole;
  semanticMeaning: string;
  missingRate: number;
  uniqueCount: number;
  uniqueRate: number;
  variability: number;
  examples: unknown[];
  confidence: number;
  possiblePersonalData: boolean;
  statistics?: { min?: number; max?: number; mean?: number; median?: number };
}

export interface SheetProfile {
  name: string;
  rows: number;
  columns: ColumnProfile[];
  candidateKeys: string[];
}

export interface RelationshipCandidate {
  leftSheet: string;
  leftColumn: string;
  rightSheet: string;
  rightColumn: string;
  overlap: number;
  uniqueness: number;
  confidence: number;
}

export interface DataCapability {
  time: boolean;
  businessValue: boolean;
  segment: boolean;
  target: boolean;
  history: boolean;
  owner: boolean;
  contact: boolean;
  location: boolean;
  telemetry: boolean;
}

export interface ObjectiveSuggestion {
  id: string;
  label: string;
  behavior: string;
  eventPolarity: "positive" | "negative";
  targetColumn?: string;
  horizonDays: number;
  rationale: string;
}

export interface WorkbookProfile {
  fileName: string;
  format: "xlsx" | "csv";
  sheets: SheetProfile[];
  totalRows: number;
  quality: number;
  observedFrom?: string;
  observedUntil?: string;
  relationships: RelationshipCandidate[];
  capabilities: DataCapability;
  objectiveSuggestions: ObjectiveSuggestion[];
  warnings: string[];
}

export interface AnalysisObjective {
  entitySheet: string;
  entityColumn: string;
  entityLabel: string;
  entityLabelPlural: string;
  behavior: string;
  eventPolarity: "positive" | "negative";
  targetSheet?: string;
  targetColumn?: string;
  positiveValues?: string[];
  horizonDays: number;
  populationFilter?: string;
  confirmed: boolean;
}

export interface MetricConfig {
  id: string;
  sheet: string;
  column: string;
  meaning: string;
  role: SemanticRole;
  included: boolean;
  riskType: MetricRiskType;
  aggregation: Aggregation;
  importance: ImportanceLevel;
  numericWeight?: number;
  scale: "AUTO" | "ZERO_ONE" | "PERCENT" | "ROBUST";
  missingStrategy: "EXCLUDE" | "NEUTRAL" | "WORST" | "MEDIAN";
  confidence: number;
  rationale: string;
}

export interface AnalysisConfig {
  schemaVersion: "2.0";
  id: string;
  createdAt: string;
  objective: AnalysisObjective;
  relationships: RelationshipCandidate[];
  metrics: MetricConfig[];
  methodPreference: "AUTO" | "SCORE" | "PROBABILITY";
  priorityMode: "estimate" | "business_value" | "expected_impact" | "business_importance";
  importanceMode: "qualitative" | "numeric";
  minimumCoverage: number;
  sampleConsent: boolean;
}

export interface AnalysisFactor {
  metricId: string;
  label: string;
  observedValue: unknown;
  reference: string;
  contribution: number;
  direction: "increases_risk" | "reduces_risk";
  origin: string;
  observed: boolean;
}

export interface EntityAnalysis {
  id: string;
  displayName: string;
  estimate: number;
  estimateKind: "score" | "probability";
  band: "LOW" | "ATTENTION" | "HIGH" | "CRITICAL" | "INSUFFICIENT";
  coverage: number;
  businessValue?: number;
  expectedImpact?: number;
  segment?: string;
  owner?: string;
  factors: AnalysisFactor[];
  missingData: string[];
  context: Record<string, unknown>;
  recommendations: string[];
}

export interface DashboardModule {
  id: string;
  title: string;
  kind: "kpi" | "distribution" | "ranking" | "factors" | "quality" | "financial" | "timeline" | "segments" | "calibration" | "missing" | "telemetry";
  reason: string;
}

export interface AdaptiveAnalysisResult {
  schemaVersion: "2.0";
  runId: string;
  generatedAt: string;
  source: { fileName: string; token?: string; expiresAt?: string; rows: number };
  config: AnalysisConfig;
  profile: WorkbookProfile;
  method: {
    selected: AnalysisMethod;
    label: string;
    reason: string;
    quality?: { brierScore?: number; baselineBrier?: number; rocAuc?: number; calibrated?: boolean };
  };
  summary: {
    analyzedEntities: number;
    attentionEntities: number;
    highEntities: number;
    averageEstimate: number;
    averageCoverage: number;
    totalBusinessValue?: number;
    expectedImpact?: number;
    distribution: Record<string, number>;
  };
  entities: EntityAnalysis[];
  modules: DashboardModule[];
  limitations: string[];
}

export interface SourceProfileResponse {
  sourceToken: string;
  expiresAt: string;
  profile: WorkbookProfile;
  suggestedConfig: AnalysisConfig;
  schemaDiff?: { added: string[]; removed: string[]; typeChanged: string[] };
}

export interface AssistantMessage { role: "user" | "assistant"; text: string }
export interface AssistantTurn {
  engine: "gemini" | "deterministic";
  reply: string;
  quickReplies: string[];
  configPatch?: Partial<AnalysisConfig>;
  warnings: string[];
}
