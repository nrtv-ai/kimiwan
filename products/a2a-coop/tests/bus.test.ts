import { MessageBus } from '../src/bus';
import { MessageType } from '../src/types';

describe('MessageBus', () => {
  let bus: MessageBus;
  const agentA = 'agent-a';
  const agentB = 'agent-b';

  beforeEach(() => {
    bus = new MessageBus();
  });

  describe('send', () => {
    it('should send a direct message', () => {
      const message = bus.send(
        agentA,
        'direct' as MessageType,
        { kind: 'direct', content: 'Hello', data: {} },
        agentB
      );

      expect(message.from).toBe(agentA);
      expect(message.to).toBe(agentB);
      expect(message.type).toBe('direct');
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should send a broadcast message', () => {
      const message = bus.broadcast(agentA, 'test_event', { foo: 'bar' });

      expect(message.from).toBe(agentA);
      expect(message.to).toBeUndefined();
      expect(message.type).toBe('broadcast');
    });

    it('should store messages', () => {
      bus.sendDirect(agentA, agentB, 'Test message');
      
      expect(bus.getAll()).toHaveLength(1);
    });
  });

  describe('subscribe', () => {
    it('should receive subscribed events', () => {
      const handler = jest.fn();
      bus.subscribe('message_received', handler);

      bus.sendDirect(agentA, agentB, 'Test');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should filter by message type', () => {
      const directHandler = jest.fn();
      const broadcastHandler = jest.fn();
      
      bus.subscribe('message:direct', directHandler);
      bus.subscribe('message:broadcast', broadcastHandler);

      bus.sendDirect(agentA, agentB, 'Direct');
      bus.broadcast(agentA, 'event', {});

      expect(directHandler).toHaveBeenCalledTimes(1);
      expect(broadcastHandler).toHaveBeenCalledTimes(1);
    });

    it('should support unsubscribe', () => {
      const handler = jest.fn();
      const unsubscribe = bus.subscribe('message_received', handler);

      bus.sendDirect(agentA, agentB, 'Test 1');
      unsubscribe();
      bus.sendDirect(agentA, agentB, 'Test 2');

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeAgent', () => {
    it('should deliver messages to subscribed agent', () => {
      const handler = jest.fn();
      bus.subscribeAgent(agentB, handler);

      bus.sendDirect(agentA, agentB, 'Hello');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].payload.from).toBe(agentA);
    });

    it('should not deliver other agents messages', () => {
      const handler = jest.fn();
      bus.subscribeAgent(agentB, handler);

      bus.sendDirect(agentA, 'agent-c', 'Hello');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should deliver broadcasts to all agents', () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      
      bus.subscribeAgent(agentA, handlerA);
      bus.subscribeAgent(agentB, handlerB);

      bus.broadcast(agentA, 'announcement', { msg: 'Hello all' });

      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMessagesForAgent', () => {
    it('should return messages sent to or from an agent', () => {
      bus.sendDirect(agentA, agentB, 'A to B');
      bus.sendDirect(agentB, agentA, 'B to A');
      bus.sendDirect(agentA, 'agent-c', 'A to C');

      const agentAMessages = bus.getMessagesForAgent(agentA);
      expect(agentAMessages).toHaveLength(3);

      const agentBMessages = bus.getMessagesForAgent(agentB);
      expect(agentBMessages).toHaveLength(2);
    });
  });

  describe('getMessagesBetween', () => {
    it('should return only messages between two agents', () => {
      bus.sendDirect(agentA, agentB, 'Message 1');
      bus.sendDirect(agentB, agentA, 'Message 2');
      bus.sendDirect(agentA, 'agent-c', 'Other');

      const messages = bus.getMessagesBetween(agentA, agentB);
      expect(messages).toHaveLength(2);
    });
  });

  describe('history', () => {
    it('should maintain message history', () => {
      bus.sendDirect(agentA, agentB, '1');
      bus.sendDirect(agentA, agentB, '2');
      bus.sendDirect(agentA, agentB, '3');

      const history = bus.getHistory(2);
      expect(history).toHaveLength(2);
    });

    it('should respect max history size', () => {
      const limitedBus = new MessageBus({ maxHistorySize: 2 });
      
      limitedBus.sendDirect(agentA, agentB, '1');
      limitedBus.sendDirect(agentA, agentB, '2');
      limitedBus.sendDirect(agentA, agentB, '3');

      expect(limitedBus.getHistory()).toHaveLength(2);
    });
  });
});
