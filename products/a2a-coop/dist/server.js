"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2ACoopServer = void 0;
const ws_1 = require("ws");
const index_1 = require("./index");
/**
 * A2ACoopServer provides a WebSocket API for the A2A-Coop system.
 *
 * This allows external agents and clients to:
 * - Register agents
 * - Create and manage tasks
 * - Send messages
 * - Subscribe to events
 * - Query system state
 */
class A2ACoopServer {
    port;
    wss;
    coop;
    clients = new Map();
    agentConnections = new Map();
    constructor(port = 8080, options = {}) {
        this.port = port;
        this.coop = new index_1.A2ACoop(options);
        this.wss = new ws_1.WebSocketServer({ port });
        this.setupWebSocketServer();
    }
    /**
     * Start the server
     */
    start() {
        console.log(`A2A-Coop server listening on port ${this.port}`);
    }
    /**
     * Stop the server
     */
    stop() {
        return new Promise((resolve) => {
            this.wss.close(() => {
                console.log('A2A-Coop server stopped');
                resolve();
            });
        });
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws) => {
            console.log('New client connected');
            this.clients.set(ws, { subscriptions: new Set() });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                }
                catch (err) {
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
    handleMessage(ws, message) {
        const { id, type, payload } = message;
        try {
            switch (type) {
                // Agent operations
                case 'agent.register':
                    this.handleAgentRegister(ws, id, payload);
                    break;
                case 'agent.unregister':
                    this.handleAgentUnregister(ws, id, payload);
                    break;
                case 'agent.list':
                    this.handleAgentList(ws, id);
                    break;
                case 'agent.get':
                    this.handleAgentGet(ws, id, payload);
                    break;
                // Task operations
                case 'task.create':
                    this.handleTaskCreate(ws, id, payload);
                    break;
                case 'task.assign':
                    this.handleTaskAssign(ws, id, payload);
                    break;
                case 'task.start':
                    this.handleTaskStart(ws, id, payload);
                    break;
                case 'task.complete':
                    this.handleTaskComplete(ws, id, payload);
                    break;
                case 'task.cancel':
                    this.handleTaskCancel(ws, id, payload);
                    break;
                case 'task.get':
                    this.handleTaskGet(ws, id, payload);
                    break;
                case 'task.list':
                    this.handleTaskList(ws, id);
                    break;
                // Context operations
                case 'context.create':
                    this.handleContextCreate(ws, id, payload);
                    break;
                case 'context.get':
                    this.handleContextGet(ws, id, payload);
                    break;
                case 'context.update':
                    this.handleContextUpdate(ws, id, payload);
                    break;
                case 'context.list':
                    this.handleContextList(ws, id);
                    break;
                // Message operations
                case 'message.send':
                    this.handleMessageSend(ws, id, payload);
                    break;
                case 'message.broadcast':
                    this.handleMessageBroadcast(ws, id, payload);
                    break;
                case 'message.subscribe':
                    this.handleMessageSubscribe(ws, id, payload);
                    break;
                // Status
                case 'status.get':
                    this.handleStatusGet(ws, id);
                    break;
                default:
                    this.sendError(ws, `Unknown message type: ${type}`, id);
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            this.sendError(ws, errorMessage, id);
        }
    }
    // ==================== Agent Handlers ====================
    handleAgentRegister(ws, id, registration) {
        const agent = this.coop.registerAgent(registration);
        this.agentConnections.set(agent.id, ws);
        // Update client info
        const clientInfo = this.clients.get(ws);
        if (clientInfo) {
            clientInfo.agentId = agent.id;
        }
        this.sendResponse(ws, id, { agent });
    }
    handleAgentUnregister(ws, id, payload) {
        const success = this.coop.unregisterAgent(payload.agentId);
        this.agentConnections.delete(payload.agentId);
        this.sendResponse(ws, id, { success });
    }
    handleAgentList(ws, id) {
        const agents = this.coop.getAllAgents();
        this.sendResponse(ws, id, { agents });
    }
    handleAgentGet(ws, id, payload) {
        const agent = this.coop.getAgent(payload.agentId);
        this.sendResponse(ws, id, { agent });
    }
    // ==================== Task Handlers ====================
    handleTaskCreate(ws, id, payload) {
        const task = this.coop.createTask(payload.request, payload.createdBy);
        this.sendResponse(ws, id, { task });
    }
    handleTaskAssign(ws, id, payload) {
        const success = this.coop.assignTask(payload.taskId, payload.agentId);
        this.sendResponse(ws, id, { success });
    }
    handleTaskStart(ws, id, payload) {
        const success = this.coop.startTask(payload.taskId);
        this.sendResponse(ws, id, { success });
    }
    handleTaskComplete(ws, id, payload) {
        const success = this.coop.completeTask(payload.taskId, payload.result);
        this.sendResponse(ws, id, { success });
    }
    handleTaskCancel(ws, id, payload) {
        const success = this.coop.cancelTask(payload.taskId, payload.reason);
        this.sendResponse(ws, id, { success });
    }
    handleTaskGet(ws, id, payload) {
        const task = this.coop.getTask(payload.taskId);
        this.sendResponse(ws, id, { task });
    }
    handleTaskList(ws, id) {
        const tasks = this.coop.getAllTasks();
        this.sendResponse(ws, id, { tasks });
    }
    // ==================== Context Handlers ====================
    handleContextCreate(ws, id, payload) {
        const context = this.coop.createContext(payload.request, payload.createdBy);
        this.sendResponse(ws, id, { context });
    }
    handleContextGet(ws, id, payload) {
        const context = this.coop.getContext(payload.contextId);
        this.sendResponse(ws, id, { context });
    }
    handleContextUpdate(ws, id, payload) {
        const context = this.coop.updateContext(payload.contextId, payload.updates, payload.updatedBy);
        this.sendResponse(ws, id, { context });
    }
    handleContextList(ws, id) {
        const contexts = this.coop.context.getAll();
        this.sendResponse(ws, id, { contexts });
    }
    // ==================== Message Handlers ====================
    handleMessageSend(ws, id, payload) {
        const message = this.coop.sendMessage(payload.from, payload.to, payload.content, payload.data);
        this.sendResponse(ws, id, { message });
    }
    handleMessageBroadcast(ws, id, payload) {
        const message = this.coop.broadcastMessage(payload.from, payload.event, payload.data);
        this.sendResponse(ws, id, { message });
    }
    handleMessageSubscribe(ws, id, payload) {
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
    handleStatusGet(ws, id) {
        const status = this.coop.getStatus();
        this.sendResponse(ws, id, { status });
    }
    // ==================== Helper Methods ====================
    sendResponse(ws, requestId, payload) {
        const response = {
            id: crypto.randomUUID(),
            type: 'response',
            requestId,
            payload,
        };
        ws.send(JSON.stringify(response));
    }
    sendError(ws, error, requestId) {
        const response = {
            id: crypto.randomUUID(),
            type: 'error',
            requestId,
            payload: { error },
        };
        ws.send(JSON.stringify(response));
    }
    sendEvent(ws, eventType, payload) {
        const response = {
            id: crypto.randomUUID(),
            type: 'event',
            payload: { eventType, ...payload },
        };
        ws.send(JSON.stringify(response));
    }
    handleDisconnect(ws) {
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
exports.A2ACoopServer = A2ACoopServer;
//# sourceMappingURL=server.js.map