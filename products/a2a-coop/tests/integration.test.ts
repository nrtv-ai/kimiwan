import { A2ACoop } from '../src/index';

describe('A2ACoop Integration', () => {
  let coop: A2ACoop;

  beforeEach(() => {
    coop = new A2ACoop();
  });

  describe('full workflow', () => {
    it('should execute a complete agent collaboration workflow', () => {
      // 1. Register agents
      const researchAgent = coop.registerAgent({
        name: 'ResearchBot',
        description: 'Does research',
        capabilities: ['research'],
      });

      const writerAgent = coop.registerAgent({
        name: 'WriterBot',
        description: 'Writes content',
        capabilities: ['write'],
      });

      expect(coop.getAllAgents()).toHaveLength(2);

      // 2. Create shared context
      const context = coop.createContext(
        {
          name: 'Project',
          description: 'Test project',
          initialData: { topic: 'AI' },
        },
        researchAgent.id
      );

      expect(coop.getContext(context.id)?.data.topic).toBe('AI');

      // 3. Create and execute task
      const task = coop.createTask(
        {
          type: 'research',
          description: 'Research AI trends',
          payload: {},
          contextId: context.id,
          requiredCapabilities: ['research'],
        },
        researchAgent.id
      );

      expect(task.assignedTo).toBe(researchAgent.id);
      expect(task.status).toBe('assigned');

      // 4. Complete task
      coop.startTask(task.id);
      coop.completeTask(task.id, {
        success: true,
        data: { findings: ['trend1', 'trend2'] },
        logs: ['Researched sources'],
      });

      expect(coop.getTask(task.id)?.status).toBe('completed');

      // 5. Send messages
      const message = coop.sendMessage(researchAgent.id, writerAgent.id, 'Research done!');
      expect(message.from).toBe(researchAgent.id);

      // 6. Check status
      const status = coop.getStatus();
      expect(status.agents).toBe(2);
      expect(status.tasks.completed).toBe(1);
      expect(status.contexts).toBe(1);
      expect(status.messages).toBeGreaterThanOrEqual(1); // Includes task messages
    });

    it('should support agent messaging', () => {
      const agentA = coop.registerAgent({ name: 'A', description: '', capabilities: [] });
      const agentB = coop.registerAgent({ name: 'B', description: '', capabilities: [] });

      const messages: string[] = [];
      
      coop.subscribeToMessages(agentB.id, (msg) => {
        if (msg.payload.kind === 'direct') {
          messages.push(msg.payload.content);
        }
      });

      coop.sendMessage(agentA.id, agentB.id, 'Hello!');
      coop.sendMessage(agentA.id, agentB.id, 'How are you?');

      expect(messages).toEqual(['Hello!', 'How are you?']);
    });

    it('should support broadcasts', () => {
      const agentA = coop.registerAgent({ name: 'A', description: '', capabilities: [] });
      const agentB = coop.registerAgent({ name: 'B', description: '', capabilities: [] });
      const agentC = coop.registerAgent({ name: 'C', description: '', capabilities: [] });

      const received: string[] = [];

      coop.subscribeToMessages(agentB.id, (msg) => {
        if (msg.payload.kind === 'broadcast') {
          received.push(`B:${msg.payload.event}`);
        }
      });

      coop.subscribeToMessages(agentC.id, (msg) => {
        if (msg.payload.kind === 'broadcast') {
          received.push(`C:${msg.payload.event}`);
        }
      });

      coop.broadcastMessage(agentA.id, 'announcement', { msg: 'Hello all' });

      expect(received).toContain('B:announcement');
      expect(received).toContain('C:announcement');
    });

    it('should find agents by capabilities', () => {
      coop.registerAgent({ name: 'Researcher', description: '', capabilities: ['research', 'analyze'] });
      coop.registerAgent({ name: 'Writer', description: '', capabilities: ['write', 'edit'] });
      coop.registerAgent({ name: 'Multi', description: '', capabilities: ['research', 'write'] });

      const researchers = coop.findAgentsByCapabilities(['research', 'analyze'], true);
      expect(researchers).toHaveLength(1);
      expect(researchers[0].name).toBe('Researcher');

      const anyResearch = coop.findAgentsByCapabilities(['research'], false);
      expect(anyResearch).toHaveLength(2);
    });
  });
});
