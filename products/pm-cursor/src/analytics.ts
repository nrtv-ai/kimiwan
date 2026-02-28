/**
 * Analytics engine for PM-Cursor
 * 
 * Performs statistical analysis on user behavior data to identify patterns,
 * funnels, cohorts, and anomalies.
 * 
 * Reference: Inspired by Amplitude's Behavioral Analysis and Mixpanel's Insights
 */

import { 
  UserEvent, 
  UserSession, 
  Funnel, 
  FunnelStep, 
  Cohort,
  Metric 
} from './types';

export interface FunnelConfig {
  name: string;
  steps: { name: string; event: string }[];
}

export class AnalyticsEngine {
  
  // ============================================================================
  // Session Analysis
  // ============================================================================
  
  buildSessions(events: UserEvent[]): UserSession[] {
    // Group events by sessionId, fallback to 30-min inactivity window
    const sessions: Map<string, UserSession> = new Map();
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (const event of sortedEvents) {
      const sessionKey = event.sessionId || this.deriveSessionKey(event);
      
      let session = sessions.get(sessionKey);
      if (!session) {
        session = {
          sessionId: sessionKey,
          userId: event.userId,
          startTime: event.timestamp,
          events: [],
          properties: {}
        };
        sessions.set(sessionKey, session);
      }

      // Check for session timeout
      const lastEvent = session.events[session.events.length - 1];
      if (lastEvent) {
        const timeSinceLast = event.timestamp.getTime() - lastEvent.timestamp.getTime();
        if (timeSinceLast > SESSION_TIMEOUT) {
          // Start new session
          const newSessionKey = `${event.userId}_${event.timestamp.getTime()}`;
          session = {
            sessionId: newSessionKey,
            userId: event.userId,
            startTime: event.timestamp,
            events: [],
            properties: {}
          };
          sessions.set(newSessionKey, session);
        }
      }

      session.events.push(event);
      session.endTime = event.timestamp;
    }

    // Calculate session properties
    for (const session of sessions.values()) {
      if (session.endTime) {
        session.properties.duration = 
          (session.endTime.getTime() - session.startTime.getTime()) / 1000;
      }
      session.properties.pageViews = session.events.filter(
        e => e.eventName === 'page_view' || e.eventName === 'Page View'
      ).length;
    }

    return Array.from(sessions.values());
  }

  private deriveSessionKey(event: UserEvent): string {
    // Use timestamp to approximate sessions (30-min windows)
    const windowStart = Math.floor(event.timestamp.getTime() / (30 * 60 * 1000));
    return `${event.userId}_${windowStart}`;
  }

  // ============================================================================
  // Funnel Analysis
  // ============================================================================
  
  analyzeFunnel(events: UserEvent[], config: FunnelConfig): Funnel {
    const userEvents = new Map<string, Set<string>>();
    
    // Track which events each user performed
    for (const event of events) {
      if (!userEvents.has(event.userId)) {
        userEvents.set(event.userId, new Set());
      }
      userEvents.get(event.userId)!.add(event.eventName);
    }

    const steps: FunnelStep[] = [];
    let previousCount = userEvents.size;

    for (const stepConfig of config.steps) {
      const usersWithEvent = Array.from(userEvents.entries())
        .filter(([_, events]) => events.has(stepConfig.event))
        .map(([userId]) => userId);

      const conversionRate = previousCount > 0 
        ? (usersWithEvent.length / previousCount) * 100 
        : 0;

      steps.push({
        name: stepConfig.name,
        event: stepConfig.event,
        userCount: usersWithEvent.length,
        conversionRate,
        dropOffRate: 100 - conversionRate
      });

      previousCount = usersWithEvent.length;
      
      // Remove users who didn't complete this step for next step analysis
      for (const [userId] of userEvents) {
        if (!usersWithEvent.includes(userId)) {
          userEvents.delete(userId);
        }
      }
    }

    return {
      name: config.name,
      steps,
      totalConversionRate: steps.length > 0 
        ? (steps[steps.length - 1].userCount / steps[0].userCount) * 100 
        : 0,
      totalUsers: steps[0]?.userCount || 0
    };
  }

  // ============================================================================
  // Cohort Analysis
  // ============================================================================
  
