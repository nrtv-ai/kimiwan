import { Message, MessageId, AgentId, MessageType, MessagePayload, BusEventType, EventHandler } from './types';
/**
 * MessageBus handles all inter-agent communication.
 *
 * It supports:
 * - Direct messages (agent-to-agent)
 * - Broadcasts (agent-to-all)
 * - Topic-based subscriptions
 * - Event-driven architecture
 */
export declare class MessageBus {
    private messages;
    private handlers;
    private agentSubscriptions;
    private messageHistory;
    private maxHistorySize;
    constructor(options?: {
        maxHistorySize?: number;
    });
    /**
     * Send a message from one agent to another (or broadcast)
     */
    send(from: AgentId, type: MessageType, payload: MessagePayload, to?: AgentId): Message;
    /**
     * Send a direct message
     */
    sendDirect(from: AgentId, to: AgentId, content: string, data?: Record<string, unknown>): Message;
    /**
     * Broadcast a message to all agents
     */
    broadcast(from: AgentId, event: string, data: Record<string, unknown>): Message;
    /**
     * Subscribe to a specific event type
     */
    subscribe<T>(eventType: BusEventType | string, handler: EventHandler<T>): () => void;
    /**
     * Subscribe an agent to receive messages
     */
    subscribeAgent(agentId: AgentId, handler: EventHandler<Message>): () => void;
    /**
     * Get message by ID
     */
    get(messageId: MessageId): Message | undefined;
    /**
     * Get all messages
     */
    getAll(): Message[];
    /**
     * Get messages for a specific agent (sent or received)
     */
    getMessagesForAgent(agentId: AgentId): Message[];
    /**
     * Get messages between two agents
     */
    getMessagesBetween(agentA: AgentId, agentB: AgentId): Message[];
    /**
     * Get recent message history
     */
    getHistory(limit?: number): Message[];
    /**
     * Clear message history
     */
    clearHistory(): void;
    private addToHistory;
    private emit;
    private emitToAgent;
}
//# sourceMappingURL=bus.d.ts.map