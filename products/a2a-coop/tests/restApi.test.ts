import { A2ACoop } from '../src/index';
import { A2ACoopRestApi } from '../src/restApi';
import { createServer, IncomingMessage, ServerResponse } from 'http';

// Helper to make HTTP requests to the REST API
function makeRequest(
  restApi: A2ACoopRestApi,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ statusCode: number; data: unknown }> {
  return new Promise((resolve) => {
    const req = {
      method,
      url: path,
      headers: { host: 'localhost:8080' },
      on: (event: string, handler: (chunk?: string) => void) => {
        if (event === 'data' && body) {
          handler(JSON.stringify(body));
        }
        if (event === 'end') {
          handler();
        }
      },
    } as unknown as IncomingMessage;

    interface MockResponse {
      _statusCode: number;
      _headers: Record<string, string>;
      setHeader(key: string, value: string): void;
      writeHead(code: number): void;
      end(data: string): void;
    }

    const res: MockResponse = {
      _statusCode: 200,
      _headers: {},
      setHeader: function(key: string, value: string) {
        this._headers[key] = value;
      },
      writeHead: function(code: number) {
        this._statusCode = code;
      },
      end: function(data: string) {
        resolve({
          statusCode: this._statusCode,
          data: data ? JSON.parse(data) : null,
        });
      },
    };

    restApi.handleRequest(req, res as unknown as ServerResponse);
  });
}