  buildCohorts(
    events: UserEvent[], 
    criteria: { eventName: string; dateRange: [Date, Date] }
  ): Cohort[] {
    // Group users by when they first performed the criteria event
    const userFirstEvent = new Map<string, Date>();
    
    for (const event of events) {
      if (event.eventName === criteria.eventName) {
        const current = userFirstEvent.get(event.userId);
        if (!current || event.timestamp < current) {
          userFirstEvent.set(event.userId, event.timestamp);
        }
      }
    }

    // Group by week
    const cohortsByWeek = new Map<string, string[]>();
    
    for (const [userId, firstEventDate] of userFirstEvent) {
      const weekKey = this.getWeekKey(firstEventDate);
      if (!cohortsByWeek.has(weekKey)) {
        cohortsByWeek.set(weekKey, []);
      }
      cohortsByWeek.get(weekKey)!.push(userId);
    }

    // Build cohorts with retention curves
    const cohorts: Cohort[] = [];
    
    for (const [weekKey, users] of cohortsByWeek) {
      const retentionCurve = this.calculateRetention(
        events, 
        users, 
        criteria.eventName
      );

      cohorts.push({
        name: `Cohort ${weekKey}`,
        criteria: { signupWeek: weekKey },
        users,
        retentionCurve,
        behaviors: this.calculateBehaviors(events, users)
      });
    }

    return cohorts.sort((a, b) => 
      a.criteria.signupWeek.localeCompare(b.criteria.signupWeek)
    );
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private calculateRetention(
    events: UserEvent[], 
    cohortUsers: string[], 
    targetEvent: string,
    days: number = 30
  ): number[] {
    const retention: number[] = [];
    const cohortSet = new Set(cohortUsers);
    
    for (let day = 0; day <= days; day++) {
      const activeUsers = new Set<string>();
      
      for (const event of events) {
        if (cohortSet.has(event.userId) && event.eventName === targetEvent) {
          // Simplified: count if user performed event on or after day N
          activeUsers.add(event.userId);
        }
      }
      
      retention.push((activeUsers.size / cohortUsers.length) * 100);
    }
    
    return retention;
  }

  private calculateBehaviors(
    events: UserEvent[], 
    users: string[]
  ): { eventName: string; frequency: number }[] {
    const userSet = new Set(users);
    const eventCounts = new Map<string, number>();
    
    for (const event of events) {
      if (userSet.has(event.userId)) {
        eventCounts.set(event.eventName, (eventCounts.get(event.eventName) || 0) + 1);
      }
    }
    
    return Array.from(eventCounts.entries())
      .map(([eventName, count]) => ({
        eventName,
        frequency: count / users.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  // ============================================================================
  // Key Metrics
  // ============================================================================
  
  calculateMetrics(events: UserEvent[], sessions: UserSession[]): Metric[] {
    const totalEvents = events.length;
    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const totalSessions = sessions.length;
    
    const avgSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.properties.duration || 0), 0) / sessions.length
      : 0;

    const eventsPerSession = totalSessions > 0
      ? totalEvents / totalSessions
      : 0;

    return [
      {
        name: 'Total Events',
        value: totalEvents,
        trend: 'flat'
      },
      {
        name: 'Unique Users',
        value: uniqueUsers,
        trend: 'flat'
      },
      {
        name: 'Total Sessions',
        value: totalSessions,
        trend: 'flat'
      },
      {
        name: 'Avg Session Duration (s)',
        value: Math.round(avgSessionDuration),
        trend: 'flat'
      },
      {
        name: 'Events per Session',
        value: Math.round(eventsPerSession * 10) / 10,
        trend: 'flat'
      }
    ];
  }

  // ============================================================================
  // Pattern Detection
  // ============================================================================
  
  findCommonSequences(events: UserEvent[], minSupport: number = 0.1): string[][] {
    // Simple frequent sequence mining
    // Returns sequences of events that commonly occur together
    const sessions = this.buildSessions(events);
    const sequences: Map<string, number> = new Map();
    
    for (const session of sessions) {
      const eventNames = session.events.map(e => e.eventName);
      
      // Find pairs (simplified - would use proper sequence mining in production)
      for (let i = 0; i < eventNames.length - 1; i++) {
        const pair = `${eventNames[i]} -> ${eventNames[i + 1]}`;
        sequences.set(pair, (sequences.get(pair) || 0) + 1);
      }
    }
    
    const minCount = Math.floor(sessions.length * minSupport);
    
    return Array.from(sequences.entries())
      .filter(([_, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([seq]) => seq.split(' -> '));
  }

  detectAnomalies(events: UserEvent[]): { eventName: string; zScore: number }[] {
    // Detect events with unusual frequency
    const eventCounts = new Map<string, number[]>();
    
    // Group by day
    const dailyCounts = new Map<string, Map<string, number>>();
    
    for (const event of events) {
      const day = event.timestamp.toISOString().split('T')[0];
      if (!dailyCounts.has(day)) {
        dailyCounts.set(day, new Map());
      }
      const dayCounts = dailyCounts.get(day)!;
      dayCounts.set(event.eventName, (dayCounts.get(event.eventName) || 0) + 1);
    }
    
    // Calculate z-scores for each event type
    const anomalies: { eventName: string; zScore: number }[] = [];
    
    const allEvents = new Set(events.map(e => e.eventName));
    
    for (const eventName of allEvents) {
      const counts: number[] = [];
      for (const dayCounts of dailyCounts.values()) {
        counts.push(dayCounts.get(eventName) || 0);
      }
      
      if (counts.length >= 7) {
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
        const stdDev = Math.sqrt(variance);
        
        const lastCount = counts[counts.length - 1];
        const zScore = stdDev > 0 ? (lastCount - mean) / stdDev : 0;
        
        if (Math.abs(zScore) > 2) {
          anomalies.push({ eventName, zScore });
        }
      }
    }
    
    return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }
}
