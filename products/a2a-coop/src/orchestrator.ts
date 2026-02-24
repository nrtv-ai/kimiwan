import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskId,
  TaskRequest,
  TaskResult,
  TaskStatus,
  AgentId,
  Capability,
  Artifact,
} from './types';
import { AgentRegistry } from './registry';
import { MessageBus } from './bus';

/**
 * TaskOrchestrator manages the lifecycle of tasks in the A2A-Coop system.
 * 
 * Responsibilities:
 * - Create and track tasks
 * - Assign tasks to appropriate agents
 * - Monitor task progress
 * - Handle task delegation and subtasks
 * - Collect and store results
 */
export class TaskOrchestrator {
  private tasks: Map<TaskId, Task> = new Map();
  private handlers: Map<string, Set<Function>> = new Map();

  constructor(
    private registry: AgentRegistry,
    private messageBus: MessageBus
  ) {}

  /**
   * Create a new task
   */
  create(request: TaskRequest, createdBy: AgentId): Task {
    const id = uuidv4();
    const now = new Date();

    const task: Task = {
      id,
      type: request.type,
      description: request.description,
      payload: request.payload,
      status: 'pending',
      priority: request.priority || 5,
      createdBy,
      parentTaskId: request.parentTaskId,
      subtasks: [],
      contextId: request.contextId,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);
    this.emit('task_created', task);

    // Try to auto-assign if capabilities specified
    if (request.requiredCapabilities && request.requiredCapabilities.length > 0) {
      this.assignToCapableAgent(task.id, request.requiredCapabilities);
    }

    return task;
  }

  /**
   * Assign a task to a specific agent
   */
  assign(taskId: TaskId, agentId: AgentId): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const agent = this.registry.get(agentId);
    if (!agent) return false;

    if (task.status !== 'pending') {
      return false; // Can only assign pending tasks
    }

    task.assignedTo = agentId;
    task.status = 'assigned';
    task.updatedAt = new Date();

    // Update agent status
    this.registry.updateStatus(agentId, 'busy');

    this.emit('task_assigned', { task, agent });

    // Send task request message to the agent
    this.messageBus.send(
      task.createdBy,
      'task_request',
      {
        kind: 'task_request',
        task: {
          type: task.type,
          description: task.description,
          payload: task.payload,
          priority: task.priority,
          parentTaskId: task.parentTaskId,
          contextId: task.contextId,
        },
      },
      agentId
    );

