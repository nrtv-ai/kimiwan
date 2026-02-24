"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2ACoopRestApi = exports.WebSocketRateLimiter = exports.RateLimiter = exports.A2ACoopClient = exports.A2ACoopServer = exports.TaskOrchestrator = exports.ContextStore = exports.MessageBus = exports.AgentRegistry = exports.A2ACoop = void 0;
const registry_1 = require("./registry");
const bus_1 = require("./bus");
const context_1 = require("./context");
const orchestrator_1 = require("./orchestrator");
/**
 * A2ACoop is the main entry point for the Agent-to-Agent Collaboration system.
 *
 * It provides a unified API over the four core components:
 * - AgentRegistry: Agent registration and discovery
 * - MessageBus: Inter-agent communication
 * - ContextStore: Shared state management
 * - TaskOrchestrator: Task lifecycle management
 *
 * Usage:
 * ```typescript
 * const coop = new A2ACoop();
 *
 * // Register agents
 * const agent = coop.registerAgent({
 *   name: 'ResearchAgent',
 *   description: 'Performs research tasks',
 *   capabilities: ['research', 'summarize']
 * });
 *
 * // Create a task
 * const task = coop.createTask({
 *   type: 'research',
 *   description: 'Research AI trends',
 *   payload: { topic: 'AI' }
 * }, agent.id);
 * ```
 */
class A2ACoop {
    registry;
    bus;
    context;
    orchestrator;
    constructor(options = {}) {
        this.registry = new registry_1.AgentRegistry();
        this.bus = new bus_1.MessageBus({ maxHistorySize: options.maxMessageHistory });
        this.context = new context_1.ContextStore();
        this.orchestrator = new orchestrator_1.TaskOrchestrator(this.registry, this.bus);
    }
    // ==================== Agent Management ====================
    /**
     * Register a new agent
     */
    registerAgent(registration) {
        return this.registry.register(registration);
    }
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId) {
        return this.registry.unregister(agentId);
    }
    /**
     * Get agent by ID
     */
    getAgent(agentId) {
        return this.registry.get(agentId);
    }
    /**
     * Get all agents
     */
    getAllAgents() {
        return this.registry.getAll();
    }
    /**
     * Find agents by capabilities
     */
    findAgentsByCapabilities(capabilities, matchAll = true) {
        return this.registry.findByCapabilities({ capabilities, matchAll });
    }
    // ==================== Task Management ====================
    /**
     * Create a new task
     */
    createTask(request, createdBy) {
        return this.orchestrator.create(request, createdBy);
    }
    /**
     * Assign a task to an agent
     */
    assignTask(taskId, agentId) {
        return this.orchestrator.assign(taskId, agentId);
    }
    /**
     * Mark task as started
     */
    startTask(taskId) {
        return this.orchestrator.start(taskId);
    }
    /**
     * Complete a task
     */
    completeTask(taskId, result) {
        return this.orchestrator.complete(taskId, {
            success: result.success,
            data: result.data,
            error: result.error,
            logs: result.logs || [],
            artifacts: (result.artifacts || []).map(a => ({
                id: crypto.randomUUID(),
                type: a.type,
                name: a.name,
                content: a.content,
                metadata: a.metadata || {},
                createdAt: new Date(),
            })),
        });
    }
    /**
     * Cancel a task
     */
    cancelTask(taskId, reason) {
        return this.orchestrator.cancel(taskId, reason);
    }
    /**
     * Get task by ID
     */
    getTask(taskId) {
        return this.orchestrator.get(taskId);
    }
    /**
     * Get all tasks
     */
    getAllTasks() {
        return this.orchestrator.getAll();
    }
    // ==================== Context Management ====================
    /**
     * Create a new context
     */
    createContext(request, createdBy) {
        return this.context.create(request, createdBy);
    }
    /**
     * Get context by ID
     */
    getContext(contextId) {
        return this.context.get(contextId);
    }
    /**
     * Update context data
     */
    updateContext(contextId, updates, updatedBy) {
        return this.context.update(contextId, updates, updatedBy);
    }
    /**
     * Get contexts for an agent
     */
    getContextsForAgent(agentId) {
        return this.context.getContextsForAgent(agentId);
    }
    // ==================== Messaging ====================
    /**
     * Send a direct message
     */
    sendMessage(from, to, content, data) {
        return this.bus.sendDirect(from, to, content, data);
    }
    /**
     * Broadcast a message
     */
    broadcastMessage(from, event, data) {
        return this.bus.broadcast(from, event, data);
    }
    /**
     * Subscribe an agent to receive messages
     */
    subscribeToMessages(agentId, handler) {
        return this.bus.subscribeAgent(agentId, (event) => {
            handler(event.payload);
        });
    }
    // ==================== System Info ====================
    /**
     * Get system status summary
     */
    getStatus() {
        const tasks = this.orchestrator.getAll();
        return {
            agents: this.registry.count(),
            tasks: {
                total: tasks.length,
                pending: tasks.filter(t => t.status === 'pending').length,
                inProgress: tasks.filter(t => t.status === 'in_progress').length,
                completed: tasks.filter(t => t.status === 'completed').length,
            },
            contexts: this.context.getAll().length,
            messages: this.bus.getAll().length,
        };
    }
}
exports.A2ACoop = A2ACoop;
// Export all types and components
__exportStar(require("./types"), exports);
var registry_2 = require("./registry");
Object.defineProperty(exports, "AgentRegistry", { enumerable: true, get: function () { return registry_2.AgentRegistry; } });
var bus_2 = require("./bus");
Object.defineProperty(exports, "MessageBus", { enumerable: true, get: function () { return bus_2.MessageBus; } });
var context_2 = require("./context");
Object.defineProperty(exports, "ContextStore", { enumerable: true, get: function () { return context_2.ContextStore; } });
var orchestrator_2 = require("./orchestrator");
Object.defineProperty(exports, "TaskOrchestrator", { enumerable: true, get: function () { return orchestrator_2.TaskOrchestrator; } });
var server_1 = require("./server");
Object.defineProperty(exports, "A2ACoopServer", { enumerable: true, get: function () { return server_1.A2ACoopServer; } });
var client_1 = require("./client");
Object.defineProperty(exports, "A2ACoopClient", { enumerable: true, get: function () { return client_1.A2ACoopClient; } });
var rateLimiter_1 = require("./rateLimiter");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return rateLimiter_1.RateLimiter; } });
Object.defineProperty(exports, "WebSocketRateLimiter", { enumerable: true, get: function () { return rateLimiter_1.WebSocketRateLimiter; } });
var restApi_1 = require("./restApi");
Object.defineProperty(exports, "A2ACoopRestApi", { enumerable: true, get: function () { return restApi_1.A2ACoopRestApi; } });
//# sourceMappingURL=index.js.map