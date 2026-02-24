/**
 * Core types and interfaces for A2A-Coop
 */
export type AgentId = string;
export type TaskId = string;
export type MessageId = string;
export type ContextId = string;
export type Capability = string;
export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type MessageType = 'task_request' | 'task_response' | 'context_update' | 'broadcast' | 'direct';
/**
 * Agent definition
 */
export interface Agent {
    id: AgentId;
    name: string;
    description: string;
    capabilities: Capability[];
    status: AgentStatus;
    metadata: Record<string, unknown>;
    registeredAt: Date;
    lastSeenAt: Date;
}
/**
 * Agent registration request
 */
export interface AgentRegistration {
    name: string;
    description: string;
    capabilities: Capability[];
    metadata?: Record<string, unknown>;
}
/**
 * Task definition
 */
export interface Task {
    id: TaskId;
    type: string;
    description: string;
    payload: Record<string, unknown>;
    status: TaskStatus;
    priority: number;
    createdBy: AgentId;
    assignedTo?: AgentId;
    parentTaskId?: TaskId;
    subtasks: TaskId[];
    contextId?: ContextId;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    result?: TaskResult;
}
/**
 * Task creation request
 */
export interface TaskRequest {
    type: string;
    description: string;
    payload: Record<string, unknown>;
    priority?: number;
    parentTaskId?: TaskId;
    contextId?: ContextId;
    requiredCapabilities?: Capability[];
}
/**
 * Task execution result
 */
export interface TaskResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    logs: string[];
    artifacts: Artifact[];
}
/**
 * Artifact produced by task execution
 */
export interface Artifact {
    id: string;
    type: string;
    name: string;
    content: unknown;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
/**
 * Message passed between agents
 */
export interface Message {
    id: MessageId;
    type: MessageType;
    from: AgentId;
    to?: AgentId;
    payload: MessagePayload;
    timestamp: Date;
    correlationId?: string;
}
/**
 * Message payload variants
 */
export type MessagePayload = TaskRequestPayload | TaskResponsePayload | ContextUpdatePayload | BroadcastPayload | DirectPayload;
export interface TaskRequestPayload {
    kind: 'task_request';
    task: TaskRequest;
}
export interface TaskResponsePayload {
    kind: 'task_response';
    taskId: TaskId;
    result: TaskResult;
}
export interface ContextUpdatePayload {
    kind: 'context_update';
    contextId: ContextId;
    updates: Record<string, unknown>;
}
export interface BroadcastPayload {
    kind: 'broadcast';
    event: string;
    data: Record<string, unknown>;
}
export interface DirectPayload {
    kind: 'direct';
    content: string;
    data?: Record<string, unknown>;
}
/**
 * Shared context for collaborative tasks
 */
export interface Context {
    id: ContextId;
    name: string;
    description: string;
    data: Record<string, unknown>;
    participants: AgentId[];
    parentContextId?: ContextId;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Context creation request
 */
export interface ContextCreateRequest {
    name: string;
    description: string;
    initialData?: Record<string, unknown>;
    parentContextId?: ContextId;
}
/**
 * Agent capability query
 */
export interface CapabilityQuery {
    capabilities: Capability[];
    matchAll?: boolean;
}
/**
 * Event types for the message bus
 */
export type BusEventType = 'agent_registered' | 'agent_unregistered' | 'agent_status_changed' | 'task_created' | 'task_assigned' | 'task_completed' | 'task_failed' | 'context_updated' | 'message_received';
export interface BusEvent {
    type: BusEventType;
    timestamp: Date;
    payload: unknown;
}
/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: BusEvent & {
    payload: T;
}) => void | Promise<void>;
//# sourceMappingURL=types.d.ts.map