import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { A2ACoop } from './index';
import { WebSocketRateLimiter } from './rateLimiter';
import { A2ACoopRestApi } from './restApi';
import {
  AgentId,
  TaskId,
  ContextId,
  AgentRegistration,
  TaskRequest,
  ContextCreateRequest,
} from './types';

/**
 * WebSocket message types for client communication
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
 * Server configuration options
 */
export interface ServerOptions {
  maxMessageHistory?: number;
  enableRateLimiting?: boolean;
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
  enableHealthCheck?: boolean;
  enableRestApi?: boolean;
}

/**
 * Health check response
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  components: {
    websocket: 'connected' | 'disconnected';
    registry: 'ok' | 'error';
    messageBus: 'ok' | 'error';
    taskOrchestrator: 'ok' | 'error';
  };
  metrics: {
    agents: number;
    tasks: { total: number; pending: number; inProgress: number; completed: number };
    contexts: number;
    messages: number;
    connections: number;
  };
}

/**
 * A2ACoopServer provides a WebSocket API for the A2A-Coop system.
 * 
 * Features:
 * - WebSocket API for real-time communication
 * - HTTP health check endpoint
 * - Rate limiting middleware
 * - Connection management
 * 
 * This allows external agents and clients to:
 * - Register agents
 * - Create and manage tasks
 * - Send messages
 * - Subscribe to events
 * - Query system state
 */
export class A2ACoopServer {
  private wss: WebSocketServer;
  private httpServer: ReturnType<typeof createServer>;
  private coop: A2ACoop;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private agentConnections: Map<AgentId, WebSocket> = new Map();
  private rateLimiter?: WebSocketRateLimiter;
  private restApi?: A2ACoopRestApi;
  private options: ServerOptions;
  private startTime: number = Date.now();

  constructor(
    private port: number = 8080,
    options: ServerOptions = {}
  ) {
    this.options = {
      maxMessageHistory: 1000,
      enableRateLimiting: true,
      enableHealthCheck: true,
      enableRestApi: true,
      ...options,
    };

    this.coop = new A2ACoop({ maxMessageHistory: this.options.maxMessageHistory });
    
    // Initialize rate limiter if enabled
    if (this.options.enableRateLimiting) {
      this.rateLimiter = new WebSocketRateLimiter({
        windowMs: this.options.rateLimitWindowMs,
        maxRequests: this.options.rateLimitMaxRequests,
      });
    }

    // Initialize REST API if enabled
    if (this.options.enableRestApi) {
      this.restApi = new A2ACoopRestApi(this.coop);
    }

    // Create HTTP server for health checks and REST API
    this.httpServer = createServer((req, res) => this.handleHttpRequest(req, res));
    
    // Create WebSocket server attached to HTTP server
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.setupWebSocketServer();
  }

