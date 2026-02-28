import { DataIngestor, JSONSource } from '../src/ingestion';
import { DataSourceConfig } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DataIngestor', () => {
  let ingestor: DataIngestor;
  let tempDir: string;

  beforeEach(() => {
    ingestor = new DataIngestor();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-cursor-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('JSONSource', () => {
    it('should parse JSON events file', async () => {
      const testData = {
        events: [
          { id: '1', user_id: 'user_1', event: 'sign_up', time: '2024-01-01T00:00:00Z', properties: {} },
          { id: '2', user_id: 'user_1', event: 'purchase', time: '2024-01-01T01:00:00Z', properties: { amount: 100 } }
        ]
      };

      const filePath = path.join(tempDir, 'events.json');
      fs.writeFileSync(filePath, JSON.stringify(testData));

      const config: DataSourceConfig = {
        type: 'json',
        name: 'test',
        credentials: { filePath }
      };

      const source = new JSONSource(config);
      await source.connect();
      
      const events = await source.fetchEvents(new Date(), new Date());
      
      expect(events.length).toBe(2);
      expect(events[0].eventName).toBe('sign_up');
      expect(events[1].eventName).toBe('purchase');
    });

    it('should normalize different field names', async () => {
      const testData = [
        { eventName: 'click', userId: 'u1', timestamp: '2024-01-01T00:00:00Z' },
        { name: 'scroll', distinct_id: 'u2', time: '2024-01-01T01:00:00Z' }
      ];

      const filePath = path.join(tempDir, 'events.json');
      fs.writeFileSync(filePath, JSON.stringify(testData));

      const config: DataSourceConfig = {
        type: 'json',
        name: 'test',
        credentials: { filePath }
      };

      const source = new JSONSource(config);
      const events = await source.fetchEvents(new Date(), new Date());
      
      expect(events[0].userId).toBe('u1');
      expect(events[1].userId).toBe('u2');
    });
  });

  describe('createSource', () => {
    it('should create JSON source', () => {
      const config: DataSourceConfig = {
        type: 'json',
        name: 'test',
        credentials: { filePath: '/tmp/test.json' }
      };

      const source = ingestor.createSource(config);
      expect(source).toBeInstanceOf(JSONSource);
    });

    it('should throw for unknown source type', () => {
      const config = {
        type: 'unknown' as any,
        name: 'test',
        credentials: {}
      };

      expect(() => ingestor.createSource(config)).toThrow('Unknown source type');
    });
  });
});
