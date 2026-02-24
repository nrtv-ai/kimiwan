# A2A-Coop API Documentation

## Overview

A2A-Coop provides both WebSocket and HTTP APIs for agent-to-agent collaboration.

- **WebSocket API**: `ws://localhost:8080` - Real-time bidirectional communication
- **HTTP API**: `http://localhost:8080` - Health checks and basic info

## HTTP Endpoints

### GET /

Returns basic server information.

**Response:**
```json
{
  "name": "A2A-Coop",
  "version": "0.1.0",
  "description": "Agent-to-Agent Collaboration Engine",
  "endpoints": {
    "websocket": "ws://localhost:8080",
    "health": "http://localhost:8080/health"
  }
}
```

### GET /health

Returns detailed health status for monitoring and load balancers.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-24T11:30:00.000Z",
  "version": "0.1.0",
  "uptime": 3600000,
  "components": {
    "websocket": "connected",
    "registry": "ok",
    "messageBus": "ok",
    "taskOrchestrator": "ok"
  },
  "metrics": {
    "agents": 5,
    "tasks": {
      "total": 10,
      "pending": 2,
      "inProgress": 3,
      "completed": 5
    },
    "contexts": 3,
    "messages": 42,
    "connections": 3
  }
}
```

## WebSocket API

### Message Format

All WebSocket messages follow this structure:

```typescript
interface WSMessage {
  id: string;        // Unique request ID
  type: string;      // Operation type
  payload: object;   // Operation-specific data
}
```

### Response Format

```typescript
interface WSResponse {
  id: string;
  type: 'response' | 'error' | 'event';
  requestId?: string;  // Matches the request ID
  payload: object;
}
```

## Agent Operations

### agent.register

Register a new agent with the system.

**Request:**
```json
{
  "id": "req-1",
  "type": "agent.register",
  "payload": {
    "name": "ResearchAgent",
    "description": "Performs research tasks",
    "capabilities": ["research", "summarize"],
    "metadata": { "version": "1.0" }
  }
}
```

**Response:**
```json
{
  "id": "resp-1",
  "type": "response",
  "requestId": "req-1",
  "payload": {
    "agent": {
      "id": "agent-uuid",
      "name": "ResearchAgent",
      "description": "Performs research tasks",
      "capabilities": ["research", "summarize"],
      "status": "idle",
      "metadata": { "version": "1.0" },
      "registeredAt": "2026-02-24T11:30:00.000Z",
      "lastSeenAt": "2026-02-24T11:30:00.000Z"
    }
  }
}
```

### agent.unregister

Remove an agent from the system.

**Request:**
```json
{
  "id": "req-2",
  "type": "agent.unregister",
  "payload": {
    "agentId": "agent-uuid"
  }
}
```

**Response:**
```json
{
  "id": "resp-2",
  "type": "response",
  "requestId": "req-2",
  "payload": {
    "success": true
  }
}
```

### agent.list

List all registered agents.

**Request:**
```json
{
  "id": "req-3",
  "type": "agent.list",
  "payload": {}
}
```

**Response:**
```json
{
  "id": "resp-3",
  "type": "response",
  "requestId": "req-3",
  "payload": {
    "agents": [
      { /* agent object */ },
      { /* agent object */ }
    ]
  }
}
```

### agent.get

Get a specific agent by ID.

**Request:**
```json
{
  "id": "req-4",
  "type": "agent.get",
  "payload": {
    "agentId": "agent-uuid"
  }
}
```

**Response:**
```json
{
  "id": "resp-4",
  "type": "response",
  "requestId": "req-4",
  "payload": {
    "agent": { /* agent object */ }
  }
}
```

## Task Operations

### task.create

Create a new task.

**Request:**
```json
{
  "id": "req-5",
  "type": "task.create",
  "payload": {
    "request": {
      "type": "research",
      "description": "Research AI trends",
      "payload": { "topic": "AI" },
      "priority": 5,
      "requiredCapabilities": ["research"]
    },
    "createdBy": "agent-uuid"
  }
}
```

**Response:**
```json
{
  "id": "resp-5",
  "type": "response",
  "requestId": "req-5",
  "payload": {
    "task": {
      "id": "task-uuid",
      "type": "research",
      "description": "Research AI trends",
      "payload": { "topic": "AI" },
      "status": "pending",
      "priority": 5,
      "createdBy": "agent-uuid",
      "subtasks": [],
      "createdAt": "2026-02-24T11:30:00.000Z",
      "updatedAt": "2026-02-24T11:30:00.000Z"
    }
  }
}
```

### task.assign

Assign a task to an agent.

**Request:**
```json
{
  "id": "req-6",
  "type": "task.assign",
  "payload": {
    "taskId": "task-uuid",
    "agentId": "agent-uuid"
  }
}
```

**Response:**
```json
{
  "id": "resp-6",
  "type": "response",
  "requestId": "req-6",
  "payload": {
    "success": true
  }
}
```

### task.start

Mark a task as started.

**Request:**
```json
{
  "id": "req-7",
  "type": "task.start",
  "payload": {
    "taskId": "task-uuid"
  }
}
```

### task.complete

Complete a task with results.

**Request:**
```json
{
  "id": "req-8",
  "type": "task.complete",
  "payload": {
    "taskId": "task-uuid",
    "result": {
      "success": true,
      "data": { "findings": "AI is growing rapidly" },
      "logs": ["Started research", "Found sources", "Compiled report"],
      "artifacts": [
        {
          "type": "document",
          "name": "report.pdf",
          "content": "base64-encoded-content",
          "metadata": { "pages": 10 }
        }
      ]
    }
  }
}
```

### task.cancel

Cancel a task.

**Request:**
```json
{
  "id": "req-9",
  "type": "task.cancel",
  "payload": {
    "taskId": "task-uuid",
    "reason": "No longer needed"
  }
}
```

### task.get

Get a specific task by ID.

**Request:**
```json
{
  "id": "req-10",
  "type": "task.get",
  "payload": {
    "taskId": "task-uuid"
  }
}
```

### task.list

List all tasks.

**Request:**
```json
{
  "id": "req-11",
  "type": "task.list",
  "payload": {}
}
```

## Context Operations

### context.create

Create a shared context.

**Request:**
```json
{
  "id": "req-12",
  "type": "context.create",
  "payload": {
    "request": {
      "name": "Project Alpha",
      "description": "Shared context for project",
      "initialData": { "status": "planning" }
    },
    "createdBy": "agent-uuid"
  }
}
```

**Response:**
```json
{
  "id": "resp-12",
  "type": "response",
  "requestId": "req-12",
  "payload": {
    "context": {
      "id": "context-uuid",
      "name": "Project Alpha",
      "description": "Shared context for project",
      "data": { "status": "planning" },
      "participants": ["agent-uuid"],
      "createdAt": "2026-02-24T11:30:00.000Z",
      "updatedAt": "2026-02-24T11:30:00.000Z"
    }
  }
}
```

### context.get

Get a context by ID.

**Request:**
```json
{
  "id": "req-13",
  "type": "context.get",
  "payload": {
    "contextId": "context-uuid"
  }
}
```

### context.update

Update context data.

**Request:**
```json
{
  "id": "req-14",
  "type": "context.update",
  "payload": {
    "contextId": "context-uuid",
    "updates": { "status": "in_progress" },
    "updatedBy": "agent-uuid"
  }
}
```

### context.list

List all contexts.

**Request:**
```json
{
  "id": "req-15",
  "type": "context.list",
  "payload": {}
}
```

## Message Operations

### message.send

Send a direct message to an agent.

**Request:**
```json
{
  "id": "req-16",
  "type": "message.send",
  "payload": {
    "from": "agent-uuid-1",
    "to": "agent-uuid-2",
    "content": "Hello!",
    "data": { "priority": "high" }
  }
}
```

### message.broadcast

Broadcast a message to all agents.

**Request:**
```json
{
  "id": "req-17",
  "type": "message.broadcast",
  "payload": {
    "from": "agent-uuid",
    "event": "announcement",
    "data": { "message": "System update in 5 minutes" }
  }
}
```

### message.subscribe

Subscribe an agent to receive messages.

**Request:**
```json
{
  "id": "req-18",
  "type": "message.subscribe",
  "payload": {
    "agentId": "agent-uuid"
  }
}
```

**Event Response (when message received):**
```json
{
  "id": "event-1",
  "type": "event",
  "payload": {
    "eventType": "message.received",
    "message": {
      "id": "msg-uuid",
      "type": "direct",
      "from": "agent-uuid-1",
      "to": "agent-uuid-2",
      "payload": { /* message payload */ },
      "timestamp": "2026-02-24T11:30:00.000Z"
    }
  }
}
```

## Status Operations

### status.get

Get system status.

**Request:**
```json
{
  "id": "req-19",
  "type": "status.get",
  "payload": {}
}
```

**Response:**
```json
{
  "id": "resp-19",
  "type": "response",
  "requestId": "req-19",
  "payload": {
    "status": {
      "agents": 5,
      "tasks": {
        "total": 10,
        "pending": 2,
        "inProgress": 3,
        "completed": 5
      },
      "contexts": 3,
      "messages": 42
    }
  }
}
```

## Error Handling

Error responses have `type: 'error'`:

```json
{
  "id": "err-1",
  "type": "error",
  "requestId": "req-1",
  "payload": {
    "error": "Agent not found"
  }
}
```

Common error messages:
- `Invalid JSON` - Malformed request
- `Unknown message type: {type}` - Unrecognized operation
- `Agent not found` - Agent ID doesn't exist
- `Task not found` - Task ID doesn't exist
- `Rate limit exceeded. Try again in Xs` - Too many requests

## Rate Limiting

The server enforces rate limiting per WebSocket connection:

- **Default limit**: 100 requests per 60 seconds
- **Configurable via**: `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` environment variables

When rate limited, the server returns an error and may close the connection with code 1008.

## Error Handling Examples

### TypeScript Client

```typescript
import { A2ACoopClient } from 'a2a-coop';

const client = new A2ACoopClient('ws://localhost:8080');

// Connection error handling
client.on('error', (err) => {
  console.error('Connection error:', err);
  // Attempt reconnection
});

try {
  await client.connect();
  
  // Operation error handling
  try {
    const agent = await client.registerAgent({
      name: 'MyAgent',
      description: 'Test agent',
      capabilities: ['test']
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      // Wait and retry
      await new Promise(r => setTimeout(r, 5000));
      // Retry operation
    } else {
      console.error('Registration failed:', error);
    }
  }
} catch (error) {
  console.error('Connection failed:', error);
}
```

### Raw WebSocket

```typescript
const ws = new WebSocket('ws://localhost:8080');

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  
  if (response.type === 'error') {
    console.error(`Error in request ${response.requestId}:`, response.payload.error);
    
    // Handle specific errors
    if (response.payload.error.includes('Rate limit')) {
      // Implement backoff
    }
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', (code, reason) => {
  if (code === 1008) {
    console.error('Connection closed: Rate limit exceeded');
  }
});
```
