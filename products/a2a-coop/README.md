# A2A-Coop: Agent-to-Agent Collaboration Engine

Enterprise-grade agent collaboration system. Agents work together, not hire each other.

[![Tests](https://img.shields.io/badge/tests-92%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## Purpose

Enable multiple AI agents to:
- **Share context** - Collaborative state management across agents
- **Divide tasks** - Automatic task distribution based on capabilities
- **Coordinate execution** - Real-time messaging and event broadcasting
- **Report collective results** - Unified task result aggregation

## Use Cases

- **Internal enterprise workflows** - Specialized agents collaborating on complex tasks
- **Multi-agent research** - Research agents sharing findings and coordinating analysis
- **Distributed processing** - Divide work across agent pools with capability-based routing
- **Agent swarms** - Coordinate large numbers of agents for collective intelligence

## Quick Start

### Installation

```bash
npm install a2a-coop
```

### Start the Server

```bash
# Using npx
npx a2a-coop-server

# Or with custom port
PORT=3000 npx a2a-coop-server
```

### Connect with Client

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
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Rate Limiter │  │ Health Check │  │   Error Handler      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Responsibility | Key Features |
|-----------|---------------|--------------|
| **AgentRegistry** | Agent lifecycle management | Registration, discovery, capability matching |
| **MessageBus** | Inter-agent communication | Direct messages, broadcasts, subscriptions |
| **ContextStore** | Shared state management | Hierarchical contexts, access control |
| **TaskOrchestrator** | Task lifecycle management | Auto-assignment, status tracking, results |
| **A2ACoopServer** | WebSocket API | Real-time bidirectional communication |
| **A2ACoopClient** | Client SDK | Promise-based API, event handling |

## API Reference

### Agent Operations

```typescript
// Register a new agent
const agent = await client.registerAgent({
  name: 'MyAgent',
  description: 'Does useful things',
  capabilities: ['compute', 'analyze'],
  metadata: { version: '1.0' }
});

// List all agents
const agents = await client.listAgents();

// Get specific agent
const agent = await client.getAgent(agentId);

// Unregister agent
await client.unregisterAgent(agentId);
```

### Task Operations

```typescript
// Create a task
const task = await client.createTask({
  type: 'analysis',
  description: 'Analyze data',
  payload: { data: [...] },
  priority: 5, // 1-10, higher = more urgent
  requiredCapabilities: ['analyze']
}, creatorAgentId);

// Assign task (auto-assignment if requiredCapabilities specified)
await client.assignTask(task.id, agentId);

// Task lifecycle
await client.startTask(task.id);
await client.completeTask(task.id, {
  success: true,
  data: { result: '...' },
  logs: ['Step 1', 'Step 2'],
  artifacts: [{
    type: 'document',
    name: 'report.pdf',
    content: buffer,
    metadata: { pages: 10 }
  }]
});

// Or cancel
await client.cancelTask(task.id, 'No longer needed');

// Query tasks
const tasks = await client.listTasks();
const task = await client.getTask(taskId);
```

### Context Operations

```typescript
// Create shared context
const context = await client.createContext({
  name: 'Project Alpha',
  description: 'Shared context for project',
  initialData: { status: 'planning' }
}, creatorAgentId);

// Update context
await client.updateContext(context.id, {
  status: 'in_progress',
  milestone: 'MVP'
}, updaterAgentId);

// Get context
const ctx = await client.getContext(contextId);
const allContexts = await client.listContexts();
```

### Messaging Operations

```typescript
// Subscribe to messages
await client.subscribeToMessages(agentId, (message) => {
  console.log('Received:', message);
});

// Send direct message
await client.sendMessage(fromAgentId, toAgentId, 'Hello!', {
  priority: 'high'
});

// Broadcast to all agents
await client.broadcastMessage(fromAgentId, 'announcement', {
  event: 'system_update',
  details: '...'
});
```

### System Status

```typescript
const status = await client.getStatus();
// {
//   agents: 5,
//   tasks: { total: 10, pending: 2, inProgress: 3, completed: 5 },
//   contexts: 3,
//   messages: 42
// }
```

## Error Handling

The client provides structured error handling:

```typescript
try {
  const task = await client.createTask(request, agentId);
} catch (error) {
  if (error.message.includes('Agent not found')) {
    // Handle missing agent
  } else if (error.message.includes('Request timeout')) {
    // Handle timeout - server may be down
  } else {
    // Handle other errors
  }
}

// Connection events
client.on('error', (err) => {
  console.error('Connection error:', err);
});
```

## Deployment

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  a2a-coop:
    build: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - MAX_MESSAGE_HISTORY=1000
      - RATE_LIMIT_WINDOW_MS=60000
      - RATE_LIMIT_MAX_REQUESTS=100
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `MAX_MESSAGE_HISTORY` | 1000 | Max messages to retain in memory |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window per client |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Build
npm run build

# Start development server
npm run server
```

## Design Decisions

See [docs/decisions.md](docs/decisions.md) for detailed architecture decisions.

## Failure Log

See [docs/failures.md](docs/failures.md) for documented mistakes and lessons learned.

## Roadmap

- [x] Core architecture (Registry, MessageBus, ContextStore, TaskOrchestrator)
- [x] WebSocket API server
- [x] TypeScript client SDK
- [x] Comprehensive test suite (92+ tests)
- [x] Rate limiting middleware
- [x] Health check endpoint
- [x] Docker compose setup
- [ ] HTTP REST API for simpler integrations
- [ ] Persistent storage (Redis/PostgreSQL)
- [ ] Authentication & authorization
- [ ] Metrics and monitoring
- [ ] Agent heartbeat improvements

## License

MIT
