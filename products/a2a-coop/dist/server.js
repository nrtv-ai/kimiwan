"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2ACoopServer = void 0;
const ws_1 = require("ws");
const http_1 = require("http");
const index_1 = require("./index");
const rateLimiter_1 = require("./rateLimiter");
const restApi_1 = require("./restApi");
const auth_1 = require("./auth");
const metrics_1 = require("./metrics");
const storage_1 = require("./storage");
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
class A2ACoopServer {
    port;
    wss;
    httpServer;
    coop;
    clients = new Map();
    agentConnections = new Map();
    rateLimiter;
    restApi;
    options;
    startTime = Date.now();
    authManager;
    metrics;
    storage;
    constructor(port = 8080, options = {}) {
        this.port = port;
        this.options = {
            maxMessageHistory: 1000,
            enableRateLimiting: true,
            enableHealthCheck: true,
            enableRestApi: true,
            enableMetrics: true,
            ...options,
        };
        // Initialize auth manager
        this.authManager = new auth_1.AuthManager(this.options.auth || (0, auth_1.createAuthConfigFromEnv)());
        // Initialize metrics
        this.metrics = (0, metrics_1.createMetricsCollector)();
        // Initialize storage if configured
        if (this.options.storage) {
            this.storage = (0, storage_1.createStorage)(this.options.storage);
        }
        this.coop = new index_1.A2ACoop({ maxMessageHistory: this.options.maxMessageHistory });
        // Initialize rate limiter if enabled
        if (this.options.enableRateLimiting) {
            this.rateLimiter = new rateLimiter_1.WebSocketRateLimiter({
                windowMs: this.options.rateLimitWindowMs,
                maxRequests: this.options.rateLimitMaxRequests,
            });
        }
        // Initialize REST API if enabled
        if (this.options.enableRestApi) {
            this.restApi = new restApi_1.A2ACoopRestApi(this.coop);
        }
        // Create HTTP server for health checks and REST API
        this.httpServer = (0, http_1.createServer)((req, res) => this.handleHttpRequest(req, res));
        // Create WebSocket server attached to HTTP server
        this.wss = new ws_1.WebSocketServer({ server: this.httpServer });
        this.setupWebSocketServer();
    }
    /**
     * Start the server
     */
    async start() {
        // Connect to storage if configured
        if (this.storage) {
            await this.storage.connect();
            console.log('Connected to storage');
        }
        return new Promise((resolve) => {
            this.httpServer.listen(this.port, () => {
                console.log(`A2A-Coop server listening on port ${this.port}`);
                if (this.options.enableHealthCheck) {
                    console.log(`Health check available at http://localhost:${this.port}/health`);
                }
                if (this.options.enableRestApi) {
                    console.log(`REST API available at http://localhost:${this.port}/api`);
                }
                if (this.options.enableMetrics) {
                    console.log(`Metrics available at http://localhost:${this.port}/metrics`);
                }
                resolve();
            });
        });
    }
    /**
     * Stop the server
     */
    async stop() {
        // Disconnect from storage
        if (this.storage) {
            await this.storage.disconnect();
        }
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
    getHealthStatus() {
        const status = this.coop.getStatus();
        const metrics = this.metrics.getMetrics();
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '0.2.0',
            uptime: Date.now() - this.startTime,
            components: {
                websocket: this.wss && this.httpServer.listening ? 'connected' : 'disconnected',
                registry: 'ok',
                messageBus: 'ok',
                taskOrchestrator: 'ok',
                storage: this.storage?.isConnected() ? 'connected' : 'memory',
            },
            metrics: {
                ...status,
                connections: this.clients.size,
                requests: metrics.requests,
                tasks: metrics.tasks,
            },
        };
    }
    handleHttpRequest(req, res) {
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
        // Metrics endpoint (Prometheus format)
        if (url === '/metrics' && this.options.enableMetrics) {
            const prometheusMetrics = this.metrics.getPrometheusMetrics();
            res.setHeader('Content-Type', 'text/plain');
            res.writeHead(200);
            res.end(prometheusMetrics);
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
                    metrics: `http://localhost:${this.port}/metrics`,
                },
            }, null, 2));
            return;
        }
        // 404 for unknown paths
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws) => {
            // Check rate limit
            if (this.rateLimiter && !this.rateLimiter.checkWebSocketLimit(ws)) {
                const remainingTime = this.rateLimiter.getWebSocketTimeUntilReset(ws);
                this.sendError(ws, `Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000)}s`, 'connection');
                ws.close(1008, 'Rate limit exceeded');
                return;
            }
            console.log('New client connected');
            this.clients.set(ws, { subscriptions: new Set() });
            ws.on('message', (data) => {
                // Check rate limit for each message
                if (this.rateLimiter && !this.rateLimiter.checkWebSocketLimit(ws)) {
                    const remainingTime = this.rateLimiter.getWebSocketTimeUntilReset(ws);
                    this.sendError(ws, `Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000)}s`, 'rate_limit');
                    return;
                }
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