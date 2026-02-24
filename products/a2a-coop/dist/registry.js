"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
const uuid_1 = require("uuid");
/**
 * AgentRegistry manages agent registration, discovery, and status tracking.
 *
 * This is the central directory for all agents in the A2A-Coop system.
 * Agents register themselves with their capabilities, and other components
 * can query for agents by ID or capability.
 */
class AgentRegistry {
    agents = new Map();
    handlers = new Map();
    /**
     * Register a new agent
     */
    register(registration) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const agent = {
            id,
            name: registration.name,
            description: registration.description,
            capabilities: registration.capabilities,
            status: 'idle',
            metadata: registration.metadata || {},
            registeredAt: now,
            lastSeenAt: now,
        };
        this.agents.set(id, agent);
        this.emit('agent_registered', agent);
        return agent;
    }
    /**
     * Unregister an agent
     */
    unregister(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return false;
        this.agents.delete(agentId);
        this.emit('agent_unregistered', agent);
        return true;
    }
    /**
     * Get an agent by ID
     */
    get(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * Get all registered agents
     */
    getAll() {
        return Array.from(this.agents.values());
    }
    /**
     * Find agents by capability query
     */
    findByCapabilities(query) {
        const agents = this.getAll();
        return agents.filter(agent => {
            if (query.matchAll) {
                // Agent must have ALL specified capabilities
                return query.capabilities.every(cap => agent.capabilities.includes(cap));
            }
            else {
                // Agent must have AT LEAST ONE specified capability
                return query.capabilities.some(cap => agent.capabilities.includes(cap));
            }
        });
    }
    /**
     * Find agents by name (partial match)
     */
    findByName(name) {
        const lowerName = name.toLowerCase();
        return this.getAll().filter(agent => agent.name.toLowerCase().includes(lowerName));
    }
    /**
     * Update agent status
     */
    updateStatus(agentId, status) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return false;
        const oldStatus = agent.status;
        agent.status = status;
        agent.lastSeenAt = new Date();
        this.emit('agent_status_changed', { agent, oldStatus });
        return true;
    }
    /**
     * Update agent metadata
     */
    updateMetadata(agentId, metadata) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return false;
        agent.metadata = { ...agent.metadata, ...metadata };
        agent.lastSeenAt = new Date();
        return true;
    }
    /**
     * Get all unique capabilities across all agents
     */
    getAllCapabilities() {
        const caps = new Set();
        for (const agent of this.agents.values()) {
            for (const cap of agent.capabilities) {
                caps.add(cap);
            }
        }
        return Array.from(caps);
    }
    /**
     * Check if an agent exists
     */
    has(agentId) {
        return this.agents.has(agentId);
    }
    /**
     * Get count of registered agents
     */
    count() {
        return this.agents.size;
    }
    /**
     * Subscribe to registry events
     */
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
        // Return unsubscribe function
        return () => {
            this.handlers.get(event)?.delete(handler);
        };
    }
    emit(event, payload) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler({ type: event, timestamp: new Date(), payload });
                }
                catch (err) {
                    console.error(`Error in event handler for ${event}:`, err);
                }
            }
        }
    }
}
exports.AgentRegistry = AgentRegistry;
//# sourceMappingURL=registry.js.map