/**
 * Core types for PM-Cursor
 * 
 * Reference: Inspired by Mixpanel's data model and Amplitude's taxonomy
 * https://developer.mixpanel.com/reference/event-object
 * https://help.amplitude.com/hc/en-us/articles/115002380567-User-Properties-and-Event-Properties
 */

// ============================================================================
// User Analytics Types
// ============================================================================

export interface UserEvent {
  id: string;
  userId: string;
  eventName: string;
  timestamp: Date;
  properties: Record<string, any>;
  sessionId?: string;
  platform?: 'web' | 'ios' | 'android';
  version?: string;
}

export interface UserProfile {
  userId: string;
  firstSeen: Date;
  lastSeen: Date;
  properties: Record<string, any>;
  segments: string[];
}

export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  events: UserEvent[];
  properties: {
    duration?: number;
    pageViews?: number;
    deviceType?: string;
    referrer?: string;
  };
}

// ============================================================================
// Data Source Types
// ============================================================================

export type DataSourceType = 'mixpanel' | 'amplitude' | 'segment' | 'ga4' | 'csv' | 'json';

export interface DataSourceConfig {
  type: DataSourceType;
  name: string;
  credentials: Record<string, string>;
  options?: {
    startDate?: Date;
    endDate?: Date;
    eventFilter?: string[];
    userFilter?: string[];
  };
}

export interface DataSource {
  config: DataSourceConfig;
  connect(): Promise<void>;
  fetchEvents(startDate: Date, endDate: Date): Promise<UserEvent[]>;
  fetchUserProfiles(userIds: string[]): Promise<UserProfile[]>;
}

// ============================================================================
// Analysis Types
// ============================================================================

export type InsightType = 
  | 'friction_point' 
  | 'drop_off' 
  | 'engagement_opportunity' 
  | 'feature_request' 
  | 'usability_issue' 
  | 'growth_opportunity';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: Evidence[];
  affectedUsers: number;
  revenueImpact?: 'low' | 'medium' | 'high' | 'unknown';
  suggestedActions: string[];
  createdAt: Date;
}

export interface Evidence {
  type: 'event_pattern' | 'funnel_drop' | 'correlation' | 'user_feedback' | 'anomaly';
  description: string;
  data: Record<string, any>;
  significance: number; // statistical significance or relevance score
}

export interface FunnelStep {
  name: string;
  event: string;
  userCount: number;
  conversionRate: number; // percentage from previous step
  dropOffRate: number;
  avgTimeToConvert?: number; // seconds
}

export interface Funnel {
  name: string;
  steps: FunnelStep[];
  totalConversionRate: number;
  totalUsers: number;
}

export interface Cohort {
  name: string;
  criteria: Record<string, any>;
  users: string[];
  retentionCurve: number[]; // retention % by day
  behaviors: {
    eventName: string;
    frequency: number;
  }[];
}

// ============================================================================
// Recommendation Types
// ============================================================================

export type RecommendationPriority = 'now' | 'next' | 'later' | 'investigate';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  category: 'feature' | 'improvement' | 'fix' | 'experiment';
  relatedInsights: string[];
  expectedImpact: {
    metric: string;
    direction: 'increase' | 'decrease';
    magnitude: 'small' | 'medium' | 'large';
  };
  effortEstimate: 'small' | 'medium' | 'large';
  confidence: number;
  createdAt: Date;
}

export interface ProductDecision {
  id: string;
  recommendationId: string;
  decision: 'accept' | 'reject' | 'defer';
  rationale: string;
  decidedBy: string;
  decidedAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// ============================================================================
// Report Types
// ============================================================================

export interface Report {
  id: string;
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: string;
  keyMetrics: Metric[];
  insights: Insight[];
  recommendations: Recommendation[];
  funnels: Funnel[];
  cohorts: Cohort[];
}

export interface Metric {
  name: string;
  value: number;
  previousValue?: number;
  change?: number; // percentage change
  trend: 'up' | 'down' | 'flat';
  target?: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface PMCursorConfig {
  ai: {
    provider: 'anthropic' | 'openai';
    apiKey: string;
    model?: string;
    maxTokens?: number;
  };
  database: {
    path: string;
  };
  analysis: {
    minConfidenceThreshold: number;
    maxInsightsPerReport: number;
    lookbackDays: number;
  };
  integrations: DataSourceConfig[];
}
