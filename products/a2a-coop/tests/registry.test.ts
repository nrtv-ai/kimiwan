import { AgentRegistry } from '../src/registry';
import { AgentRegistration } from '../src/types';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register', () => {
    it('should register a new agent', () => {
      const registration: AgentRegistration = {
        name: 'TestAgent',
        description: 'A test agent',
        capabilities: ['test', 'mock'],
      };

      const agent = registry.register(registration);

      expect(agent.name).toBe('TestAgent');
      expect(agent.capabilities).toEqual(['test', 'mock']);
      expect(agent.status).toBe('idle');
      expect(agent.id).toBeDefined();
    });

    it('should assign unique IDs to each agent', () => {
      const agent1 = registry.register({ name: 'Agent1', description: '', capabilities: [] });
      const agent2 = registry.register({ name: 'Agent2', description: '', capabilities: [] });

      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('get', () => {
    it('should retrieve an agent by ID', () => {
      const agent = registry.register({ name: 'TestAgent', description: '', capabilities: [] });
      const retrieved = registry.get(agent.id);

      expect(retrieved).toEqual(agent);
    });

    it('should return undefined for unknown ID', () => {
      const retrieved = registry.get('unknown-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('findByCapabilities', () => {
    beforeEach(() => {
      registry.register({ name: 'ResearchAgent', description: '', capabilities: ['research', 'analyze'] });
      registry.register({ name: 'WriteAgent', description: '', capabilities: ['write', 'edit'] });
      registry.register({ name: 'MultiAgent', description: '', capabilities: ['research', 'write'] });
    });

    it('should find agents with any of the specified capabilities (matchAll=false)', () => {
      const agents = registry.findByCapabilities({ capabilities: ['research'], matchAll: false });
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.name)).toContain('ResearchAgent');
      expect(agents.map(a => a.name)).toContain('MultiAgent');
    });

    it('should find agents with all specified capabilities (matchAll=true)', () => {
      const agents = registry.findByCapabilities({ capabilities: ['research', 'write'], matchAll: true });
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('MultiAgent');
    });

    it('should return empty array when no matches found', () => {
      const agents = registry.findByCapabilities({ capabilities: ['unknown'], matchAll: false });
      expect(agents).toHaveLength(0);
    });
  });

  describe('updateStatus', () => {
    it('should update agent status', () => {
      const agent = registry.register({ name: 'TestAgent', description: '', capabilities: [] });
      
      const result = registry.updateStatus(agent.id, 'busy');
      
      expect(result).toBe(true);
      expect(registry.get(agent.id)?.status).toBe('busy');
    });

    it('should return false for unknown agent', () => {
      const result = registry.updateStatus('unknown-id', 'busy');
      expect(result).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove an agent', () => {
      const agent = registry.register({ name: 'TestAgent', description: '', capabilities: [] });
      
      const result = registry.unregister(agent.id);
      
      expect(result).toBe(true);
      expect(registry.get(agent.id)).toBeUndefined();
    });

    it('should return false for unknown agent', () => {
      const result = registry.unregister('unknown-id');
      expect(result).toBe(false);
    });
  });

  describe('events', () => {
    it('should emit agent_registered event', () => {
      const handler = jest.fn();
      registry.on('agent_registered', handler);

      registry.register({ name: 'TestAgent', description: '', capabilities: [] });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.name).toBe('TestAgent');
    });

    it('should emit agent_status_changed event', () => {
      const handler = jest.fn();
      const agent = registry.register({ name: 'TestAgent', description: '', capabilities: [] });
      
      registry.on('agent_status_changed', handler);
      registry.updateStatus(agent.id, 'busy');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.agent.status).toBe('busy');
    });
  });
});
