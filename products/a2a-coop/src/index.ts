import { AgentRegistry } from './registry';
import { MessageBus } from './bus';
import { ContextStore } from './context';
import { TaskOrchestrator } from './orchestrator';
import {
  Agent,
  AgentId,
  AgentRegistration,
  Task,
  TaskId,
  TaskRequest,
  Context,
  ContextId,
  ContextCreateRequest,
  Message,
  MessagePayload,
} from './types';

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
export class A2ACoop {
  public registry: AgentRegistry;
  public bus: MessageBus;
  public context: ContextStore;
  public orchestrator: TaskOrchestrator;

  constructor(options: { maxMessageHistory?: number } = {}) {
    this.registry = new AgentRegistry();
    this.bus = new MessageBus({ maxHistorySize: options.maxMessageHistory });
    this.context = new ContextStore();
    this.orchestrator = new TaskOrchestrator(this.registry, this.bus);
  }

  // ==================== Agent Management ====================

  /**
   * Register a new agent
   */
  registerAgent(registration: AgentRegistration): Agent {
    return this.registry.register(registration);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: AgentId): boolean {
    return this.registry.unregister(agentId);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: AgentId): Agent | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return this.registry.getAll();
  }

  /**
   * Find agents by capabilities
   */
  findAgentsByCapabilities(capabilities: string[], matchAll = true): Agent[] {
    return this.registry.findByCapabilities({ capabilities, matchAll });
  }

  // ==================== Task Management ====================

  /**
   * Create a new task
   */
  createTask(request: TaskRequest, createdBy: AgentId): Task {
    return this.orchestrator.create(request, createdBy);
  }

  /**
   * Assign a task to an agent
   */
  assignTask(taskId: TaskId, agentId: AgentId): boolean {
    return this.orchestrator.assign(taskId, agentId);
  }

  /**
   * Mark task as started
   */
  startTask(taskId: TaskId): boolean {
    return this.orchestrator.start(taskId);
  }

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
  }): boolean {
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
  cancelTask(taskId: TaskId, reason?: string): boolean {
    return this.orchestrator.cancel(taskId, reason);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: TaskId): Task | undefined {
    return this.orchestrator.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return this.orchestrator.getAll();
  }

  // ==================== Context Management ====================

  /**
   * Create a new context
   */
  createContext(request: ContextCreateRequest, createdBy: AgentId): Context {
    return this.context.create(request, createdBy);
  }

  /**
   * Get context by ID
   */
  getContext(contextId: ContextId): Context | undefined {
    return this.context.get(contextId);
  }

  /**
   * Update context data
   */
  updateContext(
    contextId: ContextId,
    updates: Record<string, unknown>,
    updatedBy: AgentId
  ): Context | undefined {
    return this.context.update(contextId, updates, updatedBy);
  }

  /**
   * Get contexts for an agent
   */
  getContextsForAgent(agentId: AgentId): Context[] {
    return this.context.getContextsForAgent(agentId);
  }

  // ==================== Messaging ====================

  /**
   * Send a direct message
   */
  sendMessage(
    from: AgentId,
    to: AgentId,
    content: string,
    data?: Record<string, unknown>
  ): Message {
    return this.bus.sendDirect(from, to, content, data);
  }

  /**
   * Broadcast a message
   */
  broadcastMessage(
    from: AgentId,
    event: string,
    data: Record<string, unknown>
  ): Message {
    return this.bus.broadcast(from, event, data);
  }

  /**
   * Subscribe an agent to receive messages
   */
  subscribeToMessages(agentId: AgentId, handler: (message: Message) => void): () => void {
    return this.bus.subscribeAgent(agentId, (event) => {
      handler(event.payload as Message);
    });
  }

  // ==================== System Info ====================

  /**
   * Get system status summary
   */
  getStatus(): {
    agents: number;
    tasks: { total: number; pending: number; inProgress: number; completed: number };
    contexts: number;
    messages: number;
  } {
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

// Export all types and components
export * from './types';
export { AgentRegistry } from './registry';
export { MessageBus } from './bus';
export { ContextStore } from './context';
export { TaskOrchestrator } from './orchestrator';
export { A2ACoopServer } from './server';
export { A2ACoopClient } from './client';
