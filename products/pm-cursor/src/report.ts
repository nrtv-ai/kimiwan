/**
 * Report Generator for PM-Cursor
 * 
 * Generates comprehensive product analytics reports with insights and recommendations.
 */

import { 
  Report, 
  Insight, 
  Recommendation, 
  Funnel, 
  Cohort, 
  Metric,
  UserEvent,
  UserSession 
} from './types';
import { AnalyticsEngine } from './analytics';
import { AIAnalyzer } from './ai';

export interface ReportConfig {
  title: string;
  period: {
    start: Date;
    end: Date;
  };
  funnels?: { name: string; steps: { name: string; event: string }[] }[];
}

export class ReportGenerator {
  private analytics: AnalyticsEngine;
  private ai: AIAnalyzer;

  constructor(aiAnalyzer: AIAnalyzer) {
    this.analytics = new AnalyticsEngine();
    this.ai = aiAnalyzer;
  }

  async generateReport(
    events: UserEvent[],
    config: ReportConfig
  ): Promise<Report> {
    // Build sessions
    const sessions = this.analytics.buildSessions(events);
    
    // Calculate metrics
    const metrics = this.analytics.calculateMetrics(events, sessions);
    
    // Analyze funnels
    const funnels: Funnel[] = [];
    if (config.funnels) {
      for (const funnelConfig of config.funnels) {
        funnels.push(this.analytics.analyzeFunnel(events, funnelConfig));
      }
    }
    
    // Generate insights using AI
    const insights = await this.ai.generateInsights(
      events,
      sessions,
      funnels,
      metrics
    );
    
    // Generate recommendations
    const recommendations = await this.ai.generateRecommendations(insights);
    
    // Build cohorts (simplified)
    const cohorts: Cohort[] = [];
    
    // Generate summary
    const summary = this.generateSummary(metrics, insights, recommendations);

    return {
      id: `report_${Date.now()}`,
      title: config.title,
      generatedAt: new Date(),
      period: config.period,
      summary,
      keyMetrics: metrics,
      insights,
      recommendations,
      funnels,
      cohorts
    };
  }

  private generateSummary(
    metrics: Metric[],
    insights: Insight[],
    recommendations: Recommendation[]
  ): string {
    const criticalInsights = insights.filter(i => i.severity === 'critical');
    const highInsights = insights.filter(i => i.severity === 'high');
    const nowRecs = recommendations.filter(r => r.priority === 'now');
    
    let summary = `Product Analytics Report Summary\n\n`;
    
    summary += `Key Findings:\n`;
    summary += `- ${insights.length} insights identified (${criticalInsights.length} critical, ${highInsights.length} high)\n`;
    summary += `- ${recommendations.length} recommendations generated (${nowRecs.length} priority "now")\n`;
    
    if (criticalInsights.length > 0) {
      summary += `\nCritical Issues:\n`;
      criticalInsights.slice(0, 3).forEach(i => {
        summary += `- ${i.title} (${i.affectedUsers} users affected)\n`;
      });
    }
    
    if (nowRecs.length > 0) {
      summary += `\nImmediate Actions:\n`;
      nowRecs.slice(0, 3).forEach(r => {
        summary += `- ${r.title}\n`;
      });
    }
    
    return summary;
  }

  formatReportAsMarkdown(report: Report): string {
    let md = `# ${report.title}\n\n`;
    md += `**Generated:** ${report.generatedAt.toISOString()}\n\n`;
    md += `**Period:** ${report.period.start.toDateString()} - ${report.period.end.toDateString()}\n\n`;
    
    md += `---\n\n`;
    md += `## Summary\n\n${report.summary}\n\n`;
    
    // Key Metrics
    md += `## Key Metrics\n\n`;
    md += `| Metric | Value | Change |\n`;
    md += `|--------|-------|--------|\n`;
    for (const metric of report.keyMetrics) {
      const change = metric.change !== undefined 
        ? `${metric.change > 0 ? '+' : ''}${metric.change.toFixed(1)}%`
        : '-';
      md += `| ${metric.name} | ${metric.value} | ${change} |\n`;
    }
    md += `\n`;
    
    // Insights
    if (report.insights.length > 0) {
      md += `## Insights\n\n`;
      for (const insight of report.insights) {
        const emoji = this.getSeverityEmoji(insight.severity);
        md += `### ${emoji} ${insight.title}\n\n`;
        md += `- **Type:** ${insight.type}\n`;
        md += `- **Severity:** ${insight.severity}\n`;
        md += `- **Confidence:** ${(insight.confidence * 100).toFixed(0)}%\n`;
        md += `- **Affected Users:** ${insight.affectedUsers}\n`;
        md += `- **Revenue Impact:** ${insight.revenueImpact}\n\n`;
        md += `${insight.description}\n\n`;
        
        if (insight.suggestedActions.length > 0) {
          md += `**Suggested Actions:**\n`;
          for (const action of insight.suggestedActions) {
            md += `- ${action}\n`;
          }
          md += `\n`;
        }
      }
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      md += `## Recommendations\n\n`;
      
      // Group by priority
      const byPriority: Record<string, Recommendation[]> = {
        now: [],
        next: [],
        later: [],
        investigate: []
      };
      
      for (const rec of report.recommendations) {
        byPriority[rec.priority].push(rec);
      }
      
      for (const [priority, recs] of Object.entries(byPriority)) {
        if (recs.length > 0) {
          md += `### ${priority.toUpperCase()}\n\n`;
          for (const rec of recs) {
            md += `#### ${rec.title}\n\n`;
            md += `- **Category:** ${rec.category}\n`;
            md += `- **Effort:** ${rec.effortEstimate}\n`;
            md += `- **Confidence:** ${(rec.confidence * 100).toFixed(0)}%\n`;
            md += `- **Expected Impact:** ${rec.expectedImpact.metric} ${rec.expectedImpact.direction} (${rec.expectedImpact.magnitude})\n\n`;
            md += `${rec.description}\n\n`;
          }
        }
      }
    }
    
    // Funnels
    if (report.funnels.length > 0) {
      md += `## Funnels\n\n`;
      for (const funnel of report.funnels) {
        md += `### ${funnel.name}\n\n`;
        md += `- **Total Users:** ${funnel.totalUsers}\n`;
        md += `- **Overall Conversion:** ${funnel.totalConversionRate.toFixed(1)}%\n\n`;
        md += `| Step | Users | Conversion | Drop-off |\n`;
        md += `|------|-------|------------|----------|\n`;
        for (const step of funnel.steps) {
          md += `| ${step.name} | ${step.userCount} | ${step.conversionRate.toFixed(1)}% | ${step.dropOffRate.toFixed(1)}% |\n`;
        }
        md += `\n`;
      }
    }
    
    return md;
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '💡';
      case 'low': return 'ℹ️';
      default: return '•';
    }
  }
}
