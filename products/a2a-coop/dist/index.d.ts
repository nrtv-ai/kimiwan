import { AgentRegistry } from './registry';
import { MessageBus } from './bus';
import { ContextStore } from './context';
import { TaskOrchestrator } from './orchestrator';
import { Agent, AgentId, AgentRegistration, Task, TaskId, TaskRequest, Context, ContextId, ContextCreateRequest, Message } from './types';
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
export declare class A2ACoop {
    registry: AgentRegistry;
    bus: MessageBus;
    context: ContextStore;
    orchestrator: TaskOrchestrator;
    constructor(options?: {
        maxMessageHistory?: number;
    });
    /**
     * Register a new agent
     */
    registerAgent(registration: AgentRegistration): Agent;
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId: AgentId): boolean;
    /**
     * Get agent by ID
     */
    getAgent(agentId: AgentId): Agent | undefined;
    /**
     * Get all agents
     */
    getAllAgents(): Agent[];
    /**
     * Find agents by capabilities
     */
    findAgentsByCapabilities(capabilities: string[], matchAll?: boolean): Agent[];
    /**
     * Create a new task
     */
    createTask(request: TaskRequest, createdBy: AgentId): Task;
    /**
     * Assign a task to an agent
     */
    assignTask(taskId: TaskId, agentId: AgentId): boolean;
    /**
     * Mark task as started
     */
    startTask(taskId: TaskId): boolean;
    /**
     * Complete a task
     */
    completeTask(taskId: TaskId, result: {
        success: boolean;
        data?: Record<string, unknown>;
        error?: string;
        logs?: string[];
        artifacts?: Array<{
            type: string;
            name: string;
            content: unknown;
            metadata?: Record<string, unknown>;
        }>;
    }): boolean;
    /**
     * Cancel a task
     */
    cancelTask(taskId: TaskId, reason?: string): boolean;
    /**
     * Get task by ID
     */
    getTask(taskId: TaskId): Task | undefined;
    /**
     * Get all tasks
     */
    getAllTasks(): Task[];
    /**
     * Create a new context
     */
    createContext(request: ContextCreateRequest, createdBy: AgentId): Context;
    /**
     * Get context by ID
     */
    getContext(contextId: ContextId): Context | undefined;
    /**
     * Update context data
     */
    updateContext(contextId: ContextId, updates: Record<string, unknown>, updatedBy: AgentId): Context | undefined;
    /**
     * Get contexts for an agent
     */
    getContextsForAgent(agentId: AgentId): Context[];
    /**
     * Send a direct message
     */
    sendMessage(from: AgentId, to: AgentId, content: string, data?: Record<string, unknown>): Message;
    /**
     * Broadcast a message
     */
    broadcastMessage(from: AgentId, event: string, data: Record<string, unknown>): Message;
    /**
     * Subscribe an agent to receive messages
     */
    subscribeToMessages(agentId: AgentId, handler: (message: Message) => void): () => void;
    /**
     * Get system status summary
     */
    getStatus(): {
        agents: number;
        tasks: {
            total: number;
            pending: number;
            inProgress: number;
            completed: number;
        };
        contexts: number;
        messages: number;
    };
}
export * from './types';
export { AgentRegistry } from './registry';
export { MessageBus } from './bus';
export { ContextStore } from './context';
export { TaskOrchestrator } from './orchestrator';
export { A2ACoopServer } from './server';
export { A2ACoopClient } from './client';
//# sourceMappingURL=index.d.ts.map