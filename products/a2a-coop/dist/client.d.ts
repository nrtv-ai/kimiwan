import { Agent, AgentId, AgentRegistration, Task, TaskId, TaskRequest, Context, ContextId, ContextCreateRequest, Message } from './types';
/**
 * WebSocket message types
 */
export type WSMessageType = 'agent.register' | 'agent.unregister' | 'agent.list' | 'agent.get' | 'task.create' | 'task.assign' | 'task.start' | 'task.complete' | 'task.cancel' | 'task.get' | 'task.list' | 'context.create' | 'context.get' | 'context.update' | 'context.list' | 'message.send' | 'message.broadcast' | 'message.subscribe' | 'status.get' | 'event';
export interface WSMessage {
    id: string;
    type: WSMessageType;
    payload: unknown;
}
export interface WSResponse {
    id: string;
    type: 'response' | 'error' | 'event';
    requestId?: string;
    payload: unknown;
}
/**
 * A2ACoopClient provides a WebSocket client for connecting to an A2A-Coop server.
 *
 * Usage:
 * ```typescript
 * const client = new A2ACoopClient('ws://localhost:8080');
 * await client.connect();
 *
 * const agent = await client.registerAgent({
 *   name: 'MyAgent',
 *   description: 'Does things',
 *   capabilities: ['compute']
 * });
 * ```
 */
export declare class A2ACoopClient {
    private url;
    private ws;
    private pendingRequests;
    private eventHandlers;
    private messageQueue;
    private connected;
    constructor(url: string);
    /**
     * Connect to the server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the server
     */
    disconnect(): void;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    registerAgent(registration: AgentRegistration): Promise<Agent>;
    unregisterAgent(agentId: AgentId): Promise<boolean>;
    listAgents(): Promise<Agent[]>;
    getAgent(agentId: AgentId): Promise<Agent | undefined>;
    createTask(request: TaskRequest, createdBy: AgentId): Promise<Task>;
    assignTask(taskId: TaskId, agentId: AgentId): Promise<boolean>;
    startTask(taskId: TaskId): Promise<boolean>;
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
    }): Promise<boolean>;
    cancelTask(taskId: TaskId, reason?: string): Promise<boolean>;
    getTask(taskId: TaskId): Promise<Task | undefined>;
    listTasks(): Promise<Task[]>;
    createContext(request: ContextCreateRequest, createdBy: AgentId): Promise<Context>;
    getContext(contextId: ContextId): Promise<Context | undefined>;
    updateContext(contextId: ContextId, updates: Record<string, unknown>, updatedBy: AgentId): Promise<Context | undefined>;
    listContexts(): Promise<Context[]>;
    sendMessage(from: AgentId, to: AgentId, content: string, data?: Record<string, unknown>): Promise<Message>;
    broadcastMessage(from: AgentId, event: string, data: Record<string, unknown>): Promise<Message>;
    subscribeToMessages(agentId: AgentId, handler: (message: Message) => void): Promise<void>;
    getStatus(): Promise<{
        agents: number;
        tasks: {
            total: number;
            pending: number;
            inProgress: number;
            completed: number;
        };
        contexts: number;
        messages: number;
    }>;
    on(event: string, handler: Function): void;
    off(event: string, handler: Function): void;
    private sendRequest;
    private handleResponse;
    private handleEvent;
    private flushMessageQueue;
}
//# sourceMappingURL=client.d.ts.map