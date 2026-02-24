"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2ACoopRestApi = void 0;
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
class A2ACoopRestApi {
    a2aCoop;
    coop;
    constructor(a2aCoop) {
        this.a2aCoop = a2aCoop;
        this.coop = a2aCoop;
    }
    /**
     * Handle an HTTP request
     */
    handleRequest(req, res) {
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
        }
        else {
            this.routeRequest(method, path, url, null, res);
        }
    }
    routeRequest(method, path, url, body, res) {
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
                const agentId = path.split('/')[3];
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
                    this.createTask(body, res);
                    return;
                }
            }
            if (path.startsWith('/api/tasks/')) {
                const parts = path.split('/');
                const taskId = parts[3];
                const action = parts[4];
                if (method === 'GET' && !action) {
                    this.getTask(taskId, res);
                    return;
                }
                if (method === 'POST') {
                    if (action === 'assign') {
                        this.assignTask(taskId, body, res);
                        return;
                    }
                    if (action === 'start') {
                        this.startTask(taskId, res);
                        return;
                    }
                    if (action === 'complete') {
                        this.completeTask(taskId, body, res);
                        return;
                    }
                    if (action === 'cancel') {
                        this.cancelTask(taskId, body, res);
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
                    this.createContext(body, res);
                    return;
                }
            }
            if (path.startsWith('/api/contexts/')) {
                const parts = path.split('/');
                const contextId = parts[3];
                const action = parts[4];
                if (method === 'GET' && !action) {
                    this.getContext(contextId, res);
                    return;
                }
                if (method === 'PATCH' && action === 'update') {
                    this.updateContext(contextId, body, res);
                    return;
                }
            }
            // Messages API
            if (path === '/api/messages/send') {
                if (method === 'POST') {
                    this.sendMessage(body, res);
                    return;
                }
            }
            if (path === '/api/messages/broadcast') {
                if (method === 'POST') {
                    this.broadcastMessage(body, res);
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
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Internal server error';
            this.sendError(res, 500, message);
        }
    }
    // ==================== Agent Handlers ====================
    listAgents(res) {
        const agents = this.coop.getAllAgents();
        this.sendJson(res, 200, { agents });
    }
    getAgent(agentId, res) {
        const agent = this.coop.getAgent(agentId);
        if (!agent) {
            this.sendError(res, 404, 'Agent not found');
            return;
        }
        this.sendJson(res, 200, { agent });
    }
    createAgent(body, res) {
        if (!body || !body.name) {
            this.sendError(res, 400, 'Missing required field: name');
            return;
        }
        const registration = {
            name: body.name,
            description: body.description || '',
            capabilities: body.capabilities || [],
            metadata: body.metadata,
        };
        const agent = this.coop.registerAgent(registration);
        this.sendJson(res, 201, { agent });
    }
    deleteAgent(agentId, res) {
        const success = this.coop.unregisterAgent(agentId);
        if (!success) {
            this.sendError(res, 404, 'Agent not found');
            return;
        }
        this.sendJson(res, 200, { success: true });
    }
    // ==================== Task Handlers ====================
    listTasks(res) {
        const tasks = this.coop.getAllTasks();
        this.sendJson(res, 200, { tasks });
    }
    getTask(taskId, res) {
        const task = this.coop.getTask(taskId);
        if (!task) {
            this.sendError(res, 404, 'Task not found');
            return;
        }
        this.sendJson(res, 200, { task });
    }
    createTask(body, res) {
        if (!body || !body.request || !body.createdBy) {
            this.sendError(res, 400, 'Missing required fields: request, createdBy');
            return;
        }
        const request = body.request;
        const createdBy = body.createdBy;
        const task = this.coop.createTask(request, createdBy);
        this.sendJson(res, 201, { task });
    }
    assignTask(taskId, body, res) {
        if (!body || !body.agentId) {
            this.sendError(res, 400, 'Missing required field: agentId');
            return;
        }
        const agentId = body.agentId;
        const success = this.coop.assignTask(taskId, agentId);
        if (!success) {
            this.sendError(res, 404, 'Task or agent not found');
            return;
        }
        this.sendJson(res, 200, { success: true });
    }
    startTask(taskId, res) {
        const success = this.coop.startTask(taskId);
        if (!success) {
            this.sendError(res, 404, 'Task not found');
            return;
        }
        this.sendJson(res, 200, { success: true });
    }
    completeTask(taskId, body, res) {
        if (!body || typeof body.success !== 'boolean') {
            this.sendError(res, 400, 'Missing required field: success');
            return;
        }
        const success = this.coop.completeTask(taskId, {
            success: body.success,
            data: body.data,
            error: body.error,
            logs: body.logs,
            artifacts: body.artifacts,
        });
        if (!success) {
            this.sendError(res, 404, 'Task not found');
            return;
        }
        this.sendJson(res, 200, { success: true });
    }
    cancelTask(taskId, body, res) {
        const reason = body?.reason;
        const success = this.coop.cancelTask(taskId, reason);
        if (!success) {
            this.sendError(res, 404, 'Task not found');
            return;
        }
        this.sendJson(res, 200, { success: true, reason });
    }
    // ==================== Context Handlers ====================
    listContexts(res) {
        const contexts = this.coop.context.getAll();
        this.sendJson(res, 200, { contexts });
    }
    getContext(contextId, res) {
        const context = this.coop.getContext(contextId);
        if (!context) {
            this.sendError(res, 404, 'Context not found');
            return;
        }
        this.sendJson(res, 200, { context });
    }
    createContext(body, res) {
        if (!body || !body.request || !body.createdBy) {
            this.sendError(res, 400, 'Missing required fields: request, createdBy');
            return;
        }
        const request = body.request;
        const createdBy = body.createdBy;
        const context = this.coop.createContext(request, createdBy);
        this.sendJson(res, 201, { context });
    }
    updateContext(contextId, body, res) {
        if (!body || !body.updates || !body.updatedBy) {
            this.sendError(res, 400, 'Missing required fields: updates, updatedBy');
            return;
        }
        const updates = body.updates;
        const updatedBy = body.updatedBy;
        const context = this.coop.updateContext(contextId, updates, updatedBy);
        if (!context) {
            this.sendError(res, 404, 'Context not found');
            return;
        }
        this.sendJson(res, 200, { context });
    }
    // ==================== Message Handlers ====================
    sendMessage(body, res) {
        if (!body || !body.from || !body.to || !body.content) {
            this.sendError(res, 400, 'Missing required fields: from, to, content');
            return;
        }
        const from = body.from;
        const to = body.to;
        const content = body.content;
        const data = body.data;
        const message = this.coop.sendMessage(from, to, content, data);
        this.sendJson(res, 201, { message });
    }
    broadcastMessage(body, res) {
        if (!body || !body.from || !body.event) {
            this.sendError(res, 400, 'Missing required fields: from, event');
            return;
        }
        const from = body.from;
        const event = body.event;
        const data = body.data;
        const message = this.coop.broadcastMessage(from, event, data || {});
        this.sendJson(res, 201, { message });
    }
    // ==================== Status Handlers ====================
    getStatus(res) {
        const status = this.coop.getStatus();
        this.sendJson(res, 200, { status });
    }
    // ==================== Helper Methods ====================
    parseBody(req, callback) {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => {
            try {
                const body = data ? JSON.parse(data) : null;
                callback(body);
            }
            catch {
                callback(null);
            }
        });
    }
    sendJson(res, statusCode, data) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
        res.end(JSON.stringify(data, null, 2));
    }
    sendError(res, statusCode, message) {
        this.sendJson(res, statusCode, { error: message, statusCode });
    }
}
exports.A2ACoopRestApi = A2ACoopRestApi;
//# sourceMappingURL=restApi.js.map