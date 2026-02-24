import { IncomingMessage, ServerResponse } from 'http';
import { A2ACoop } from './index';
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
export declare class A2ACoopRestApi {
    private a2aCoop;
    private coop;
    constructor(a2aCoop: A2ACoop);
    /**
     * Handle an HTTP request
     */
    handleRequest(req: IncomingMessage, res: ServerResponse): void;
    private routeRequest;
    private listAgents;
    private getAgent;
    private createAgent;
    private deleteAgent;
    private listTasks;
    private getTask;
    private createTask;
    private assignTask;
    private startTask;
    private completeTask;
    private cancelTask;
    private listContexts;
    private getContext;
    private createContext;
    private updateContext;
    private sendMessage;
    private broadcastMessage;
    private getStatus;
    private parseBody;
    private sendJson;
    private sendError;
}
//# sourceMappingURL=restApi.d.ts.map