    return true;
  }

  /**
   * Auto-assign task to an agent with required capabilities
   */
  assignToCapableAgent(taskId: TaskId, capabilities: Capability[]): boolean {
    const candidates = this.registry.findByCapabilities({
      capabilities,
      matchAll: true,
    });

    // Filter for idle agents
    const idleCandidates = candidates.filter(a => a.status === 'idle');

    if (idleCandidates.length === 0) {
      return false;
    }

    // Simple strategy: pick the first idle candidate
    // Could be enhanced with load balancing, skill scoring, etc.
    const selected = idleCandidates[0];
    return this.assign(taskId, selected.id);
  }

  /**
   * Mark a task as in progress
   */
  start(taskId: TaskId): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status !== 'assigned') {
      return false;
    }

    task.status = 'in_progress';
    task.updatedAt = new Date();

    this.emit('task_started', task);
    return true;
  }

  /**
   * Complete a task with results
   */
  complete(taskId: TaskId, result: TaskResult): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status !== 'in_progress' && task.status !== 'assigned') {
      return false;
    }

    task.status = result.success ? 'completed' : 'failed';
    task.result = result;
    task.updatedAt = new Date();
    task.completedAt = new Date();

    // Free up the agent
    if (task.assignedTo) {
      this.registry.updateStatus(task.assignedTo, 'idle');
    }

    this.emit(result.success ? 'task_completed' : 'task_failed', task);

    // Notify parent task if this is a subtask
    if (task.parentTaskId) {
      this.checkParentCompletion(task.parentTaskId);
    }

    // Send response message
    if (task.assignedTo) {
      this.messageBus.send(
        task.assignedTo,
        'task_response',
        {
          kind: 'task_response',
          taskId,
          result,
        },
        task.createdBy
      );
    }

    return true;
  }

  /**
   * Cancel a task
   */
  cancel(taskId: TaskId, reason?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      return false;
    }

    task.status = 'cancelled';
    task.updatedAt = new Date();
    task.result = {
      success: false,
      error: reason || 'Task cancelled',
      logs: [],
      artifacts: [],
    };

    // Free up the agent
    if (task.assignedTo) {
      this.registry.updateStatus(task.assignedTo, 'idle');
    }

    this.emit('task_cancelled', { task, reason });
    return true;
  }

  /**
   * Create a subtask
   */
  createSubtask(parentTaskId: TaskId, request: TaskRequest, createdBy: AgentId): Task | undefined {
    const parent = this.tasks.get(parentTaskId);
    if (!parent) return undefined;

    const subtask = this.create(
      { ...request, parentTaskId, contextId: parent.contextId },
      createdBy
    );

    parent.subtasks.push(subtask.id);
    parent.updatedAt = new Date();

    return subtask;
  }

  /**
   * Get a task by ID
   */
  get(taskId: TaskId): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getByStatus(status: TaskStatus): Task[] {
    return this.getAll().filter(t => t.status === status);
  }

  /**
   * Get tasks assigned to an agent
   */
  getByAgent(agentId: AgentId): Task[] {
    return this.getAll().filter(t => t.assignedTo === agentId);
  }

  /**
   * Get tasks created by an agent
   */
  getByCreator(agentId: AgentId): Task[] {
    return this.getAll().filter(t => t.createdBy === agentId);
  }

  /**
   * Get child tasks (subtasks) of a task
   */
  getSubtasks(taskId: TaskId): Task[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];
    return task.subtasks.map(id => this.tasks.get(id)!).filter(Boolean);
  }

  /**
   * Get task tree (task + all subtasks recursively)
   */
  getTaskTree(taskId: TaskId): Task[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    const result: Task[] = [task];
    for (const subtaskId of task.subtasks) {
      result.push(...this.getTaskTree(subtaskId));
    }
    return result;
  }

  /**
   * Add an artifact to a task
   */
  addArtifact(taskId: TaskId, artifact: Artifact): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (!task.result) {
      task.result = {
        success: false,
        logs: [],
        artifacts: [],
      };
    }

    task.result.artifacts.push(artifact);
    task.updatedAt = new Date();

    return true;
  }

  /**
   * Add a log entry to a task
   */
  addLog(taskId: TaskId, log: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (!task.result) {
      task.result = {
        success: false,
        logs: [],
        artifacts: [],
      };
    }

    task.result.logs.push(log);
    task.updatedAt = new Date();

    return true;
  }

  private checkParentCompletion(parentTaskId: TaskId): void {
    const parent = this.tasks.get(parentTaskId);
    if (!parent) return;

    const subtasks = parent.subtasks.map(id => this.tasks.get(id)).filter(Boolean) as Task[];
    
    // Check if all subtasks are done
    const allDone = subtasks.every(
      t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );

    if (allDone && subtasks.length > 0) {
      const allSuccess = subtasks.every(t => t.status === 'completed');
      
      if (parent.status === 'in_progress') {
        this.complete(parentTaskId, {
          success: allSuccess,
          data: {
            subtaskResults: subtasks.map(t => ({
              taskId: t.id,
              status: t.status,
              result: t.result,
            })),
          },
          logs: [`All ${subtasks.length} subtasks completed`],
          artifacts: subtasks.flatMap(t => t.result?.artifacts || []),
        });
      }
    }
  }

  /**
   * Subscribe to orchestrator events
   */
  on(event: string, handler: Function): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  private emit(event: string, payload: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler({ type: event, timestamp: new Date(), payload });
        } catch (err) {
          console.error(`Error in orchestrator handler for ${event}:`, err);
        }
      }
    }
  }
}
