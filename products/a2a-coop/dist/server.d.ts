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
 * A2ACoopServer provides a WebSocket API for the A2A-Coop system.
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
    private coop;
    private clients;
    private agentConnections;
    constructor(port?: number, options?: {
        maxMessageHistory?: number;
    });
    /**
     * Start the server
     */
    start(): void;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
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