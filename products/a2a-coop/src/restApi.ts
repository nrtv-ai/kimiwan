import { createServer, IncomingMessage, ServerResponse } from 'http';
import { A2ACoop } from './index';
import {
  AgentId,
  TaskId,
  ContextId,
  AgentRegistration,
  TaskRequest,
  ContextCreateRequest,
} from './types';

/**
 * HTTP REST API for A2A-Coop
 * 
 * Provides simple HTTP endpoints for:
 * - Agent management (CRUD)
 * - Task management (CRUD + lifecycle)
 * - Context management (CRUD)
 * - Messaging (send/broadcast)
 * - System status
 * 
 * This complements the WebSocket API for simpler integrations
 * that don't need real-time bidirectional communication.
 */
export class A2ACoopRestApi {
  private coop: A2ACoop;

  constructor(private a2aCoop: A2ACoop) {
    this.coop = a2aCoop;
  }

  /**
   * Handle an HTTP request
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method || 'GET';

    // Parse request body for POST/PUT/PATCH
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      this.parseBody(req, (body) => {
        this.routeRequest(method, path, url, body, res);
      });
    } else {
      this.routeRequest(method, path, url, null, res);
    }
  }

  private routeRequest(
    method: string,
    path: string,
    url: URL,
    body: Record<string, unknown> | null,
    res: ServerResponse
  ): void {
    try {
      // Agents API
      if (path === '/api/agents') {
        if (method === 'GET') {
          this.listAgents(res);
          return;
        }
        if (method === 'POST') {
          this.createAgent(body, res);
          return;
        }
      }

      if (path.startsWith('/api/agents/')) {
        const agentId = path.split('/')[3] as AgentId;
        
        if (method === 'GET') {
          this.getAgent(agentId, res);
          return;
        }
        if (method === 'DELETE') {
          this.deleteAgent(agentId, res);
          return;
        }
      }

      // Tasks API
      if (path === '/api/tasks') {
        if (method === 'GET') {
          this.listTasks(res);
          return;
        }
        if (method === 'POST') {
          this.createTask(body as { request: TaskRequest; createdBy: AgentId }, res);
          return;
        }
      }

      if (path.startsWith('/api/tasks/')) {
        const parts = path.split('/');
        const taskId = parts[3] as TaskId;
        const action = parts[4];

        if (method === 'GET' && !action) {
          this.getTask(taskId, res);
          return;
        }

        if (method === 'POST') {
          if (action === 'assign') {
            this.assignTask(taskId, body as { agentId: AgentId }, res);
            return;
          }
          if (action === 'start') {
            this.startTask(taskId, res);
            return;
          }
          if (action === 'complete') {
            this.completeTask(taskId, body as {
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
            }, res);
            return;
          }
          if (action === 'cancel') {
            this.cancelTask(taskId, body as { reason?: string }, res);
            return;
          }
        }
      }

      // Contexts API
      if (path === '/api/contexts') {
        if (method === 'GET') {
          this.listContexts(res);
          return;
        }
        if (method === 'POST') {
          this.createContext(body as { request: ContextCreateRequest; createdBy: AgentId }, res);
          return;
        }
      }

      if (path.startsWith('/api/contexts/')) {
        const parts = path.split('/');
        const contextId = parts[3] as ContextId;
        const action = parts[4];

        if (method === 'GET' && !action) {
          this.getContext(contextId, res);
          return;
        }

        if (method === 'PATCH' && action === 'update') {
          this.updateContext(contextId, body as { updates: Record<string, unknown>; updatedBy: AgentId }, res);
          return;
        }
      }

      // Messages API
      if (path === '/api/messages/send') {
        if (method === 'POST') {
          this.sendMessage(body as {
            from: AgentId;
            to: AgentId;
            content: string;
            data?: Record<string, unknown>;
          }, res);
          return;
        }
      }

      if (path === '/api/messages/broadcast') {
        if (method === 'POST') {
          this.broadcastMessage(body as {
            from: AgentId;
            event: string;
            data: Record<string, unknown>;
          }, res);
          return;
        }
      }

      // Status API
      if (path === '/api/status') {
        if (method === 'GET') {
          this.getStatus(res);
          return;
        }
      }

      // 404 Not Found
      this.sendError(res, 404, 'Not found');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      this.sendError(res, 500, message);
    }
  }

  // ==================== Agent Handlers ====================

  private listAgents(res: ServerResponse): void {
    const agents = this.coop.getAllAgents();
    this.sendJson(res, 200, { agents });
  }

  private getAgent(agentId: AgentId, res: ServerResponse): void {
    const agent = this.coop.getAgent(agentId);
    if (!agent) {
      this.sendError(res, 404, 'Agent not found');
      return;
    }
    this.sendJson(res, 200, { agent });
  }

  private createAgent(body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || !body.name) {
      this.sendError(res, 400, 'Missing required field: name');
      return;
    }
    const registration: AgentRegistration = {
      name: body.name as string,
      description: (body.description as string) || '',
      capabilities: (body.capabilities as string[]) || [],
      metadata: body.metadata as Record<string, unknown> | undefined,
    };
    const agent = this.coop.registerAgent(registration);
    this.sendJson(res, 201, { agent });
  }

  private deleteAgent(agentId: AgentId, res: ServerResponse): void {
    const success = this.coop.unregisterAgent(agentId);
    if (!success) {
      this.sendError(res, 404, 'Agent not found');
      return;
    }
    this.sendJson(res, 200, { success: true });
  }

  // ==================== Task Handlers ====================

  private listTasks(res: ServerResponse): void {
    const tasks = this.coop.getAllTasks();
    this.sendJson(res, 200, { tasks });
  }

  private getTask(taskId: TaskId, res: ServerResponse): void {
    const task = this.coop.getTask(taskId);
    if (!task) {
      this.sendError(res, 404, 'Task not found');
      return;
    }
    this.sendJson(res, 200, { task });
  }

  private createTask(body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || !body.request || !body.createdBy) {
      this.sendError(res, 400, 'Missing required fields: request, createdBy');
      return;
    }
    const request = body.request as TaskRequest;
    const createdBy = body.createdBy as AgentId;
    const task = this.coop.createTask(request, createdBy);
    this.sendJson(res, 201, { task });
  }

  private assignTask(taskId: TaskId, body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || !body.agentId) {
      this.sendError(res, 400, 'Missing required field: agentId');
      return;
    }
    const agentId = body.agentId as AgentId;
    const success = this.coop.assignTask(taskId, agentId);
    if (!success) {
      this.sendError(res, 404, 'Task or agent not found');
      return;
    }
    this.sendJson(res, 200, { success: true });
  }

  private startTask(taskId: TaskId, res: ServerResponse): void {
    const success = this.coop.startTask(taskId);
    if (!success) {
      this.sendError(res, 404, 'Task not found');
      return;
    }
    this.sendJson(res, 200, { success: true });
  }

  private completeTask(taskId: TaskId, body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || typeof body.success !== 'boolean') {
      this.sendError(res, 400, 'Missing required field: success');
      return;
    }
    const success = this.coop.completeTask(taskId, {
      success: body.success as boolean,
      data: body.data as Record<string, unknown> | undefined,
      error: body.error as string | undefined,
      logs: body.logs as string[] | undefined,
      artifacts: body.artifacts as Array<{
        type: string;
        name: string;
        content: unknown;
        metadata?: Record<string, unknown>;
      }> | undefined,
    });
    if (!success) {
      this.sendError(res, 404, 'Task not found');
      return;
    }
    this.sendJson(res, 200, { success: true });
  }

  private cancelTask(taskId: TaskId, body: Record<string, unknown> | null, res: ServerResponse): void {
    const reason = body?.reason as string | undefined;
    const success = this.coop.cancelTask(taskId, reason);
    if (!success) {
      this.sendError(res, 404, 'Task not found');
      return;
    }
    this.sendJson(res, 200, { success: true, reason });
  }

  // ==================== Context Handlers ====================

  private listContexts(res: ServerResponse): void {
    const contexts = this.coop.context.getAll();
    this.sendJson(res, 200, { contexts });
  }

  private getContext(contextId: ContextId, res: ServerResponse): void {
    const context = this.coop.getContext(contextId);
    if (!context) {
      this.sendError(res, 404, 'Context not found');
      return;
    }
    this.sendJson(res, 200, { context });
  }

  private createContext(body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || !body.request || !body.createdBy) {
      this.sendError(res, 400, 'Missing required fields: request, createdBy');
      return;
    }
    const request = body.request as ContextCreateRequest;
    const createdBy = body.createdBy as AgentId;
    const context = this.coop.createContext(request, createdBy);
    this.sendJson(res, 201, { context });
  }

  private updateContext(contextId: ContextId, body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || !body.updates || !body.updatedBy) {
      this.sendError(res, 400, 'Missing required fields: updates, updatedBy');
      return;
    }
    const updates = body.updates as Record<string, unknown>;
    const updatedBy = body.updatedBy as AgentId;
    const context = this.coop.updateContext(contextId, updates, updatedBy);
    if (!context) {
      this.sendError(res, 404, 'Context not found');
      return;
    }
    this.sendJson(res, 200, { context });
  }

  // ==================== Message Handlers ====================

  private sendMessage(body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || !body.from || !body.to || !body.content) {
      this.sendError(res, 400, 'Missing required fields: from, to, content');
      return;
    }
    const from = body.from as AgentId;
    const to = body.to as AgentId;
    const content = body.content as string;
    const data = body.data as Record<string, unknown> | undefined;
    const message = this.coop.sendMessage(from, to, content, data);
    this.sendJson(res, 201, { message });
  }

  private broadcastMessage(body: Record<string, unknown> | null, res: ServerResponse): void {
    if (!body || !body.from || !body.event) {
      this.sendError(res, 400, 'Missing required fields: from, event');
      return;
    }
    const from = body.from as AgentId;
    const event = body.event as string;
    const data = body.data as Record<string, unknown> | undefined;
    const message = this.coop.broadcastMessage(from, event, data || {});
    this.sendJson(res, 201, { message });
  }

  // ==================== Status Handlers ====================

  private getStatus(res: ServerResponse): void {
    const status = this.coop.getStatus();
    this.sendJson(res, 200, { status });
  }

  // ==================== Helper Methods ====================

  private parseBody(
    req: IncomingMessage,
    callback: (body: Record<string, unknown> | null) => void
  ): void {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        const body = data ? JSON.parse(data) : null;
        callback(body);
      } catch {
        callback(null);
      }
    });
  }

  private sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(data, null, 2));
  }

  private sendError(res: ServerResponse, statusCode: number, message: string): void {
    this.sendJson(res, statusCode, { error: message, statusCode });
  }
}
