import { Agent, AgentId, AgentRegistration, AgentStatus, Capability, CapabilityQuery } from './types';
/**
 * AgentRegistry manages agent registration, discovery, and status tracking.
 *
 * This is the central directory for all agents in the A2A-Coop system.
 * Agents register themselves with their capabilities, and other components
 * can query for agents by ID or capability.
 */
export declare class AgentRegistry {
    private agents;
    private handlers;
    /**
     * Register a new agent
     */
    register(registration: AgentRegistration): Agent;
    /**
     * Unregister an agent
     */
    unregister(agentId: AgentId): boolean;
    /**
     * Get an agent by ID
     */
    get(agentId: AgentId): Agent | undefined;
    /**
     * Get all registered agents
     */
    getAll(): Agent[];
    /**
     * Find agents by capability query
     */
    findByCapabilities(query: CapabilityQuery): Agent[];
    /**
     * Find agents by name (partial match)
     */
    findByName(name: string): Agent[];
    /**
     * Update agent status
     */
    updateStatus(agentId: AgentId, status: AgentStatus): boolean;
    /**
     * Update agent metadata
     */
    updateMetadata(agentId: AgentId, metadata: Record<string, unknown>): boolean;
    /**
     * Get all unique capabilities across all agents
     */
    getAllCapabilities(): Capability[];
    /**
     * Check if an agent exists
     */
    has(agentId: AgentId): boolean;
    /**
     * Get count of registered agents
     */
    count(): number;
    /**
     * Subscribe to registry events
     */
    on(event: string, handler: Function): () => void;
    private emit;
}
//# sourceMappingURL=registry.d.ts.map