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