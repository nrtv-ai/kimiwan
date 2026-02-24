import { Task, TaskId, TaskRequest, TaskResult, TaskStatus, AgentId, Capability, Artifact } from './types';
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
export declare class TaskOrchestrator {
    private registry;
    private messageBus;
    private tasks;
    private handlers;
    constructor(registry: AgentRegistry, messageBus: MessageBus);
    /**
     * Create a new task
     */
    create(request: TaskRequest, createdBy: AgentId): Task;
    /**
     * Assign a task to a specific agent
     */
    assign(taskId: TaskId, agentId: AgentId): boolean;
    /**
     * Auto-assign task to an agent with required capabilities
     */
    assignToCapableAgent(taskId: TaskId, capabilities: Capability[]): boolean;
    /**
     * Mark a task as in progress
     */
    start(taskId: TaskId): boolean;
    /**
     * Complete a task with results
     */
    complete(taskId: TaskId, result: TaskResult): boolean;
    /**
     * Cancel a task
     */
    cancel(taskId: TaskId, reason?: string): boolean;
    /**
     * Create a subtask
     */
    createSubtask(parentTaskId: TaskId, request: TaskRequest, createdBy: AgentId): Task | undefined;
    /**
     * Get a task by ID
     */
    get(taskId: TaskId): Task | undefined;
    /**
     * Get all tasks
     */
    getAll(): Task[];
    /**
     * Get tasks by status
     */
    getByStatus(status: TaskStatus): Task[];
    /**
     * Get tasks assigned to an agent
     */
    getByAgent(agentId: AgentId): Task[];
    /**
     * Get tasks created by an agent
     */
    getByCreator(agentId: AgentId): Task[];
    /**
     * Get child tasks (subtasks) of a task
     */
    getSubtasks(taskId: TaskId): Task[];
    /**
     * Get task tree (task + all subtasks recursively)
     */
    getTaskTree(taskId: TaskId): Task[];
    /**
     * Add an artifact to a task
     */
    addArtifact(taskId: TaskId, artifact: Artifact): boolean;
    /**
     * Add a log entry to a task
     */
    addLog(taskId: TaskId, log: string): boolean;
    private checkParentCompletion;
    /**
     * Subscribe to orchestrator events
     */
    on(event: string, handler: Function): () => void;
    private emit;
}
//# sourceMappingURL=orchestrator.d.ts.map