describe('A2ACoopRestApi', () => {
  let coop: A2ACoop;
  let restApi: A2ACoopRestApi;

  beforeEach(() => {
    coop = new A2ACoop();
    restApi = new A2ACoopRestApi(coop);
  });

  describe('Agent Endpoints', () => {
    describe('GET /api/agents', () => {
      it('should return empty array when no agents', async () => {
        const response = await makeRequest(restApi, 'GET', '/api/agents');
        
        expect(response.statusCode).toBe(200);
        expect(response.data).toEqual({ agents: [] });
      });

      it('should return all registered agents', async () => {
        coop.registerAgent({
          name: 'Agent1',
          description: 'First agent',
          capabilities: ['task1'],
        });
        coop.registerAgent({
          name: 'Agent2',
          description: 'Second agent',
          capabilities: ['task2'],
        });

        const response = await makeRequest(restApi, 'GET', '/api/agents');
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { agents: unknown[] }).agents).toHaveLength(2);
      });
    });

    describe('POST /api/agents', () => {
      it('should create a new agent', async () => {
        const registration = {
          name: 'TestAgent',
          description: 'A test agent',
          capabilities: ['test'],
        };

        const response = await makeRequest(restApi, 'POST', '/api/agents', registration);
        
        expect(response.statusCode).toBe(201);
        expect((response.data as { agent: { name: string } }).agent.name).toBe('TestAgent');
      });

      it('should return 400 if name is missing', async () => {
        const response = await makeRequest(restApi, 'POST', '/api/agents', {});
        
        expect(response.statusCode).toBe(400);
        expect((response.data as { error: string }).error).toContain('name');
      });
    });

    describe('GET /api/agents/:id', () => {
      it('should return agent by id', async () => {
        const agent = coop.registerAgent({
          name: 'TestAgent',
          description: 'Test',
          capabilities: [],
        });

        const response = await makeRequest(restApi, 'GET', `/api/agents/${agent.id}`);
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { agent: { id: string } }).agent.id).toBe(agent.id);
      });

      it('should return 404 for non-existent agent', async () => {
        const response = await makeRequest(restApi, 'GET', '/api/agents/non-existent');
        
        expect(response.statusCode).toBe(404);
      });
    });

    describe('DELETE /api/agents/:id', () => {
      it('should delete an agent', async () => {
        const agent = coop.registerAgent({
          name: 'TestAgent',
          description: 'Test',
          capabilities: [],
        });

        const response = await makeRequest(restApi, 'DELETE', `/api/agents/${agent.id}`);
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { success: boolean }).success).toBe(true);
        expect(coop.getAgent(agent.id)).toBeUndefined();
      });

      it('should return 404 for non-existent agent', async () => {
        const response = await makeRequest(restApi, 'DELETE', '/api/agents/non-existent');
        
        expect(response.statusCode).toBe(404);
      });
    });
  });

  describe('Task Endpoints', () => {
    let agentId: string;

    beforeEach(() => {
      const agent = coop.registerAgent({
        name: 'TestAgent',
        description: 'Test',
        capabilities: ['research'],
      });
      agentId = agent.id;
    });

    describe('GET /api/tasks', () => {
      it('should return empty array when no tasks', async () => {
        const response = await makeRequest(restApi, 'GET', '/api/tasks');
        
        expect(response.statusCode).toBe(200);
        expect(response.data).toEqual({ tasks: [] });
      });

      it('should return all tasks', async () => {
        coop.createTask({
          type: 'research',
          description: 'Task 1',
          payload: {},
        }, agentId);

        const response = await makeRequest(restApi, 'GET', '/api/tasks');
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { tasks: unknown[] }).tasks).toHaveLength(1);
      });
    });

    describe('POST /api/tasks', () => {
      it('should create a new task', async () => {
        const body = {
          request: {
            type: 'research',
            description: 'Research task',
            payload: { topic: 'AI' },
          },
          createdBy: agentId,
        };

        const response = await makeRequest(restApi, 'POST', '/api/tasks', body);
        
        expect(response.statusCode).toBe(201);
        expect((response.data as { task: { type: string } }).task.type).toBe('research');
      });

      it('should return 400 if required fields are missing', async () => {
        const response = await makeRequest(restApi, 'POST', '/api/tasks', {});
        
        expect(response.statusCode).toBe(400);
      });
    });

    describe('GET /api/tasks/:id', () => {
      it('should return task by id', async () => {
        const task = coop.createTask({
          type: 'research',
          description: 'Test task',
          payload: {},
        }, agentId);

        const response = await makeRequest(restApi, 'GET', `/api/tasks/${task.id}`);
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { task: { id: string } }).task.id).toBe(task.id);
      });

      it('should return 404 for non-existent task', async () => {
        const response = await makeRequest(restApi, 'GET', '/api/tasks/non-existent');
        
        expect(response.statusCode).toBe(404);
      });
    });

    describe('POST /api/tasks/:id/assign', () => {
      it('should assign task to agent', async () => {
        const task = coop.createTask({
          type: 'research',
          description: 'Test task',
          payload: {},
        }, agentId);

        const response = await makeRequest(restApi, 'POST', `/api/tasks/${task.id}/assign`, {
          agentId,
        });
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { success: boolean }).success).toBe(true);
      });

      it('should return 400 if agentId is missing', async () => {
        const task = coop.createTask({
          type: 'research',
          description: 'Test task',
          payload: {},
        }, agentId);

        const response = await makeRequest(restApi, 'POST', `/api/tasks/${task.id}/assign`, {});
        
        expect(response.statusCode).toBe(400);
      });
    });

    describe('POST /api/tasks/:id/start', () => {
      it('should start a task', async () => {
        const task = coop.createTask({
          type: 'research',
          description: 'Test task',
          payload: {},
        }, agentId);
        coop.assignTask(task.id, agentId);

        const response = await makeRequest(restApi, 'POST', `/api/tasks/${task.id}/start`);
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { success: boolean }).success).toBe(true);
      });
    });

    describe('POST /api/tasks/:id/complete', () => {
      it('should complete a task', async () => {
        const task = coop.createTask({
          type: 'research',
          description: 'Test task',
          payload: {},
        }, agentId);
        coop.assignTask(task.id, agentId);
        coop.startTask(task.id);

        const response = await makeRequest(restApi, 'POST', `/api/tasks/${task.id}/complete`, {
          success: true,
          data: { result: 'Done!' },
        });
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { success: boolean }).success).toBe(true);
      });

      it('should return 400 if success field is missing', async () => {
        const task = coop.createTask({
          type: 'research',
          description: 'Test task',
          payload: {},
        }, agentId);

        const response = await makeRequest(restApi, 'POST', `/api/tasks/${task.id}/complete`, {});
        
        expect(response.statusCode).toBe(400);
      });
    });

    describe('POST /api/tasks/:id/cancel', () => {
      it('should cancel a task', async () => {
        const task = coop.createTask({
          type: 'research',
          description: 'Test task',
          payload: {},
        }, agentId);

        const response = await makeRequest(restApi, 'POST', `/api/tasks/${task.id}/cancel`, {
          reason: 'No longer needed',
        });
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { success: boolean }).success).toBe(true);
      });
    });
  });

  describe('Context Endpoints', () => {
    let agentId: string;

    beforeEach(() => {
      const agent = coop.registerAgent({
        name: 'TestAgent',
        description: 'Test',
        capabilities: [],
      });
      agentId = agent.id;
    });

    describe('GET /api/contexts', () => {
      it('should return empty array when no contexts', async () => {
        const response = await makeRequest(restApi, 'GET', '/api/contexts');
        
        expect(response.statusCode).toBe(200);
        expect(response.data).toEqual({ contexts: [] });
      });

      it('should return all contexts', async () => {
        coop.createContext({
          name: 'Project A',
          description: 'Test project',
          initialData: {},
        }, agentId);

        const response = await makeRequest(restApi, 'GET', '/api/contexts');
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { contexts: unknown[] }).contexts).toHaveLength(1);
      });
    });

    describe('POST /api/contexts', () => {
      it('should create a new context', async () => {
        const body = {
          request: {
            name: 'Project B',
            description: 'Another project',
            initialData: { key: 'value' },
          },
          createdBy: agentId,
        };

        const response = await makeRequest(restApi, 'POST', '/api/contexts', body);
        
        expect(response.statusCode).toBe(201);
        expect((response.data as { context: { name: string } }).context.name).toBe('Project B');
      });

      it('should return 400 if required fields are missing', async () => {
        const response = await makeRequest(restApi, 'POST', '/api/contexts', {});
        
        expect(response.statusCode).toBe(400);
      });
    });

    describe('GET /api/contexts/:id', () => {
      it('should return context by id', async () => {
        const context = coop.createContext({
          name: 'Project C',
          description: 'Test',
          initialData: {},
        }, agentId);

        const response = await makeRequest(restApi, 'GET', `/api/contexts/${context.id}`);
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { context: { id: string } }).context.id).toBe(context.id);
      });

      it('should return 404 for non-existent context', async () => {
        const response = await makeRequest(restApi, 'GET', '/api/contexts/non-existent');
        
        expect(response.statusCode).toBe(404);
      });
    });

    describe('PATCH /api/contexts/:id/update', () => {
      it('should update context data', async () => {
        const context = coop.createContext({
          name: 'Project D',
          description: 'Test',
          initialData: { status: 'pending' },
        }, agentId);

        const response = await makeRequest(restApi, 'PATCH', `/api/contexts/${context.id}/update`, {
          updates: { status: 'in_progress' },
          updatedBy: agentId,
        });
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { context: { data: { status: string } } }).context.data.status).toBe('in_progress');
      });

      it('should return 400 if required fields are missing', async () => {
        const context = coop.createContext({
          name: 'Project E',
          description: 'Test',
          initialData: {},
        }, agentId);

        const response = await makeRequest(restApi, 'PATCH', `/api/contexts/${context.id}/update`, {});
        
        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Message Endpoints', () => {
    let agentId1: string;
    let agentId2: string;

    beforeEach(() => {
      agentId1 = coop.registerAgent({
        name: 'Agent1',
        description: 'First',
        capabilities: [],
      }).id;
      agentId2 = coop.registerAgent({
        name: 'Agent2',
        description: 'Second',
        capabilities: [],
      }).id;
    });

    describe('POST /api/messages/send', () => {
      it('should send a direct message', async () => {
        const body = {
          from: agentId1,
          to: agentId2,
          content: 'Hello!',
          data: { priority: 'high' },
        };

        const response = await makeRequest(restApi, 'POST', '/api/messages/send', body);
        
        expect(response.statusCode).toBe(201);
        const msg = (response.data as { message: { payload: { content: string } } }).message;
        expect(msg.payload.content).toBe('Hello!');
      });

      it('should return 400 if required fields are missing', async () => {
        const response = await makeRequest(restApi, 'POST', '/api/messages/send', {});
        
        expect(response.statusCode).toBe(400);
      });
    });

    describe('POST /api/messages/broadcast', () => {
      it('should broadcast a message', async () => {
        const body = {
          from: agentId1,
          event: 'announcement',
          data: { message: 'System update' },
        };

        const response = await makeRequest(restApi, 'POST', '/api/messages/broadcast', body);
        
        expect(response.statusCode).toBe(201);
        const msg = (response.data as { message: { payload: { event: string } } }).message;
        expect(msg.payload.event).toBe('announcement');
      });

      it('should return 400 if required fields are missing', async () => {
        const response = await makeRequest(restApi, 'POST', '/api/messages/broadcast', {});
        
        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Status Endpoints', () => {
    describe('GET /api/status', () => {
      it('should return system status', async () => {
        const response = await makeRequest(restApi, 'GET', '/api/status');
        
        expect(response.statusCode).toBe(200);
        expect((response.data as { status: { agents: number } }).status).toHaveProperty('agents');
        expect((response.data as { status: { tasks: unknown } }).status).toHaveProperty('tasks');
        expect((response.data as { status: { contexts: number } }).status).toHaveProperty('contexts');
        expect((response.data as { status: { messages: number } }).status).toHaveProperty('messages');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown paths', async () => {
      const response = await makeRequest(restApi, 'GET', '/api/unknown');
      
      expect(response.statusCode).toBe(404);
    });

    it('should handle CORS preflight', async () => {
      const req = {
        method: 'OPTIONS',
        url: '/api/agents',
        headers: { host: 'localhost:8080' },
        on: () => {},
      } as unknown as IncomingMessage;

      interface MockResponse {
        _statusCode: number;
        _headers: Record<string, string>;
        setHeader(key: string, value: string): void;
        writeHead(code: number): void;
        end(): void;
      }

      const res: MockResponse = {
        _statusCode: 0,
        _headers: {},
        setHeader: function(key: string, value: string) {
          this._headers[key] = value;
        },
        writeHead: function(code: number) {
          this._statusCode = code;
        },
        end: function() {},
      };

      restApi.handleRequest(req, res as unknown as ServerResponse);
      
      expect(res._statusCode).toBe(200);
    });
  });
});
