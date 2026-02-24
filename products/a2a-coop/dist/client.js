"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2ACoopClient = void 0;
const ws_1 = __importDefault(require("ws"));
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
class A2ACoopClient {
    url;
    ws = null;
    pendingRequests = new Map();
    eventHandlers = new Map();
    messageQueue = [];
    connected = false;
    constructor(url) {
        this.url = url;
    }
    /**
     * Connect to the server
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new ws_1.default(this.url);
            this.ws.on('open', () => {
                console.log('Connected to A2A-Coop server');
                this.connected = true;
                this.flushMessageQueue();
                resolve();
            });
            this.ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    this.handleResponse(response);
                }
                catch (err) {
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
    disconnect() {
        this.ws?.close();
        this.ws = null;
        this.connected = false;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
    // ==================== Agent Operations ====================
    async registerAgent(registration) {
        const response = await this.sendRequest('agent.register', registration);
        return response.agent;
    }
    async unregisterAgent(agentId) {
        const response = await this.sendRequest('agent.unregister', { agentId });
        return response.success;
    }
    async listAgents() {
        const response = await this.sendRequest('agent.list', {});
        return response.agents;
    }
    async getAgent(agentId) {
        const response = await this.sendRequest('agent.get', { agentId });
        return response.agent;
    }
    // ==================== Task Operations ====================
    async createTask(request, createdBy) {
        const response = await this.sendRequest('task.create', { request, createdBy });
        return response.task;
    }
    async assignTask(taskId, agentId) {
        const response = await this.sendRequest('task.assign', { taskId, agentId });
        return response.success;
    }
    async startTask(taskId) {
        const response = await this.sendRequest('task.start', { taskId });
        return response.success;
    }
    async completeTask(taskId, result) {
        const response = await this.sendRequest('task.complete', { taskId, result });
        return response.success;
    }
    async cancelTask(taskId, reason) {
        const response = await this.sendRequest('task.cancel', { taskId, reason });
        return response.success;
    }
    async getTask(taskId) {
        const response = await this.sendRequest('task.get', { taskId });
        return response.task;
    }
    async listTasks() {
        const response = await this.sendRequest('task.list', {});
        return response.tasks;
    }
    // ==================== Context Operations ====================
    async createContext(request, createdBy) {
        const response = await this.sendRequest('context.create', { request, createdBy });
        return response.context;
    }
    async getContext(contextId) {
        const response = await this.sendRequest('context.get', { contextId });
        return response.context;
    }
    async updateContext(contextId, updates, updatedBy) {
        const response = await this.sendRequest('context.update', { contextId, updates, updatedBy });
        return response.context;
    }
    async listContexts() {
        const response = await this.sendRequest('context.list', {});
        return response.contexts;
    }
    // ==================== Message Operations ====================
    async sendMessage(from, to, content, data) {
        const response = await this.sendRequest('message.send', { from, to, content, data });
        return response.message;
    }
    async broadcastMessage(from, event, data) {
        const response = await this.sendRequest('message.broadcast', { from, event, data });
        return response.message;
    }
    async subscribeToMessages(agentId, handler) {
        this.on('message.received', handler);
        await this.sendRequest('message.subscribe', { agentId });
    }
    // ==================== Status Operations ====================
    async getStatus() {
        const response = await this.sendRequest('status.get', {});
        return response.status;
    }
    // ==================== Event Handling ====================
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    // ==================== Private Methods ====================
    sendRequest(type, payload) {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            const message = { id, type, payload };
            this.pendingRequests.set(id, { resolve, reject });
            if (this.connected && this.ws) {
                this.ws.send(JSON.stringify(message));
            }
            else {
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
    handleResponse(response) {
        if (response.type === 'event') {
            this.handleEvent(response.payload);
            return;
        }
        if (response.requestId) {
            const pending = this.pendingRequests.get(response.requestId);
            if (pending) {
                this.pendingRequests.delete(response.requestId);
                if (response.type === 'error') {
                    pending.reject(new Error(response.payload.error));
                }
                else {
                    pending.resolve(response.payload);
                }
            }
        }
    }
    handleEvent(payload) {
        const handlers = this.eventHandlers.get(payload.eventType);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(payload);
                }
                catch (err) {
                    console.error(`Error in event handler for ${payload.eventType}:`, err);
                }
            }
        }
    }
    flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.ws) {
            const message = this.messageQueue.shift();
            if (message) {
                this.ws.send(JSON.stringify(message));
            }
        }
    }
}
exports.A2ACoopClient = A2ACoopClient;
//# sourceMappingURL=client.js.map