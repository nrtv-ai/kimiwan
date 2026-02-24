# Decisions Log

## 2026-02-24

### Decision 1: Collaboration Model
**Context:** A2A can mean hiring (marketplace) or collaboration (teamwork)
**Decision:** Focus on collaboration, not hiring
**Rationale:** Enterprise internal use case — agents are teammates, not contractors
**Consequences:** Different architecture than ACP-style marketplace

### Decision 2: Communication Protocol
**Context:** Agents need to share context and coordinate
**Decision:** Start with simple message passing, evaluate formal protocols later
**Rationale:** MVP first, standards second
**Consequences:** May need refactor when scaling

### Decision 3: Core Architecture
**Context:** Need to design the system structure
**Decision:** Four-component architecture: Registry, MessageBus, ContextStore, TaskOrchestrator
**Rationale:** Clean separation of concerns, each component handles one responsibility
**Consequences:** Components can be tested independently, may need coordination layer for complex workflows

### Decision 4: Task Auto-Assignment
**Context:** Tasks need to be assigned to capable agents
**Decision:** Auto-assign based on capability matching when requiredCapabilities specified
**Rationale:** Reduces manual coordination, agents pick up work they can do
**Consequences:** Simple first-fit strategy; may need smarter load balancing later

### Decision 5: Context Inheritance
**Context:** Subtasks should share parent context
**Decision:** Subtasks automatically inherit parent contextId
**Rationale:** Maintains continuity across task hierarchies
**Consequences:** All subtask participants get access to parent context data

### Decision 6: WebSocket API
**Context:** Need remote access to the collaboration system
**Decision:** Implement WebSocket server with JSON message protocol
**Rationale:** Bidirectional communication, real-time events, simple protocol
**Consequences:** Clients need WebSocket library; may add HTTP REST API later for simpler use cases

### Decision 7: Client Library
**Context:** Users need easy way to interact with the server
**Decision:** Provide first-party TypeScript client with promise-based API
**Rationale:** Hides WebSocket complexity, provides type safety, matches server language
**Consequences:** Need to maintain client/server compatibility