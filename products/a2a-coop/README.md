# A2A-Coop: Agent-to-Agent Collaboration Engine

Enterprise-grade agent collaboration system. Agents work together, not hire each other.

## Purpose
Enable multiple AI agents to:
- Share context
- Divide tasks
- Coordinate execution
- Report collective results

## Use Case
Internal enterprise workflows where specialized agents collaborate on complex tasks.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      A2A-Coop System                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Agent     │  │   Context   │  │    Task Orchestrator    │  │
│  │   Registry  │  │   Store     │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                   ┌──────┴──────┐                                │
│                   │  Message    │                                │
│                   │  Bus        │                                │
│                   └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

## Status
- [x] Project scaffolding
- [x] Core types and interfaces
- [x] Agent registry
- [x] Message bus
- [x] Context store
- [x] Task orchestrator
- [ ] WebSocket API
- [ ] Integration tests
- [ ] Documentation

## Quick Start

```bash
cd products/a2a-coop
npm install
npm run dev
```

## Decisions
(See docs/decisions.md)

## Failures
(See docs/failures.md)
