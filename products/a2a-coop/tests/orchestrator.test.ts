import { TaskOrchestrator } from '../src/orchestrator';
import { AgentRegistry } from '../src/registry';
import { MessageBus } from '../src/bus';
import { TaskRequest } from '../src/types';

describe('TaskOrchestrator', () => {
  let orchestrator: TaskOrchestrator;
  let registry: AgentRegistry;
  let bus: MessageBus;
  let agentId: string;

  beforeEach(() => {
    registry = new AgentRegistry();
    bus = new MessageBus();
    orchestrator = new TaskOrchestrator(registry, bus);

    const agent = registry.register({
      name: 'TestAgent',
      description: '',
      capabilities: ['test'],
    });
    agentId = agent.id;
  });

  describe('create', () => {
    it('should create a new task', () => {
      const request: TaskRequest = {
        type: 'test',
        description: 'Test task',
        payload: {},
      };

      const task = orchestrator.create(request, agentId);

      expect(task.type).toBe('test');
      expect(task.description).toBe('Test task');
      expect(task.status).toBe('pending');
      expect(task.createdBy).toBe(agentId);
    });

    it('should auto-assign when capabilities specified', () => {
      const request: TaskRequest = {
        type: 'test',
        description: 'Test task',
        payload: {},
        requiredCapabilities: ['test'],
      };

      const task = orchestrator.create(request, agentId);

      expect(task.assignedTo).toBe(agentId);
      expect(task.status).toBe('assigned');
    });
  });

  describe('assign', () => {
    it('should assign a task to an agent', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      
      orchestrator.assign(task.id, agentId);
      
      expect(orchestrator.get(task.id)?.assignedTo).toBe(agentId);
      expect(orchestrator.get(task.id)?.status).toBe('assigned');
    });

    it('should update agent status to busy', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      
      orchestrator.assign(task.id, agentId);
      
      expect(registry.get(agentId)?.status).toBe('busy');
    });
  });

  describe('start', () => {
    it('should mark task as in_progress', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      orchestrator.assign(task.id, agentId);
      
      const result = orchestrator.start(task.id);
      
      expect(result).toBe(true);
      expect(orchestrator.get(task.id)?.status).toBe('in_progress');
    });

    it('should fail if task not assigned', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      
      const result = orchestrator.start(task.id);
      
      expect(result).toBe(false);
    });
  });

  describe('complete', () => {
    it('should mark task as completed', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      orchestrator.assign(task.id, agentId);
      orchestrator.start(task.id);
      
      const result = orchestrator.complete(task.id, {
        success: true,
        data: { result: 'done' },
        logs: [],
        artifacts: [],
      });
      
      expect(result).toBe(true);
      expect(orchestrator.get(task.id)?.status).toBe('completed');
      expect(orchestrator.get(task.id)?.result?.success).toBe(true);
    });

    it('should mark task as failed when success is false', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      orchestrator.assign(task.id, agentId);
      orchestrator.start(task.id);
      
      orchestrator.complete(task.id, {
        success: false,
        error: 'Something went wrong',
        logs: [],
        artifacts: [],
      });
      
      expect(orchestrator.get(task.id)?.status).toBe('failed');
    });

    it('should free up agent after completion', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      orchestrator.assign(task.id, agentId);
      orchestrator.start(task.id);
      
      orchestrator.complete(task.id, { success: true, logs: [], artifacts: [] });
      
      expect(registry.get(agentId)?.status).toBe('idle');
    });
  });

  describe('cancel', () => {
    it('should cancel a pending task', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      
      const result = orchestrator.cancel(task.id, 'No longer needed');
      
      expect(result).toBe(true);
      expect(orchestrator.get(task.id)?.status).toBe('cancelled');
    });

    it('should not cancel already completed tasks', () => {
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      orchestrator.assign(task.id, agentId);
      orchestrator.start(task.id);
      orchestrator.complete(task.id, { success: true, logs: [], artifacts: [] });
      
      const result = orchestrator.cancel(task.id);
      
      expect(result).toBe(false);
    });
  });

  describe('subtasks', () => {
    it('should create subtasks', () => {
      const parent = orchestrator.create({ type: 'parent', description: 'Parent', payload: {} }, agentId);
      
      const subtask = orchestrator.createSubtask(
        parent.id,
        { type: 'sub', description: 'Subtask', payload: {} },
        agentId
      );
      
      expect(subtask?.parentTaskId).toBe(parent.id);
      expect(orchestrator.get(parent.id)?.subtasks).toContain(subtask?.id);
    });

    it('should return undefined for non-existent parent', () => {
      const subtask = orchestrator.createSubtask(
        'non-existent',
        { type: 'sub', description: 'Subtask', payload: {} },
        agentId
      );
      
      expect(subtask).toBeUndefined();
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      const t1 = orchestrator.create({ type: 'test', description: 'Task 1', payload: {} }, agentId);
      const t2 = orchestrator.create({ type: 'test', description: 'Task 2', payload: {} }, agentId);
      orchestrator.assign(t1.id, agentId);
      orchestrator.assign(t2.id, agentId);
    });

    it('should get tasks by status', () => {
      const assigned = orchestrator.getByStatus('assigned');
      expect(assigned).toHaveLength(2);
    });

    it('should get tasks by agent', () => {
      const tasks = orchestrator.getByAgent(agentId);
      expect(tasks).toHaveLength(2);
    });

    it('should get tasks by creator', () => {
      const tasks = orchestrator.getByCreator(agentId);
      expect(tasks).toHaveLength(2);
    });
  });

  describe('events', () => {
    it('should emit task_created event', () => {
      const handler = jest.fn();
      orchestrator.on('task_created', handler);

      orchestrator.create({ type: 'test', description: 'Test', payload: {} }, agentId);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit task_completed event', () => {
      const handler = jest.fn();
      const task = orchestrator.create({ type: 'test', description: '', payload: {} }, agentId);
      orchestrator.assign(task.id, agentId);
      orchestrator.start(task.id);
      
      orchestrator.on('task_completed', handler);
      orchestrator.complete(task.id, { success: true, logs: [], artifacts: [] });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
