import WebSocket from 'ws';
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
} from './types';

/**
 * WebSocket message types
 */
export type WSMessageType =
  | 'agent.register'
  | 'agent.unregister'
  | 'agent.list'
  | 'agent.get'
  | 'task.create'
  | 'task.assign'
  | 'task.start'
  | 'task.complete'
  | 'task.cancel'
  | 'task.get'
  | 'task.list'
  | 'context.create'
  | 'context.get'
  | 'context.update'
  | 'context.list'
  | 'message.send'
  | 'message.broadcast'
  | 'message.subscribe'
  | 'status.get'
  | 'event';

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
export class A2ACoopClient {
  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private messageQueue: WSMessage[] = [];
  private connected = false;

  constructor(private url: string) {}

  /**
   * Connect to the server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('Connected to A2A-Coop server');
        this.connected = true;
        this.flushMessageQueue();
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const response: WSResponse = JSON.parse(data.toString());
          this.handleResponse(response);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        console.log('Disconnected from server');
        this.connected = false;
      });

      this.ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        reject(err);
      });
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ==================== Agent Operations ====================

  async registerAgent(registration: AgentRegistration): Promise<Agent> {
    const response = await this.sendRequest('agent.register', registration);
    return (response as { agent: Agent }).agent;
  }

  async unregisterAgent(agentId: AgentId): Promise<boolean> {
    const response = await this.sendRequest('agent.unregister', { agentId });
    return (response as { success: boolean }).success;
  }

  async listAgents(): Promise<Agent[]> {
    const response = await this.sendRequest('agent.list', {});
    return (response as { agents: Agent[] }).agents;
  }

  async getAgent(agentId: AgentId): Promise<Agent | undefined> {
    const response = await this.sendRequest('agent.get', { agentId });
    return (response as { agent: Agent | undefined }).agent;
  }

  // ==================== Task Operations ====================

  async createTask(request: TaskRequest, createdBy: AgentId): Promise<Task> {
    const response = await this.sendRequest('task.create', { request, createdBy });
    return (response as { task: Task }).task;
  }

  async assignTask(taskId: TaskId, agentId: AgentId): Promise<boolean> {
    const response = await this.sendRequest('task.assign', { taskId, agentId });
    return (response as { success: boolean }).success;
  }

  async startTask(taskId: TaskId): Promise<boolean> {
    const response = await this.sendRequest('task.start', { taskId });
    return (response as { success: boolean }).success;
  }

  async completeTask(
    taskId: TaskId,
    result: {
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
    }
  ): Promise<boolean> {
    const response = await this.sendRequest('task.complete', { taskId, result });
    return (response as { success: boolean }).success;
  }

  async cancelTask(taskId: TaskId, reason?: string): Promise<boolean> {
    const response = await this.sendRequest('task.cancel', { taskId, reason });
    return (response as { success: boolean }).success;
  }

  async getTask(taskId: TaskId): Promise<Task | undefined> {
    const response = await this.sendRequest('task.get', { taskId });
    return (response as { task: Task | undefined }).task;
  }

  async listTasks(): Promise<Task[]> {
    const response = await this.sendRequest('task.list', {});
    return (response as { tasks: Task[] }).tasks;
  }

  // ==================== Context Operations ====================

  async createContext(request: ContextCreateRequest, createdBy: AgentId): Promise<Context> {
    const response = await this.sendRequest('context.create', { request, createdBy });
    return (response as { context: Context }).context;
  }

  async getContext(contextId: ContextId): Promise<Context | undefined> {
    const response = await this.sendRequest('context.get', { contextId });
    return (response as { context: Context | undefined }).context;
  }

  async updateContext(
    contextId: ContextId,
    updates: Record<string, unknown>,
    updatedBy: AgentId
  ): Promise<Context | undefined> {
    const response = await this.sendRequest('context.update', { contextId, updates, updatedBy });
    return (response as { context: Context | undefined }).context;
  }

  async listContexts(): Promise<Context[]> {
    const response = await this.sendRequest('context.list', {});
    return (response as { contexts: Context[] }).contexts;
  }

  // ==================== Message Operations ====================

  async sendMessage(
    from: AgentId,
    to: AgentId,
    content: string,
    data?: Record<string, unknown>
  ): Promise<Message> {
    const response = await this.sendRequest('message.send', { from, to, content, data });
    return (response as { message: Message }).message;
  }

  async broadcastMessage(
    from: AgentId,
    event: string,
    data: Record<string, unknown>
  ): Promise<Message> {
    const response = await this.sendRequest('message.broadcast', { from, event, data });
    return (response as { message: Message }).message;
  }

  async subscribeToMessages(agentId: AgentId, handler: (message: Message) => void): Promise<void> {
    this.on('message.received', handler);
    await this.sendRequest('message.subscribe', { agentId });
  }

  // ==================== Status Operations ====================

  async getStatus(): Promise<{
    agents: number;
    tasks: { total: number; pending: number; inProgress: number; completed: number };
    contexts: number;
    messages: number;
  }> {
    const response = await this.sendRequest('status.get', {});
    return (response as { status: {
      agents: number;
      tasks: { total: number; pending: number; inProgress: number; completed: number };
      contexts: number;
      messages: number;
    } }).status;
  }

  // ==================== Event Handling ====================

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // ==================== Private Methods ====================

  private sendRequest(type: WSMessageType, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const message: WSMessage = { id, type, payload };

      this.pendingRequests.set(id, { resolve, reject });

      if (this.connected && this.ws) {
        this.ws.send(JSON.stringify(message));
      } else {
        this.messageQueue.push(message);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private handleResponse(response: WSResponse): void {
    if (response.type === 'event') {
      this.handleEvent(response.payload as { eventType: string; [key: string]: unknown });
      return;
    }

    if (response.requestId) {
      const pending = this.pendingRequests.get(response.requestId);
      if (pending) {
        this.pendingRequests.delete(response.requestId);
        if (response.type === 'error') {
          pending.reject(new Error((response.payload as { error: string }).error));
        } else {
          pending.resolve(response.payload);
        }
      }
    }
  }

  private handleEvent(payload: { eventType: string; [key: string]: unknown }): void {
    const handlers = this.eventHandlers.get(payload.eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`Error in event handler for ${payload.eventType}:`, err);
        }
      }
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }
}
