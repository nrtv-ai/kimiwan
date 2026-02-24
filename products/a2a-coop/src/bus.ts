import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageId,
  AgentId,
  MessageType,
  MessagePayload,
  BusEvent,
  BusEventType,
  EventHandler,
} from './types';

/**
 * MessageBus handles all inter-agent communication.
 * 
 * It supports:
 * - Direct messages (agent-to-agent)
 * - Broadcasts (agent-to-all)
 * - Topic-based subscriptions
 * - Event-driven architecture
 */
export class MessageBus {
  private messages: Map<MessageId, Message> = new Map();
  private handlers: Map<BusEventType | string, Set<EventHandler<unknown>>> = new Map();
  private agentSubscriptions: Map<AgentId, Set<string>> = new Map();
  private messageHistory: Message[] = [];
  private maxHistorySize: number;

  constructor(options: { maxHistorySize?: number } = {}) {
    this.maxHistorySize = options.maxHistorySize || 1000;
  }

  /**
   * Send a message from one agent to another (or broadcast)
   */
  send(from: AgentId, type: MessageType, payload: MessagePayload, to?: AgentId): Message {
    const message: Message = {
      id: uuidv4(),
      type,
      from,
      to,
      payload,
      timestamp: new Date(),
    };

    this.messages.set(message.id, message);
    this.addToHistory(message);

    // Emit specific event type
    this.emit('message_received', message);

    // Emit to specific agent subscribers
    if (to) {
      this.emitToAgent(to, message);
    }

    // Emit to type-specific subscribers
    this.emit(`message:${type}`, message);

    return message;
  }

  /**
   * Send a direct message
   */
  sendDirect(from: AgentId, to: AgentId, content: string, data?: Record<string, unknown>): Message {
    return this.send(from, 'direct', { kind: 'direct', content, data }, to);
  }

  /**
   * Broadcast a message to all agents
   */
  broadcast(from: AgentId, event: string, data: Record<string, unknown>): Message {
    return this.send(from, 'broadcast', { kind: 'broadcast', event, data });
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe<T>(eventType: BusEventType | string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler<unknown>);

    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler<unknown>);
    };
  }

  /**
   * Subscribe an agent to receive messages
   */
  subscribeAgent(agentId: AgentId, handler: EventHandler<Message>): () => void {
    if (!this.agentSubscriptions.has(agentId)) {
      this.agentSubscriptions.set(agentId, new Set());
    }

    const wrappedHandler = (event: BusEvent) => {
      const message = event.payload as Message;
      // Only deliver if message is for this agent or is a broadcast
      if (!message.to || message.to === agentId) {
        handler(event as BusEvent & { payload: Message });
      }
    };

    this.agentSubscriptions.get(agentId)!.add(agentId);
    
    // Subscribe to message_received events
    const unsubscribe = this.subscribe('message_received', wrappedHandler);

    return () => {
      unsubscribe();
      this.agentSubscriptions.get(agentId)?.delete(agentId);
    };
  }

  /**
   * Get message by ID
   */
  get(messageId: MessageId): Message | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Get all messages
   */
  getAll(): Message[] {
    return Array.from(this.messages.values());
  }

  /**
   * Get messages for a specific agent (sent or received)
   */
  getMessagesForAgent(agentId: AgentId): Message[] {
    return this.getAll().filter(
      msg => msg.from === agentId || msg.to === agentId || (!msg.to && msg.type === 'broadcast')
    );
  }

  /**
   * Get messages between two agents
   */
  getMessagesBetween(agentA: AgentId, agentB: AgentId): Message[] {
    return this.getAll().filter(
      msg => 
        (msg.from === agentA && msg.to === agentB) ||
        (msg.from === agentB && msg.to === agentA)
    );
  }

  /**
   * Get recent message history
   */
  getHistory(limit: number = 100): Message[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.messages.clear();
  }

  private addToHistory(message: Message): void {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  private emit(eventType: BusEventType | string, payload: unknown): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const event: BusEvent = {
        type: eventType as BusEventType,
        timestamp: new Date(),
        payload,
      };
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`Error in message bus handler for ${eventType}:`, err);
        }
      }
    }
  }

  private emitToAgent(agentId: AgentId, message: Message): void {
    // This is handled by the agent subscription logic in subscribeAgent
    // The wrapped handler filters messages appropriately
  }
}
