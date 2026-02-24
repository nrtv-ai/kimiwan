# PM-Cursor Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Web App    │  │  Mobile     │  │  Browser Extension      │  │
│  │  (React)    │  │  (Future)   │  │  (Future)               │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘  │
└─────────┼────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                              │
│              (Rate Limiting, Auth, Routing)                      │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Project    │  │  Task       │  │  Agent                  │  │
│  │  Service    │  │  Service    │  │  Service                │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  User       │  │  Knowledge  │  │  Notification           │  │
│  │  Service    │  │  Service    │  │  Service                │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL │  │  Redis      │  │  Vector DB              │  │
│  │  (Primary)  │  │  (Cache)    │  │  (Embeddings)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  LLM API    │  │  LangChain  │  │  Custom Models          │  │
│  │  (OpenAI)   │  │  Framework  │  │  (Future)               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Service Architecture

### 1. Project Service
- Manages project lifecycle
- Handles project metadata, settings, and configuration
- Coordinates cross-project operations

### 2. Task Service
- Core task CRUD operations
- Task relationships and dependencies
- Status tracking and workflows

### 3. Agent Service
- AI agent lifecycle management
- Agent-task assignments
- Agent performance tracking
- Agent configuration and prompts

### 4. User Service
- User authentication and authorization
- User preferences and settings
- Team management

### 5. Knowledge Service
- Project knowledge graph
- Document storage and retrieval
- Context management for AI

### 6. Notification Service
- Real-time updates via WebSockets
- Email and push notifications
- Activity feeds

## Data Flow

### Task Creation Flow
```
User → API Gateway → Task Service → PostgreSQL
                         ↓
                   Agent Service (if AI assigned)
                         ↓
                   Notification Service → WebSocket → Clients
```

### AI Agent Workflow
```
Trigger → Agent Service → Knowledge Service (context)
                              ↓
                         LLM API
                              ↓
                         Agent Service (process response)
                              ↓
                         Task/Project Service (apply changes)
                              ↓
                         Notification Service
```

## Database Schema (High-Level)

### Core Tables
- `users` - User accounts and profiles
- `teams` - Team/organization data
- `projects` - Project definitions
- `tasks` - Task records with status, priority, assignments
- `agents` - AI agent configurations
- `agent_tasks` - Junction table for agent-task assignments
- `knowledge_nodes` - Knowledge graph nodes
- `knowledge_edges` - Knowledge graph relationships
- `activities` - Audit log and activity feed

### Key Relationships
- User → Teams (many-to-many)
- Team → Projects (one-to-many)
- Project → Tasks (one-to-many)
- Task → Agents (many-to-many via agent_tasks)
- Tasks → Tasks (self-referential for dependencies)

## AI Integration Points

### 1. Task Breakdown
- Input: Project description or high-level goal
- Output: Structured task hierarchy
- Implementation: OpenAI function calling

### 2. Status Summarization
- Input: Task updates, comments, time logs
- Output: Natural language status summary
- Implementation: LangChain with custom prompts

### 3. Risk Prediction
- Input: Project data, historical patterns
- Output: Risk scores and recommendations
- Implementation: Custom ML model (Phase 2)

### 4. Agent Collaboration
- Input: Multi-agent conversation context
- Output: Coordinated agent actions
- Implementation: LangChain multi-agent framework

## Security Considerations

- JWT-based authentication
- Role-based access control (RBAC)
- API rate limiting
- Data encryption at rest
- Audit logging for all AI actions
- Prompt injection prevention

## Scalability Strategy

- Horizontal scaling via Kubernetes
- Database read replicas
- Redis caching layer
- Async job processing (Bull Queue)
- CDN for static assets

## Development Guidelines

### Service Communication
- REST APIs for synchronous operations
- Message queue for async processing
- Event-driven architecture for decoupling

### Code Organization
```
/services/{service-name}/
  ├── src/
  │   ├── controllers/
  │   ├── services/
  │   ├── models/
  │   ├── routes/
  │   └── middleware/
  ├── tests/
  └── Dockerfile
```

### API Design
- RESTful principles
- Versioning via URL (/api/v1/...)
- Consistent error responses
- OpenAPI documentation
