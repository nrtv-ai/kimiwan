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
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WebSocket API Server                          │
│         (HTTP/WebSocket interface for remote agents)             │
└─────────────────────────────────────────────────────────────────┘
```

## Status

- [x] Project scaffolding
- [x] Core types and interfaces
- [x] Agent registry
- [x] Message bus
- [x] Context store
- [x] Task orchestrator
- [x] WebSocket API server
- [x] WebSocket client
- [x] Integration tests
- [x] Documentation

## Quick Start

### Install dependencies

```bash
cd products/a2a-coop
npm install
```

### Run tests

```bash
npm test
```

### Start the server

```bash
npm run server
# or with custom port
PORT=3000 npm run server
```

### Use the client

```typescript
import { A2ACoopClient } from 'a2a-coop';

const client = new A2ACoopClient('ws://localhost:8080');
await client.connect();

// Register an agent
const agent = await client.registerAgent({
  name: 'ResearchAgent',
  description: 'Performs research tasks',
  capabilities: ['research', 'summarize']
});

// Create a task
const task = await client.createTask({
  type: 'research',
  description: 'Research AI trends',
  payload: { topic: 'AI' }
}, agent.id);

// Assign task
await client.assignTask(task.id, agent.id);

// Complete task
await client.completeTask(task.id, {
  success: true,
  data: { findings: '...' },
  logs: ['Started research', 'Found sources']
});
```

## API Reference

### Agent Operations

- `agent.register` - Register a new agent
- `agent.unregister` - Remove an agent
- `agent.list` - List all agents
- `agent.get` - Get agent by ID

### Task Operations

- `task.create` - Create a new task
- `task.assign` - Assign task to agent
- `task.start` - Mark task as started
- `task.complete` - Complete task with results
- `task.cancel` - Cancel a task
- `task.get` - Get task by ID
- `task.list` - List all tasks

### Context Operations

- `context.create` - Create shared context
- `context.get` - Get context by ID
- `context.update` - Update context data
- `context.list` - List all contexts

### Message Operations

- `message.send` - Send direct message
- `message.broadcast` - Broadcast to all
- `message.subscribe` - Subscribe to messages

### Status

- `status.get` - Get system status

## Decisions
(See docs/decisions.md)

## Failures
(See docs/failures.md)
