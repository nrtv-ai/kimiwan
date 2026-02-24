import { AuthConfig } from './auth';
/**
 * WebSocket message types for client communication
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
 * Server configuration options
 */
export interface ServerOptions {
    maxMessageHistory?: number;
    enableRateLimiting?: boolean;
    rateLimitWindowMs?: number;
    rateLimitMaxRequests?: number;
    enableHealthCheck?: boolean;
    enableRestApi?: boolean;
    /** Authentication configuration */
    auth?: AuthConfig;
    /** Storage configuration */
    storage?: {
        type?: 'memory' | 'redis';
        redis?: {
            url?: string;
            host?: string;
            port?: number;
            password?: string;
        };
    };
    /** Enable metrics endpoint */
    enableMetrics?: boolean;
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
        storage: 'connected' | 'memory' | 'error';
    };
    metrics: {
        agents: number;
        tasks: {
            created: number;
            completed: number;
            failed: number;
            successRate: number;
            avgDuration: number;
        };
        contexts: number;
        messages: number;
        connections: number;
        requests?: {
            total: number;
            byType: Record<string, number>;
            errors: number;
            errorRate: number;
            avgDuration: number;
        };
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
export declare class A2ACoopServer {
    private port;
    private wss;
    private httpServer;
    private coop;
    private clients;
    private agentConnections;
    private rateLimiter?;
    private restApi?;
    private options;
    private startTime;
    private authManager;
    private metrics;
    private storage?;
    constructor(port?: number, options?: ServerOptions);
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get current health status
     */
    getHealthStatus(): HealthStatus;
    private handleHttpRequest;
    private setupWebSocketServer;
    private handleMessage;
    private handleAgentRegister;
    private handleAgentUnregister;
    private handleAgentList;
    private handleAgentGet;
    private handleTaskCreate;
    private handleTaskAssign;
    private handleTaskStart;
    private handleTaskComplete;
    private handleTaskCancel;
    private handleTaskGet;
    private handleTaskList;
    private handleContextCreate;
    private handleContextGet;
    private handleContextUpdate;
    private handleContextList;
    private handleMessageSend;
    private handleMessageBroadcast;
    private handleMessageSubscribe;
    private handleStatusGet;
    private sendResponse;
    private sendError;
    private sendEvent;
    private handleDisconnect;
}
//# sourceMappingURL=server.d.ts.map