"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBus = void 0;
const uuid_1 = require("uuid");
/**
 * MessageBus handles all inter-agent communication.
 *
 * It supports:
 * - Direct messages (agent-to-agent)
 * - Broadcasts (agent-to-all)
 * - Topic-based subscriptions
 * - Event-driven architecture
 */
class MessageBus {
    messages = new Map();
    handlers = new Map();
    agentSubscriptions = new Map();
    messageHistory = [];
    maxHistorySize;
    constructor(options = {}) {
        this.maxHistorySize = options.maxHistorySize || 1000;
    }
    /**
     * Send a message from one agent to another (or broadcast)
     */
    send(from, type, payload, to) {
        const message = {
            id: (0, uuid_1.v4)(),
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
    sendDirect(from, to, content, data) {
        return this.send(from, 'direct', { kind: 'direct', content, data }, to);
    }
    /**
     * Broadcast a message to all agents
     */
    broadcast(from, event, data) {
        return this.send(from, 'broadcast', { kind: 'broadcast', event, data });
    }
    /**
     * Subscribe to a specific event type
     */
    subscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
        return () => {
            this.handlers.get(eventType)?.delete(handler);
        };
    }
    /**
     * Subscribe an agent to receive messages
     */
    subscribeAgent(agentId, handler) {
        if (!this.agentSubscriptions.has(agentId)) {
            this.agentSubscriptions.set(agentId, new Set());
        }
        const wrappedHandler = (event) => {
            const message = event.payload;
            // Only deliver if message is for this agent or is a broadcast
            if (!message.to || message.to === agentId) {
                handler(event);
            }
        };
        this.agentSubscriptions.get(agentId).add(agentId);
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
    get(messageId) {
        return this.messages.get(messageId);
    }
    /**
     * Get all messages
     */
    getAll() {
        return Array.from(this.messages.values());
    }
    /**
     * Get messages for a specific agent (sent or received)
     */
    getMessagesForAgent(agentId) {
        return this.getAll().filter(msg => msg.from === agentId || msg.to === agentId || (!msg.to && msg.type === 'broadcast'));
    }
    /**
     * Get messages between two agents
     */
    getMessagesBetween(agentA, agentB) {
        return this.getAll().filter(msg => (msg.from === agentA && msg.to === agentB) ||
            (msg.from === agentB && msg.to === agentA));
    }
    /**
     * Get recent message history
     */
    getHistory(limit = 100) {
        return this.messageHistory.slice(-limit);
    }
    /**
     * Clear message history
     */
    clearHistory() {
        this.messageHistory = [];
        this.messages.clear();
    }
    addToHistory(message) {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
    }
    emit(eventType, payload) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            const event = {
                type: eventType,
                timestamp: new Date(),
                payload,
            };
            for (const handler of handlers) {
                try {
                    handler(event);
                }
                catch (err) {
                    console.error(`Error in message bus handler for ${eventType}:`, err);
                }
            }
        }
    }
    emitToAgent(agentId, message) {
        // This is handled by the agent subscription logic in subscribeAgent
        // The wrapped handler filters messages appropriately
    }
}
exports.MessageBus = MessageBus;
//# sourceMappingURL=bus.js.map