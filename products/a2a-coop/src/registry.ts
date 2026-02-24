import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  AgentId,
  AgentRegistration,
  AgentStatus,
  Capability,
  CapabilityQuery,
} from './types';

/**
 * AgentRegistry manages agent registration, discovery, and status tracking.
 * 
 * This is the central directory for all agents in the A2A-Coop system.
 * Agents register themselves with their capabilities, and other components
 * can query for agents by ID or capability.
 */
export class AgentRegistry {
  private agents: Map<AgentId, Agent> = new Map();
  private handlers: Map<string, Set<Function>> = new Map();

  /**
   * Register a new agent
   */
  register(registration: AgentRegistration): Agent {
    const id = uuidv4();
    const now = new Date();
    
    const agent: Agent = {
      id,
      name: registration.name,
      description: registration.description,
      capabilities: registration.capabilities,
      status: 'idle',
      metadata: registration.metadata || {},
      registeredAt: now,
      lastSeenAt: now,
    };

    this.agents.set(id, agent);
    this.emit('agent_registered', agent);
    
    return agent;
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: AgentId): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    this.agents.delete(agentId);
    this.emit('agent_unregistered', agent);
    return true;
  }

  /**
   * Get an agent by ID
   */
  get(agentId: AgentId): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents by capability query
   */
  findByCapabilities(query: CapabilityQuery): Agent[] {
    const agents = this.getAll();
    
    return agents.filter(agent => {
      if (query.matchAll) {
        // Agent must have ALL specified capabilities
        return query.capabilities.every(cap => agent.capabilities.includes(cap));
      } else {
        // Agent must have AT LEAST ONE specified capability
        return query.capabilities.some(cap => agent.capabilities.includes(cap));
      }
    });
  }

  /**
   * Find agents by name (partial match)
   */
  findByName(name: string): Agent[] {
    const lowerName = name.toLowerCase();
    return this.getAll().filter(agent => 
      agent.name.toLowerCase().includes(lowerName)
    );
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: AgentId, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const oldStatus = agent.status;
    agent.status = status;
    agent.lastSeenAt = new Date();

    this.emit('agent_status_changed', { agent, oldStatus });
    return true;
  }

  /**
   * Update agent metadata
   */
  updateMetadata(agentId: AgentId, metadata: Record<string, unknown>): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.metadata = { ...agent.metadata, ...metadata };
    agent.lastSeenAt = new Date();
    return true;
  }

  /**
   * Get all unique capabilities across all agents
   */
  getAllCapabilities(): Capability[] {
    const caps = new Set<Capability>();
    for (const agent of this.agents.values()) {
      for (const cap of agent.capabilities) {
        caps.add(cap);
      }
    }
    return Array.from(caps);
  }

  /**
   * Check if an agent exists
   */
  has(agentId: AgentId): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get count of registered agents
   */
  count(): number {
    return this.agents.size;
  }

  /**
   * Subscribe to registry events
   */
  on(event: string, handler: Function): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  private emit(event: string, payload: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler({ type: event, timestamp: new Date(), payload });
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      }
    }
  }
}
