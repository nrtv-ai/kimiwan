/**
 * AI Analysis Engine for PM-Cursor
 * 
 * Uses LLMs to analyze analytics data and generate insights/recommendations.
 * 
 * Reference: Inspired by Amplitude's AI features and Mixpanel's Spark
 */

import { 
  Insight, 
  InsightType, 
  Evidence, 
  Recommendation,
  RecommendationPriority,
  Funnel,
  UserEvent,
  UserSession,
  Metric 
} from './types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface AIConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AIAnalyzer {
  private client: Anthropic | OpenAI;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    
    if (config.provider === 'anthropic') {
      this.client = new Anthropic({ apiKey: config.apiKey });
    } else {
      this.client = new OpenAI({ apiKey: config.apiKey });
    }
  }

  // ============================================================================
  // Insight Generation
  // ============================================================================
  
  async generateInsights(
    events: UserEvent[],
    sessions: UserSession[],
    funnels: Funnel[],
    metrics: Metric[]
  ): Promise<Insight[]> {
    const prompt = this.buildInsightPrompt(events, sessions, funnels, metrics);
    
    const response = await this.callLLM(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return parsed.insights.map((insight: any, index: number) => ({
        id: `insight_${Date.now()}_${index}`,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        severity: insight.severity,
        evidence: insight.evidence || [],
        affectedUsers: insight.affectedUsers || 0,
        revenueImpact: insight.revenueImpact || 'unknown',
        suggestedActions: insight.suggestedActions || [],
        createdAt: new Date()
      }));
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return [];
    }
  }

  private buildInsightPrompt(
    events: UserEvent[],
    sessions: UserSession[],
    funnels: Funnel[],
    metrics: Metric[]
  ): string {
    // Aggregate data for the prompt
    const eventCounts = this.aggregateEvents(events);
    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    const avgSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.properties.duration || 0), 0) / sessions.length
      : 0;

    return `You are a senior product analyst. Analyze the following product analytics data and identify key insights.

## Data Summary

### Key Metrics
${metrics.map(m => `- ${m.name}: ${m.value}`).join('\n')}

### Top Events
${topEvents.map(([name, count]) => `- ${name}: ${count} occurrences`).join('\n')}

### Funnels
${funnels.map(f => `
Funnel: ${f.name}
Total Users: ${f.totalUsers}
Conversion Rate: ${f.totalConversionRate.toFixed(1)}%
Steps:
${f.steps.map(s => `  - ${s.name}: ${s.userCount} users (${s.conversionRate.toFixed(1)}% conversion, ${s.dropOffRate.toFixed(1)}% drop-off)`).join('\n')}
`).join('\n')}

### Session Data
- Total Sessions: ${sessions.length}
- Average Session Duration: ${avgSessionDuration.toFixed(0)} seconds

## Task

Identify 3-5 key insights from this data. Focus on:
1. Friction points - where users are getting stuck
2. Drop-offs - significant conversion losses
3. Engagement opportunities - underutilized features
4. Anomalies - unexpected patterns

For each insight, provide:
- type: one of [friction_point, drop_off, engagement_opportunity, feature_request, usability_issue, growth_opportunity]
- title: concise headline
- description: detailed explanation
- confidence: 0-1 score
- severity: low, medium, high, or critical
- affectedUsers: estimated number of affected users
- suggestedActions: 2-3 specific recommendations

Return your response as JSON in this format:
{
  "insights": [
    {
      "type": "drop_off",
      "title": "50% drop-off at checkout",
      "description": "...",
      "confidence": 0.85,
      "severity": "high",
      "affectedUsers": 1250,
      "suggestedActions": ["Simplify checkout form", "Add progress indicator"]
    }
  ]
}`;
  }

  // ============================================================================
  // Recommendation Generation
  // ============================================================================
  
  async generateRecommendations(insights: Insight[]): Promise<Recommendation[]> {
    if (insights.length === 0) {
      return [];
    }

    const prompt = this.buildRecommendationPrompt(insights);
    const response = await this.callLLM(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return parsed.recommendations.map((rec: any, index: number) => ({
        id: `rec_${Date.now()}_${index}`,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        category: rec.category,
        relatedInsights: rec.relatedInsights || [],
        expectedImpact: rec.expectedImpact,
        effortEstimate: rec.effortEstimate,
        confidence: rec.confidence,
        createdAt: new Date()
      }));
    } catch (error) {
      console.error('Failed to parse recommendations:', error);
      return [];
    }
  }

  private buildRecommendationPrompt(insights: Insight[]): string {
    return `You are a senior product manager. Based on the following insights, generate actionable product recommendations.

## Insights

${insights.map((insight, i) => `
### Insight ${i + 1}: ${insight.title}
- Type: ${insight.type}
- Severity: ${insight.severity}
- Confidence: ${(insight.confidence * 100).toFixed(0)}%
- Affected Users: ${insight.affectedUsers}
- Description: ${insight.description}
- Suggested Actions: ${insight.suggestedActions.join(', ')}
`).join('\n')}

## Task

Generate 3-5 product recommendations that address these insights. For each recommendation:

- title: Clear, actionable title
- description: What to build and why
- priority: now (P0), next (P1), later (P2), or investigate (needs more data)
- category: feature, improvement, fix, or experiment
- expectedImpact: { metric: "string", direction: "increase|decrease", magnitude: "small|medium|large" }
- effortEstimate: small, medium, or large
- confidence: 0-1 score
- relatedInsights: array of insight indices (0-based) this addresses

Return as JSON:
{
  "recommendations": [
    {
      "title": "...",
      "description": "...",
      "priority": "now",
      "category": "fix",
      "expectedImpact": { "metric": "checkout_conversion", "direction": "increase", "magnitude": "medium" },
      "effortEstimate": "small",
      "confidence": 0.8,
      "relatedInsights": [0]
    }
  ]
}`;
  }

  // ============================================================================
  // Natural Language Query
  // ============================================================================
  
  async answerQuestion(
    question: string,
    events: UserEvent[],
    metrics: Metric[]
  ): Promise<{ answer: string; supportingData: any }> {
    const eventCounts = this.aggregateEvents(events);
    
    const prompt = `You are a product analytics assistant. Answer the user's question based on the available data.

## Available Data

### Key Metrics
${metrics.map(m => `- ${m.name}: ${m.value}`).join('\n')}

### Event Distribution
${Object.entries(eventCounts).map(([name, count]) => `- ${name}: ${count}`).join('\n')}

### User Question
"${question}"

Provide a concise answer based on the data. If the data doesn't support a definitive answer, say so.

Return as JSON:
{
  "answer": "your answer here",
  "supportingData": { relevant metrics or events }
}`;

    const response = await this.callLLM(prompt);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      return { 
        answer: "I couldn't analyze the data properly.", 
        supportingData: null 
      };
    }
  }

  // ============================================================================
  // LLM Call Helper
  // ============================================================================
  
  private async callLLM(prompt: string): Promise<string> {
    const maxTokens = this.config.maxTokens || 4000;
    
    if (this.config.provider === 'anthropic') {
      const response = await (this.client as Anthropic).messages.create({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    } else {
      const response = await (this.client as OpenAI).chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      });
      
      return response.choices[0]?.message?.content || '';
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================
  
  private aggregateEvents(events: UserEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.eventName] = (counts[event.eventName] || 0) + 1;
    }
    return counts;
  }
}
