import { Context, ContextId, ContextCreateRequest, AgentId } from './types';
/**
 * ContextStore manages shared state for collaborative tasks.
 *
 * Contexts provide a shared workspace where agents can:
 * - Store intermediate results
 * - Share data between task steps
 * - Maintain state across agent handoffs
 * - Build up collective knowledge
 */
export declare class ContextStore {
    private contexts;
    private handlers;
    /**
     * Create a new context
     */
    create(request: ContextCreateRequest, createdBy: AgentId): Context;
    /**
     * Get a context by ID
     */
    get(contextId: ContextId): Context | undefined;
    /**
     * Get all contexts
     */
    getAll(): Context[];
    /**
     * Get child contexts of a parent context
     */
    getChildren(parentContextId: ContextId): Context[];
    /**
     * Update context data
     */
    update(contextId: ContextId, updates: Record<string, unknown>, updatedBy: AgentId): Context | undefined;
    /**
     * Set a specific value in context
     */
    setValue<T>(contextId: ContextId, key: string, value: T, updatedBy: AgentId): Context | undefined;
    /**
     * Get a specific value from context
     */
    getValue<T>(contextId: ContextId, key: string, defaultValue?: T): T | undefined;
    /**
     * Delete a context
     */
    delete(contextId: ContextId): boolean;
    /**
     * Add a participant to a context
     */
    addParticipant(contextId: ContextId, agentId: AgentId): boolean;
    /**
     * Remove a participant from a context
     */
    removeParticipant(contextId: ContextId, agentId: AgentId): boolean;
    /**
     * Get all contexts an agent participates in
     */
    getContextsForAgent(agentId: AgentId): Context[];
    /**
     * Search contexts by name or description
     */
    search(query: string): Context[];
    /**
     * Create a child context
     */
    createChild(parentContextId: ContextId, request: ContextCreateRequest, createdBy: AgentId): Context | undefined;
    /**
     * Subscribe to context events
     */
    on(event: string, handler: Function): () => void;
    private deepMerge;
    private emit;
}
//# sourceMappingURL=context.d.ts.map