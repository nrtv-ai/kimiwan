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
- [x] WebSocket API
- [x] WebSocket Client
- [x] Integration tests
- [x] Unit tests (92 tests passing)
- [ ] Documentation
- [ ] Example applications

## Quick Start

### Library Usage

```typescript
import { A2ACoop } from 'a2a-coop';

const coop = new A2ACoop();

// Register agents
const agent = coop.registerAgent({
  name: 'ResearchAgent',
  description: 'Performs research tasks',
  capabilities: ['research', 'summarize']
});

// Create a task
const task = coop.createTask({
  type: 'research',
  description: 'Research AI trends',
  payload: { topic: 'AI' }
}, agent.id);

// Complete task
coop.completeTask(task.id, {
  success: true,
  data: { findings: ['Trend 1', 'Trend 2'] }
});
```

### Server Usage

```bash
# Start WebSocket server
npm run server
# or
npx a2a-coop
```

### Client Usage

```typescript
import { A2ACoopClient } from 'a2a-coop';

const client = new A2ACoopClient('ws://localhost:8080');
await client.connect();

const agent = await client.registerAgent({
  name: 'MyAgent',
  capabilities: ['compute']
});

const task = await client.createTask({
  type: 'compute',
  description: 'Calculate something',
  payload: { input: 42 }
}, agent.id);
```

## WebSocket API

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

## Development

```bash
npm install
npm run build
npm test
npm run test:watch
```

## Decisions
(See docs/decisions.md)

## Failures
(See docs/failures.md)
