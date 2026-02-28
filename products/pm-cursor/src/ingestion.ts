/**
 * Data ingestion module for PM-Cursor
 * 
 * Handles fetching and normalizing data from various analytics sources.
 * Reference: Mixpanel Export API, Segment Spec
 */

import { UserEvent, UserProfile, DataSource, DataSourceConfig, DataSourceType } from './types';
import axios from 'axios';

export class MixpanelSource implements DataSource {
  constructor(public config: DataSourceConfig) {}

  async connect(): Promise<void> {
    // Verify credentials by making a test request
    const { apiSecret, projectId } = this.config.credentials;
    if (!apiSecret || !projectId) {
      throw new Error('Mixpanel source requires apiSecret and projectId');
    }
    
    // Test connection
    const auth = Buffer.from(`${apiSecret}:`).toString('base64');
    try {
      await axios.get(
        `https://data.mixpanel.com/api/2.0/engage?project_id=${projectId}&limit=1`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
    } catch (error) {
      throw new Error(`Failed to connect to Mixpanel: ${error}`);
    }
  }

  async fetchEvents(startDate: Date, endDate: Date): Promise<UserEvent[]> {
    // Implementation would call Mixpanel Export API
    // https://developer.mixpanel.com/reference/raw-event-export
    throw new Error('Mixpanel fetchEvents not yet implemented');
  }

  async fetchUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    // Implementation would call Mixpanel Engage API
    throw new Error('Mixpanel fetchUserProfiles not yet implemented');
  }
}

export class CSVSource implements DataSource {
  constructor(public config: DataSourceConfig) {}

  async connect(): Promise<void> {
    const { filePath } = this.config.credentials;
    if (!filePath) {
      throw new Error('CSV source requires filePath');
    }
  }

  async fetchEvents(startDate: Date, endDate: Date): Promise<UserEvent[]> {
    // Parse CSV and normalize to UserEvent format
    throw new Error('CSV fetchEvents not yet implemented');
  }

  async fetchUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    // Parse CSV for user profiles
    throw new Error('CSV fetchUserProfiles not yet implemented');
  }
}

export class JSONSource implements DataSource {
  constructor(public config: DataSourceConfig) {}

  async connect(): Promise<void> {
    const { filePath } = this.config.credentials;
    if (!filePath) {
      throw new Error('JSON source requires filePath');
    }
  }

  async fetchEvents(startDate: Date, endDate: Date): Promise<UserEvent[]> {
    const { filePath } = this.config.credentials;
    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    return this.normalizeEvents(data.events || data);
  }

  async fetchUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    const { filePath } = this.config.credentials;
    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    return this.normalizeProfiles(data.users || data.profiles || []);
  }

  private normalizeEvents(data: any[]): UserEvent[] {
    return data.map((e, i) => ({
      id: e.id || e.event_id || `evt_${i}`,
      userId: e.user_id || e.userId || e.distinct_id || 'anonymous',
      eventName: e.event || e.eventName || e.name || 'unknown',
      timestamp: new Date(e.time || e.timestamp || Date.now()),
      properties: e.properties || {},
      sessionId: e.session_id || e.sessionId,
      platform: e.platform || e.properties?.platform,
      version: e.version || e.properties?.app_version
    }));
  }

  private normalizeProfiles(data: any[]): UserProfile[] {
    return data.map((p, i) => ({
      userId: p.user_id || p.userId || p.distinct_id || `user_${i}`,
      firstSeen: new Date(p.first_seen || p.created || Date.now()),
      lastSeen: new Date(p.last_seen || p.lastSeen || Date.now()),
      properties: p.properties || p,
      segments: p.segments || []
    }));
  }
}

export class DataIngestor {
  private sources: Map<string, DataSource> = new Map();

  registerSource(name: string, source: DataSource): void {
    this.sources.set(name, source);
  }

  async ingestFromSource(
    sourceName: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{ events: UserEvent[]; profiles: UserProfile[] }> {
    const source = this.sources.get(sourceName);
    if (!source) {
      throw new Error(`Source '${sourceName}' not found`);
    }

    await source.connect();
    
    const events = await source.fetchEvents(startDate, endDate);
    const userIds = [...new Set(events.map(e => e.userId))];
    const profiles = await source.fetchUserProfiles(userIds);

    return { events, profiles };
  }

  createSource(config: DataSourceConfig): DataSource {
    switch (config.type) {
      case 'mixpanel':
        return new MixpanelSource(config);
      case 'csv':
        return new CSVSource(config);
      case 'json':
        return new JSONSource(config);
      default:
        throw new Error(`Unknown source type: ${config.type}`);
    }
  }
}
