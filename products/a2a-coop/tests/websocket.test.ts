import { A2ACoopServer } from '../src/server';
import { A2ACoopClient } from '../src/client';

describe('WebSocket Integration', () => {
  let server: A2ACoopServer;
  let client: A2ACoopClient;
  const port = 9999;

  beforeAll(async () => {
    server = new A2ACoopServer(port);
    server.start();
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    client = new A2ACoopClient(`ws://localhost:${port}`);
    await client.connect();
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('Agent Operations', () => {
    it('should register an agent', async () => {
      const agent = await client.registerAgent({
        name: 'TestAgent',
        description: 'A test agent',
        capabilities: ['test'],
      });

      expect(agent.name).toBe('TestAgent');
      expect(agent.capabilities).toContain('test');
      expect(agent.status).toBe('idle');
    });

    it('should list agents', async () => {
      await client.registerAgent({
        name: 'Agent1',
        description: '',
        capabilities: ['cap1'],
      });

      await client.registerAgent({
        name: 'Agent2',
        description: '',
        capabilities: ['cap2'],
      });

      const agents = await client.listAgents();
      expect(agents.length).toBeGreaterThanOrEqual(2);
    });

    it('should get an agent by ID', async () => {
      const agent = await client.registerAgent({
        name: 'GetTest',
        description: '',
        capabilities: [],
      });

      const fetched = await client.getAgent(agent.id);
      expect(fetched?.id).toBe(agent.id);
      expect(fetched?.name).toBe('GetTest');
    });

    it('should unregister an agent', async () => {
      const agent = await client.registerAgent({
        name: 'UnregisterTest',
        description: '',
        capabilities: [],
      });

      const success = await client.unregisterAgent(agent.id);
      expect(success).toBe(true);

      const fetched = await client.getAgent(agent.id);
      expect(fetched).toBeUndefined();
    });
  });

  describe('Task Operations', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await client.registerAgent({
        name: 'TaskAgent',
        description: '',
        capabilities: ['test'],
      });
      agentId = agent.id;
    });

    it('should create a task', async () => {
      const task = await client.createTask(
        {
          type: 'test',
          description: 'Test task',
          payload: { key: 'value' },
        },
        agentId
      );

      expect(task.type).toBe('test');
      expect(task.description).toBe('Test task');
      expect(task.status).toBe('pending');
      expect(task.createdBy).toBe(agentId);
    });

    it('should assign a task', async () => {
      const task = await client.createTask(
        {
          type: 'test',
          description: 'Test task',
          payload: {},
        },
        agentId
      );

      const success = await client.assignTask(task.id, agentId);
      expect(success).toBe(true);

      const updated = await client.getTask(task.id);
      expect(updated?.status).toBe('assigned');
      expect(updated?.assignedTo).toBe(agentId);
    });

    it('should complete a task', async () => {
      const task = await client.createTask(
        {
          type: 'test',
          description: 'Test task',
          payload: {},
        },
        agentId
      );

      await client.assignTask(task.id, agentId);
      await client.startTask(task.id);

      const success = await client.completeTask(task.id, {
        success: true,
        data: { result: 'done' },
        logs: ['Step 1', 'Step 2'],
      });

      expect(success).toBe(true);

      const updated = await client.getTask(task.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.result?.success).toBe(true);
    });

    it('should list tasks', async () => {
      await client.createTask(
        { type: 'test', description: 'Task 1', payload: {} },
        agentId
      );

      await client.createTask(
        { type: 'test', description: 'Task 2', payload: {} },
        agentId
      );

      const tasks = await client.listTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Context Operations', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await client.registerAgent({
        name: 'ContextAgent',
        description: '',
        capabilities: [],
      });
      agentId = agent.id;
    });

    it('should create a context', async () => {
      const context = await client.createContext(
        {
          name: 'TestContext',
          description: 'A test context',
          initialData: { key: 'value' },
        },
        agentId
      );

      expect(context.name).toBe('TestContext');
      expect(context.data.key).toBe('value');
      expect(context.participants).toContain(agentId);
    });

    it('should update a context', async () => {
      const context = await client.createContext(
        {
          name: 'UpdateContext',
          description: '',
        },
        agentId
      );

      const updated = await client.updateContext(
        context.id,
        { newKey: 'newValue' },
        agentId
      );

      expect(updated?.data.newKey).toBe('newValue');
      expect(updated?.data).toHaveProperty('newKey');
    });

    it('should list contexts', async () => {
      await client.createContext({ name: 'Context1', description: '' }, agentId);
      await client.createContext({ name: 'Context2', description: '' }, agentId);

      const contexts = await client.listContexts();
      expect(contexts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Message Operations', () => {
    let agent1Id: string;
    let agent2Id: string;

    beforeEach(async () => {
      const agent1 = await client.registerAgent({
        name: 'Agent1',
        description: '',
        capabilities: [],
      });
      agent1Id = agent1.id;

      const agent2 = await client.registerAgent({
        name: 'Agent2',
        description: '',
        capabilities: [],
      });
      agent2Id = agent2.id;
    });

    it('should send a direct message', async () => {
      const message = await client.sendMessage(agent1Id, agent2Id, 'Hello!', {
        extra: 'data',
      });

      expect(message.type).toBe('direct');
      expect(message.from).toBe(agent1Id);
      expect(message.to).toBe(agent2Id);
    });

    it('should broadcast a message', async () => {
      const message = await client.broadcastMessage(agent1Id, 'announcement', {
        text: 'Hello everyone!',
      });

      expect(message.type).toBe('broadcast');
      expect(message.from).toBe(agent1Id);
    });
  });

  describe('Status', () => {
    it('should get system status', async () => {
      const status = await client.getStatus();

      expect(status).toHaveProperty('agents');
      expect(status).toHaveProperty('tasks');
      expect(status).toHaveProperty('contexts');
      expect(status).toHaveProperty('messages');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown agent', async () => {
      const agent = await client.getAgent('non-existent-id');
      expect(agent).toBeUndefined();
    });

    it('should handle unknown task', async () => {
      const task = await client.getTask('non-existent-id');
      expect(task).toBeUndefined();
    });
  });
});
