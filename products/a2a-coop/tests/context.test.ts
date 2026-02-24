import { ContextStore } from '../src/context';

describe('ContextStore', () => {
  let store: ContextStore;
  const agentId = 'agent-1';

  beforeEach(() => {
    store = new ContextStore();
  });

  describe('create', () => {
    it('should create a new context', () => {
      const context = store.create(
        { name: 'Test', description: 'Test context' },
        agentId
      );

      expect(context.name).toBe('Test');
      expect(context.description).toBe('Test context');
      expect(context.participants).toContain(agentId);
      expect(context.id).toBeDefined();
    });

    it('should create context with initial data', () => {
      const context = store.create(
        { name: 'Test', description: '', initialData: { key: 'value' } },
        agentId
      );

      expect(context.data.key).toBe('value');
    });
  });

  describe('get', () => {
    it('should retrieve a context by ID', () => {
      const context = store.create({ name: 'Test', description: '' }, agentId);
      const retrieved = store.get(context.id);

      expect(retrieved).toEqual(context);
    });

    it('should return undefined for unknown ID', () => {
      expect(store.get('unknown')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update context data', () => {
      const context = store.create({ name: 'Test', description: '' }, agentId);
      
      const updated = store.update(context.id, { newKey: 'newValue' }, agentId);

      expect(updated?.data.newKey).toBe('newValue');
    });

    it('should deep merge nested objects', () => {
      const context = store.create(
        { name: 'Test', description: '', initialData: { nested: { a: 1 } } },
        agentId
      );
      
      store.update(context.id, { nested: { b: 2 } }, agentId);

      expect(store.get(context.id)?.data.nested).toEqual({ a: 1, b: 2 });
    });

    it('should add updater to participants', () => {
      const context = store.create({ name: 'Test', description: '' }, agentId);
      const otherAgent = 'agent-2';
      
      store.update(context.id, { key: 'value' }, otherAgent);

      expect(store.get(context.id)?.participants).toContain(otherAgent);
    });
  });

  describe('setValue / getValue', () => {
    it('should set and get a specific value', () => {
      const context = store.create({ name: 'Test', description: '' }, agentId);
      
      store.setValue(context.id, 'myKey', 'myValue', agentId);

      expect(store.getValue(context.id, 'myKey')).toBe('myValue');
    });

    it('should return default value for missing key', () => {
      const context = store.create({ name: 'Test', description: '' }, agentId);
      
      expect(store.getValue(context.id, 'missing', 'default')).toBe('default');
    });
  });

  describe('participants', () => {
    it('should add participant', () => {
      const context = store.create({ name: 'Test', description: '' }, agentId);
      const newAgent = 'agent-2';
      
      store.addParticipant(context.id, newAgent);

      expect(store.get(context.id)?.participants).toContain(newAgent);
    });

    it('should remove participant', () => {
      const context = store.create({ name: 'Test', description: '' }, agentId);
      const otherAgent = 'agent-2';
      store.addParticipant(context.id, otherAgent);
      
      store.removeParticipant(context.id, otherAgent);

      expect(store.get(context.id)?.participants).not.toContain(otherAgent);
    });
  });

  describe('getContextsForAgent', () => {
    it('should return contexts agent participates in', () => {
      const ctx1 = store.create({ name: 'Ctx1', description: '' }, agentId);
      const ctx2 = store.create({ name: 'Ctx2', description: '' }, agentId);
      store.create({ name: 'Ctx3', description: '' }, 'other-agent' );

      const contexts = store.getContextsForAgent(agentId);

      expect(contexts).toHaveLength(2);
      expect(contexts.map(c => c.name)).toContain('Ctx1');
      expect(contexts.map(c => c.name)).toContain('Ctx2');
    });
  });

  describe('search', () => {
    it('should search by name', () => {
      store.create({ name: 'Project Alpha', description: '' }, agentId);
      store.create({ name: 'Project Beta', description: '' }, agentId);
      store.create({ name: 'Other', description: '' }, agentId);

      const results = store.search('Project');

      expect(results).toHaveLength(2);
    });

    it('should search by description', () => {
      store.create({ name: 'A', description: 'Important task' }, agentId);
      store.create({ name: 'B', description: 'Another important' }, agentId);

      const results = store.search('important');

      expect(results).toHaveLength(2);
    });
  });

  describe('parent/child contexts', () => {
    it('should create child context', () => {
      const parent = store.create({ name: 'Parent', description: '' }, agentId);
      
      const child = store.createChild(parent.id, { name: 'Child', description: '' }, agentId);

      expect(child?.parentContextId).toBe(parent.id);
    });

    it('should get child contexts', () => {
      const parent = store.create({ name: 'Parent', description: '' }, agentId);
      store.createChild(parent.id, { name: 'Child1', description: '' }, agentId);
      store.createChild(parent.id, { name: 'Child2', description: '' }, agentId);

      const children = store.getChildren(parent.id);

      expect(children).toHaveLength(2);
    });

    it('should delete children when parent is deleted', () => {
      const parent = store.create({ name: 'Parent', description: '' }, agentId);
      const child = store.createChild(parent.id, { name: 'Child', description: '' }, agentId);

      store.delete(parent.id);

      expect(store.get(child!.id)).toBeUndefined();
    });
  });

  describe('events', () => {
    it('should emit context_created event', () => {
      const handler = jest.fn();
      store.on('context_created', handler);

      store.create({ name: 'Test', description: '' }, agentId);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit context_updated event', () => {
      const handler = jest.fn();
      const context = store.create({ name: 'Test', description: '' }, agentId);
      
      store.on('context_updated', handler);
      store.update(context.id, { key: 'value' }, agentId);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