  /**
   * Start the server
   */
  start(): void {
    this.httpServer.listen(this.port, () => {
      console.log(`A2A-Coop server listening on port ${this.port}`);
      if (this.options.enableHealthCheck) {
        console.log(`Health check available at http://localhost:${this.port}/health`);
      }
      if (this.options.enableRestApi) {
        console.log(`REST API available at http://localhost:${this.port}/api`);
      }
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all WebSocket connections
      for (const [ws] of this.clients) {
        ws.close();
      }
      this.clients.clear();
      this.agentConnections.clear();

      // Close servers
      this.wss.close(() => {
        this.httpServer.close(() => {
          console.log('A2A-Coop server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    const status = this.coop.getStatus();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime: Date.now() - this.startTime,
      components: {
        websocket: this.wss && this.httpServer.listening ? 'connected' : 'disconnected',
        registry: 'ok',
        messageBus: 'ok',
        taskOrchestrator: 'ok',
      },
      metrics: {
        ...status,
        connections: this.clients.size,
      },
    };
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || '/';

    // Route API requests to REST API
    if (this.restApi && url.startsWith('/api/')) {
      this.restApi.handleRequest(req, res);
      return;
    }

    // Enable CORS for non-API routes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (url === '/health' && this.options.enableHealthCheck) {
      const health = this.getHealthStatus();
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(health, null, 2));
      return;
    }

    // Root endpoint - basic info
    if (url === '/') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({
        name: 'A2A-Coop',
        version: '0.2.0',
        description: 'Agent-to-Agent Collaboration Engine',
        endpoints: {
          websocket: `ws://localhost:${this.port}`,
          health: `http://localhost:${this.port}/health`,
          api: `http://localhost:${this.port}/api`,
        },
      }, null, 2));
      return;
    }

    // 404 for unknown paths
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      // Check rate limit
      if (this.rateLimiter && !this.rateLimiter.checkWebSocketLimit(ws)) {
        const remainingTime = this.rateLimiter.getWebSocketTimeUntilReset(ws);
        this.sendError(ws, `Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000)}s`, 'connection');
        ws.close(1008, 'Rate limit exceeded');
        return;
      }

      console.log('New client connected');
      this.clients.set(ws, { subscriptions: new Set() });

      ws.on('message', (data: Buffer) => {
        // Check rate limit for each message
        if (this.rateLimiter && !this.rateLimiter.checkWebSocketLimit(ws)) {
          const remainingTime = this.rateLimiter.getWebSocketTimeUntilReset(ws);
          this.sendError(ws, `Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000)}s`, 'rate_limit');
          return;
        }

        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          this.sendError(ws, 'Invalid JSON', 'unknown');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: WSMessage): void {
    const { id, type, payload } = message;

    try {
      switch (type) {
        // Agent operations
        case 'agent.register':
          this.handleAgentRegister(ws, id, payload as AgentRegistration);
          break;
        case 'agent.unregister':
          this.handleAgentUnregister(ws, id, payload as { agentId: AgentId });
          break;
        case 'agent.list':
          this.handleAgentList(ws, id);
          break;
        case 'agent.get':
          this.handleAgentGet(ws, id, payload as { agentId: AgentId });
          break;

        // Task operations
        case 'task.create':
          this.handleTaskCreate(ws, id, payload as { request: TaskRequest; createdBy: AgentId });
          break;
        case 'task.assign':
          this.handleTaskAssign(ws, id, payload as { taskId: TaskId; agentId: AgentId });
          break;
        case 'task.start':
          this.handleTaskStart(ws, id, payload as { taskId: TaskId });
          break;
        case 'task.complete':
          this.handleTaskComplete(ws, id, payload as {
            taskId: TaskId;
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
            };
          });
          break;
        case 'task.cancel':
          this.handleTaskCancel(ws, id, payload as { taskId: TaskId; reason?: string });
          break;
        case 'task.get':
          this.handleTaskGet(ws, id, payload as { taskId: TaskId });
          break;
        case 'task.list':
          this.handleTaskList(ws, id);
          break;

        // Context operations
        case 'context.create':
          this.handleContextCreate(ws, id, payload as { request: ContextCreateRequest; createdBy: AgentId });
          break;
        case 'context.get':
          this.handleContextGet(ws, id, payload as { contextId: ContextId });
          break;
        case 'context.update':
          this.handleContextUpdate(ws, id, payload as {
            contextId: ContextId;
            updates: Record<string, unknown>;
            updatedBy: AgentId;
          });
          break;
        case 'context.list':
          this.handleContextList(ws, id);
          break;

        // Message operations
        case 'message.send':
          this.handleMessageSend(ws, id, payload as {
            from: AgentId;
            to: AgentId;
            content: string;
            data?: Record<string, unknown>;
          });
          break;
        case 'message.broadcast':
          this.handleMessageBroadcast(ws, id, payload as {
            from: AgentId;
            event: string;
            data: Record<string, unknown>;
          });
          break;
        case 'message.subscribe':
          this.handleMessageSubscribe(ws, id, payload as { agentId: AgentId });
          break;

        // Status
        case 'status.get':
          this.handleStatusGet(ws, id);
          break;

        default:
          this.sendError(ws, `Unknown message type: ${type}`, id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.sendError(ws, errorMessage, id);
    }
  }

  // ==================== Agent Handlers ====================

  private handleAgentRegister(ws: WebSocket, id: string, registration: AgentRegistration): void {
    const agent = this.coop.registerAgent(registration);
    this.agentConnections.set(agent.id, ws);

    // Update client info
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      clientInfo.agentId = agent.id;
    }

    this.sendResponse(ws, id, { agent });
  }

  private handleAgentUnregister(ws: WebSocket, id: string, payload: { agentId: AgentId }): void {
    const success = this.coop.unregisterAgent(payload.agentId);
    this.agentConnections.delete(payload.agentId);
    this.sendResponse(ws, id, { success });
  }

  private handleAgentList(ws: WebSocket, id: string): void {
    const agents = this.coop.getAllAgents();
    this.sendResponse(ws, id, { agents });
  }

  private handleAgentGet(ws: WebSocket, id: string, payload: { agentId: AgentId }): void {
    const agent = this.coop.getAgent(payload.agentId);
    this.sendResponse(ws, id, { agent });
  }

  // ==================== Task Handlers ====================

  private handleTaskCreate(
    ws: WebSocket,
    id: string,
    payload: { request: TaskRequest; createdBy: AgentId }
  ): void {
    const task = this.coop.createTask(payload.request, payload.createdBy);
    this.sendResponse(ws, id, { task });
  }

  private handleTaskAssign(
    ws: WebSocket,
    id: string,
    payload: { taskId: TaskId; agentId: AgentId }
  ): void {
    const success = this.coop.assignTask(payload.taskId, payload.agentId);
    this.sendResponse(ws, id, { success });
  }

  private handleTaskStart(ws: WebSocket, id: string, payload: { taskId: TaskId }): void {
    const success = this.coop.startTask(payload.taskId);
    this.sendResponse(ws, id, { success });
  }

  private handleTaskComplete(
    ws: WebSocket,
    id: string,
    payload: {
      taskId: TaskId;
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
      };
    }
  ): void {
    const success = this.coop.completeTask(payload.taskId, payload.result);
    this.sendResponse(ws, id, { success });
  }

  private handleTaskCancel(
    ws: WebSocket,
    id: string,
    payload: { taskId: TaskId; reason?: string }
  ): void {
    const success = this.coop.cancelTask(payload.taskId, payload.reason);
    this.sendResponse(ws, id, { success });
  }

  private handleTaskGet(ws: WebSocket, id: string, payload: { taskId: TaskId }): void {
    const task = this.coop.getTask(payload.taskId);
    this.sendResponse(ws, id, { task });
  }

  private handleTaskList(ws: WebSocket, id: string): void {
    const tasks = this.coop.getAllTasks();
    this.sendResponse(ws, id, { tasks });
  }

  // ==================== Context Handlers ====================

  private handleContextCreate(
    ws: WebSocket,
    id: string,
    payload: { request: ContextCreateRequest; createdBy: AgentId }
  ): void {
    const context = this.coop.createContext(payload.request, payload.createdBy);
    this.sendResponse(ws, id, { context });
  }

  private handleContextGet(ws: WebSocket, id: string, payload: { contextId: ContextId }): void {
    const context = this.coop.getContext(payload.contextId);
    this.sendResponse(ws, id, { context });
  }

  private handleContextUpdate(
    ws: WebSocket,
    id: string,
    payload: {
      contextId: ContextId;
      updates: Record<string, unknown>;
      updatedBy: AgentId;
    }
  ): void {
    const context = this.coop.updateContext(payload.contextId, payload.updates, payload.updatedBy);
    this.sendResponse(ws, id, { context });
  }

  private handleContextList(ws: WebSocket, id: string): void {
    const contexts = this.coop.context.getAll();
    this.sendResponse(ws, id, { contexts });
  }

  // ==================== Message Handlers ====================

  private handleMessageSend(
    ws: WebSocket,
    id: string,
    payload: {
      from: AgentId;
      to: AgentId;
      content: string;
      data?: Record<string, unknown>;
    }
  ): void {
    const message = this.coop.sendMessage(payload.from, payload.to, payload.content, payload.data);
    this.sendResponse(ws, id, { message });
  }

  private handleMessageBroadcast(
    ws: WebSocket,
    id: string,
    payload: {
      from: AgentId;
      event: string;
      data: Record<string, unknown>;
    }
  ): void {
    const message = this.coop.broadcastMessage(payload.from, payload.event, payload.data);
    this.sendResponse(ws, id, { message });
  }

  private handleMessageSubscribe(ws: WebSocket, id: string, payload: { agentId: AgentId }): void {
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      clientInfo.subscriptions.add(payload.agentId);
    }

    // Subscribe to messages for this agent
    this.coop.subscribeToMessages(payload.agentId, (message) => {
      this.sendEvent(ws, 'message.received', { message });
    });

    this.sendResponse(ws, id, { success: true });
  }

  // ==================== Status Handlers ====================

  private handleStatusGet(ws: WebSocket, id: string): void {
    const status = this.coop.getStatus();
    this.sendResponse(ws, id, { status });
  }

  // ==================== Helper Methods ====================

  private sendResponse(ws: WebSocket, requestId: string, payload: unknown): void {
    const response: WSResponse = {
      id: crypto.randomUUID(),
      type: 'response',
      requestId,
      payload,
    };
    ws.send(JSON.stringify(response));
  }

  private sendError(ws: WebSocket, error: string, requestId: string): void {
    const response: WSResponse = {
      id: crypto.randomUUID(),
      type: 'error',
      requestId,
      payload: { error },
    };
    ws.send(JSON.stringify(response));
  }

  private sendEvent(ws: WebSocket, eventType: string, payload: Record<string, unknown>): void {
    const response: WSResponse = {
      id: crypto.randomUUID(),
      type: 'event',
      payload: { eventType, ...payload },
    };
    ws.send(JSON.stringify(response));
  }

  private handleDisconnect(ws: WebSocket): void {
    const clientInfo = this.clients.get(ws);
    
    if (clientInfo?.agentId) {
      // Update agent status to offline
      this.coop.registry.updateStatus(clientInfo.agentId, 'offline');
      this.agentConnections.delete(clientInfo.agentId);
    }

    this.clients.delete(ws);
    console.log('Client disconnected');
  }
}

interface ClientInfo {
  agentId?: AgentId;
  subscriptions: Set<AgentId>;
}
