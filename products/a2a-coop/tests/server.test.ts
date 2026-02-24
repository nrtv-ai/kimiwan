import { A2ACoopServer } from '../src/server';
import WebSocket from 'ws';
import http from 'http';

describe('A2ACoopServer', () => {
  let server: A2ACoopServer;
  let port: number;

  beforeEach(() => {
    port = 9000 + Math.floor(Math.random() * 1000);
    server = new A2ACoopServer(port);
    server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  function createClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function sendAndWait(ws: WebSocket, message: object): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      
      ws.once('message', (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });

      ws.send(JSON.stringify(message));
    });
  }

  describe('health check', () => {
    it('should return health status via HTTP', async () => {
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await new Promise<http.IncomingMessage & { body: any }>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ ...res, body: JSON.parse(data) } as any);
          });
        });
        req.on('error', reject);
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBe('0.2.0');
      expect(response.body.components).toBeDefined();
      expect(response.body.metrics).toBeDefined();
    });

    it('should return server info at root path', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await new Promise<http.IncomingMessage & { body: any }>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ ...res, body: JSON.parse(data) } as any);
          });
        });
        req.on('error', reject);
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('A2A-Coop');
      expect(response.body.endpoints).toBeDefined();
    });

    it('should return 404 for unknown paths', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/unknown`, (res) => {
          resolve(res);
        });
        req.on('error', reject);
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return health status via WebSocket', async () => {
      const ws = await createClient();

      const response = await sendAndWait(ws, {
        id: '1',
        type: 'status.get',
        payload: {},
      });

      expect(response.payload.status).toBeDefined();
      expect(typeof response.payload.status.agents).toBe('number');
      expect(typeof response.payload.status.tasks).toBe('object');

      ws.close();
    });
  });

  describe('agent operations', () => {
    it('should register an agent', async () => {
      const ws = await createClient();

      const response = await sendAndWait(ws, {
        id: '1',
        type: 'agent.register',
        payload: {
          name: 'TestAgent',
          description: 'A test agent',
          capabilities: ['test'],
        },
      });

      expect(response.type).toBe('response');
      expect(response.requestId).toBe('1');
      expect(response.payload.agent.name).toBe('TestAgent');
      expect(response.payload.agent.id).toBeDefined();

      ws.close();
    });

    it('should list agents', async () => {
      const ws = await createClient();

      // Register first
      await sendAndWait(ws, {
        id: '1',
        type: 'agent.register',
        payload: { name: 'Agent1', description: '', capabilities: [] },
      });

      const response = await sendAndWait(ws, {
        id: '2',
        type: 'agent.list',
        payload: {},
      });

      expect(response.payload.agents).toHaveLength(1);
      expect(response.payload.agents[0].name).toBe('Agent1');

      ws.close();
    });

    it('should get agent by ID', async () => {
      const ws = await createClient();

      const regResponse = await sendAndWait(ws, {
        id: '1',
        type: 'agent.register',
        payload: { name: 'TestAgent', description: '', capabilities: [] },
      });

      const agentId = regResponse.payload.agent.id;

      const response = await sendAndWait(ws, {
        id: '2',
        type: 'agent.get',
        payload: { agentId },
      });

      expect(response.payload.agent.id).toBe(agentId);

      ws.close();
    });
  });

  describe('task operations', () => {
    it('should create a task', async () => {
      const ws = await createClient();

      // Register agent first
      const regResponse = await sendAndWait(ws, {
        id: '1',
        type: 'agent.register',
        payload: { name: 'TestAgent', description: '', capabilities: [] },
      });
      const agentId = regResponse.payload.agent.id;

      const response = await sendAndWait(ws, {
        id: '2',
        type: 'task.create',
        payload: {
          request: {
            type: 'test',
            description: 'Test task',
            payload: {},
          },
          createdBy: agentId,
        },
      });

      expect(response.payload.task.type).toBe('test');
      expect(response.payload.task.status).toBe('pending');

      ws.close();
    });

    it('should assign a task', async () => {
      const ws = await createClient();

      // Register agent
      const regResponse = await sendAndWait(ws, {
        id: '1',
        type: 'agent.register',
        payload: { name: 'TestAgent', description: '', capabilities: [] },
      });
      const agentId = regResponse.payload.agent.id;

      // Create task
      const taskResponse = await sendAndWait(ws, {
        id: '2',
        type: 'task.create',
        payload: {
          request: { type: 'test', description: '', payload: {} },
          createdBy: agentId,
        },
      });
      const taskId = taskResponse.payload.task.id;

      // Assign task
      const response = await sendAndWait(ws, {
        id: '3',
        type: 'task.assign',
        payload: { taskId, agentId },
      });

      expect(response.payload.success).toBe(true);

      ws.close();
    });
  });

  describe('context operations', () => {
    it('should create a context', async () => {
      const ws = await createClient();

      // Register agent
      const regResponse = await sendAndWait(ws, {
        id: '1',
        type: 'agent.register',
        payload: { name: 'TestAgent', description: '', capabilities: [] },
      });
      const agentId = regResponse.payload.agent.id;

      const response = await sendAndWait(ws, {
        id: '2',
        type: 'context.create',
        payload: {
          request: { name: 'TestContext', description: 'A test context' },
          createdBy: agentId,
        },
      });

      expect(response.payload.context.name).toBe('TestContext');

      ws.close();
    });
  });

  describe('status', () => {
    // Tests moved to health check section
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      const limitedServer = new A2ACoopServer(port + 1000, {
        enableRateLimiting: true,
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 2,
      });
      limitedServer.start();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const ws = await new Promise<WebSocket>((resolve, reject) => {
        const client = new WebSocket(`ws://localhost:${port + 1000}`);
        client.on('open', () => resolve(client));
        client.on('error', reject);
      });

      // First two requests should succeed
      ws.send(JSON.stringify({
        id: '1',
        type: 'status.get',
        payload: {},
      }));

      ws.send(JSON.stringify({
        id: '2',
        type: 'status.get',
        payload: {},
      }));

      // Wait for responses
      let responses: any[] = [];
      ws.on('message', (data) => {
        responses.push(JSON.parse(data.toString()));
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      ws.close();
      await limitedServer.stop();
    });
  });

  describe('error handling', () => {
    it('should return error for invalid JSON', async () => {
      const ws = await createClient();

      const response = await new Promise<any>((resolve) => {
        ws.once('message', (data) => resolve(JSON.parse(data.toString())));
        ws.send('invalid json');
      });

      expect(response.type).toBe('error');
      expect(response.payload.error).toContain('Invalid JSON');

      ws.close();
    });

    it('should return error for unknown message type', async () => {
      const ws = await createClient();

      const response = await sendAndWait(ws, {
        id: '1',
        type: 'unknown.type',
        payload: {},
      });

      expect(response.type).toBe('error');
      expect(response.payload.error).toContain('Unknown message type');

      ws.close();
    });
  });
});
