"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextStore = void 0;
const uuid_1 = require("uuid");
/**
 * ContextStore manages shared state for collaborative tasks.
 *
 * Contexts provide a shared workspace where agents can:
 * - Store intermediate results
 * - Share data between task steps
 * - Maintain state across agent handoffs
 * - Build up collective knowledge
 */
class ContextStore {
    contexts = new Map();
    handlers = new Map();
    /**
     * Create a new context
     */
    create(request, createdBy) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const context = {
            id,
            name: request.name,
            description: request.description,
            data: request.initialData || {},
            participants: [createdBy],
            parentContextId: request.parentContextId,
            createdAt: now,
            updatedAt: now,
        };
        this.contexts.set(id, context);
        this.emit('context_created', context);
        return context;
    }
    /**
     * Get a context by ID
     */
    get(contextId) {
        return this.contexts.get(contextId);
    }
    /**
     * Get all contexts
     */
    getAll() {
        return Array.from(this.contexts.values());
    }
    /**
     * Get child contexts of a parent context
     */
    getChildren(parentContextId) {
        return this.getAll().filter(ctx => ctx.parentContextId === parentContextId);
    }
    /**
     * Update context data
     */
    update(contextId, updates, updatedBy) {
        const context = this.contexts.get(contextId);
        if (!context)
            return undefined;
        // Add to participants if not already present
        if (!context.participants.includes(updatedBy)) {
            context.participants.push(updatedBy);
        }
        // Deep merge the updates
        context.data = this.deepMerge(context.data, updates);
        context.updatedAt = new Date();
        this.emit('context_updated', { context, updates, updatedBy });
        return context;
    }
    /**
     * Set a specific value in context
     */
    setValue(contextId, key, value, updatedBy) {
        return this.update(contextId, { [key]: value }, updatedBy);
    }
    /**
     * Get a specific value from context
     */
    getValue(contextId, key, defaultValue) {
        const context = this.contexts.get(contextId);
        if (!context)
            return defaultValue;
        return context.data[key] ?? defaultValue;
    }
    /**
     * Delete a context
     */
    delete(contextId) {
        const context = this.contexts.get(contextId);
        if (!context)
            return false;
        // Delete child contexts recursively
        const children = this.getChildren(contextId);
        for (const child of children) {
            this.delete(child.id);
        }
        this.contexts.delete(contextId);
        this.emit('context_deleted', context);
        return true;
    }
    /**
     * Add a participant to a context
     */
    addParticipant(contextId, agentId) {
        const context = this.contexts.get(contextId);
        if (!context)
            return false;
        if (!context.participants.includes(agentId)) {
            context.participants.push(agentId);
            context.updatedAt = new Date();
            this.emit('context_participant_added', { context, agentId });
        }
        return true;
    }
    /**
     * Remove a participant from a context
     */
    removeParticipant(contextId, agentId) {
        const context = this.contexts.get(contextId);
        if (!context)
            return false;
        const index = context.participants.indexOf(agentId);
        if (index > -1) {
            context.participants.splice(index, 1);
            context.updatedAt = new Date();
            this.emit('context_participant_removed', { context, agentId });
        }
        return true;
    }
    /**
     * Get all contexts an agent participates in
     */
    getContextsForAgent(agentId) {
        return this.getAll().filter(ctx => ctx.participants.includes(agentId));
    }
    /**
     * Search contexts by name or description
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(ctx => ctx.name.toLowerCase().includes(lowerQuery) ||
            ctx.description.toLowerCase().includes(lowerQuery));
    }
    /**
     * Create a child context
     */
    createChild(parentContextId, request, createdBy) {
        return this.create({ ...request, parentContextId }, createdBy);
    }
    /**
     * Subscribe to context events
     */
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
        return () => {
            this.handlers.get(event)?.delete(handler);
        };
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceVal = source[key];
                const targetVal = result[key];
                if (typeof sourceVal === 'object' &&
                    sourceVal !== null &&
                    !Array.isArray(sourceVal) &&
                    typeof targetVal === 'object' &&
                    targetVal !== null &&
                    !Array.isArray(targetVal)) {
                    result[key] = this.deepMerge(targetVal, sourceVal);
                }
                else {
                    result[key] = sourceVal;
                }
            }
        }
        return result;
    }
    emit(event, payload) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler({ type: event, timestamp: new Date(), payload });
                }
                catch (err) {
                    console.error(`Error in context store handler for ${event}:`, err);
                }
            }
        }
    }
}
exports.ContextStore = ContextStore;
//# sourceMappingURL=context.js.map