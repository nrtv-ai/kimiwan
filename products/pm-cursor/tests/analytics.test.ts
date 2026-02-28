import { AnalyticsEngine } from '../src/analytics';
import { UserEvent, UserSession } from '../src/types';

describe('AnalyticsEngine', () => {
  let engine: AnalyticsEngine;
  let sampleEvents: UserEvent[];

  beforeEach(() => {
    engine = new AnalyticsEngine();
    
    // Create sample events
    const now = new Date();
    sampleEvents = [
      {
        id: '1',
        userId: 'user_1',
        eventName: 'sign_up',
        timestamp: now,
        properties: {}
      },
      {
        id: '2',
        userId: 'user_1',
        eventName: 'profile_complete',
        timestamp: new Date(now.getTime() + 1000),
        properties: {}
      },
      {
        id: '3',
        userId: 'user_2',
        eventName: 'sign_up',
        timestamp: now,
        properties: {}
      },
      {
        id: '4',
        userId: 'user_1',
        eventName: 'page_view',
        timestamp: new Date(now.getTime() + 2000),
        properties: {}
      }
    ];
  });

  describe('buildSessions', () => {
    it('should group events into sessions', () => {
      const sessions = engine.buildSessions(sampleEvents);
      
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].events.length).toBeGreaterThan(0);
    });

    it('should calculate session duration', () => {
      const sessions = engine.buildSessions(sampleEvents);
      
      if (sessions[0].properties.duration) {
        expect(sessions[0].properties.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('analyzeFunnel', () => {
    it('should calculate funnel conversion rates', () => {
      const funnel = engine.analyzeFunnel(sampleEvents, {
        name: 'Onboarding',
        steps: [
          { name: 'Sign Up', event: 'sign_up' },
          { name: 'Complete Profile', event: 'profile_complete' }
        ]
      });

      expect(funnel.name).toBe('Onboarding');
      expect(funnel.steps.length).toBe(2);
      expect(funnel.totalUsers).toBe(2); // 2 users signed up
      expect(funnel.steps[0].userCount).toBe(2);
      expect(funnel.steps[1].userCount).toBe(1); // Only user_1 completed profile
    });

    it('should calculate drop-off rates', () => {
      const funnel = engine.analyzeFunnel(sampleEvents, {
        name: 'Onboarding',
        steps: [
          { name: 'Sign Up', event: 'sign_up' },
          { name: 'Complete Profile', event: 'profile_complete' }
        ]
      });

      expect(funnel.steps[1].dropOffRate).toBe(50); // 50% drop-off
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate key metrics', () => {
      const sessions = engine.buildSessions(sampleEvents);
      const metrics = engine.calculateMetrics(sampleEvents, sessions);

      const totalEventsMetric = metrics.find(m => m.name === 'Total Events');
      expect(totalEventsMetric).toBeDefined();
      expect(totalEventsMetric!.value).toBe(4);

      const uniqueUsersMetric = metrics.find(m => m.name === 'Unique Users');
      expect(uniqueUsersMetric).toBeDefined();
      expect(uniqueUsersMetric!.value).toBe(2);
    });
  });

  describe('findCommonSequences', () => {
    it('should find common event sequences', () => {
      const sequences = engine.findCommonSequences(sampleEvents, 0.1);
      
      expect(Array.isArray(sequences)).toBe(true);
    });
  });
});
