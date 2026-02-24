# Core Data Models

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │     │   teams     │     │  projects   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────┤ id (PK)     │◄────┤ id (PK)     │
│ email       │     │ name        │     │ team_id(FK) │
│ name        │     │ slug        │     │ name        │
│ avatar_url  │     │ settings    │     │ description │
│ role        │     │ created_at  │     │ status      │
│ created_at  │     └──────┬──────┘     │ settings    │
└──────┬──────┘            │            │ created_at  │
       │                   │            └──────┬──────┘
       │                   │                   │
       │            ┌──────┴──────┐            │
       │            │ team_members│            │
       │            ├─────────────┤            │
       └───────────►│ user_id(FK) │            │
                    │ team_id(FK) │            │
                    │ role        │            │
                    │ joined_at   │            │
                    └─────────────┘            │
                                               │
┌─────────────┐     ┌─────────────┐           │
│   agents    │     │   tasks     │◄──────────┘
├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │
│ project_id  │────►│ project_id  │
│ name        │     │ parent_id   │◄───┐
│ type        │     │ title       │    │
│ config      │     │ description │    │
│ status      │     │ status      │    │
│ created_at  │     │ priority    │    │
└──────┬──────┘     │ assignee_id │    │
       │            │ creator_id  │    │
       │            │ due_date    │    │
       │            │ metadata    │    │
       │            │ created_at  │    │
       │            └──────┬──────┘    │
       │                   │           │
       │            ┌──────┴──────┐    │
       └───────────►│ agent_tasks │    │
                    ├─────────────┤    │
                    │ agent_id    │    │
                    │ task_id     │    │
                    │ role        │    │
                    │ created_at  │    │
                    └─────────────┘    │
                                       │
                    ┌──────────────────┘
                    │
┌─────────────┐     │     ┌─────────────┐
│ activities  │     │     │  comments   │
├─────────────┤     │     ├─────────────┤
│ id (PK)     │     │     │ id (PK)     │
│ actor_id    │     │     │ task_id(FK) │
│ actor_type  │     │     │ author_id   │
│ action      │     │     │ content     │
│ entity_type │     │     │ created_at  │
│ entity_id   │     │     └─────────────┘
│ metadata    │     │
│ created_at  │     │
└─────────────┘     │
                    │     ┌─────────────┐
                    │     │attachments  │
                    │     ├─────────────┤
                    │     │ id (PK)     │
                    │     │ task_id(FK) │
                    └────►│ name        │
                          │ url         │
                          │ size        │
                          │ mime_type   │
                          │ created_at  │
                          └─────────────┘
```

## Detailed Schema

### User
The `users` table stores human user accounts.

```typescript
interface User {
  id: string;                    // UUID primary key
  email: string;                 // Unique email address
  name: string;                  // Display name
  avatar_url: string | null;     // Profile picture URL
  role: 'admin' | 'user';        // Global role
  preferences: UserPreferences;  // JSON: theme, notifications, etc.
  created_at: Date;
  updated_at: Date;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: string;
  email_notifications: boolean;
  push_notifications: boolean;
}
```

### Team
Organizations or teams that contain projects.

```typescript
interface Team {
  id: string;                    // UUID primary key
  name: string;                  // Team name
  slug: string;                  // URL-friendly identifier
  description: string | null;
  avatar_url: string | null;
  settings: TeamSettings;        // JSON: workflows, permissions
  created_at: Date;
  updated_at: Date;
}

interface TeamSettings {
  default_project_visibility: 'public' | 'private';
  allowed_task_statuses: TaskStatus[];
  allowed_priorities: Priority[];
  ai_enabled: boolean;
}
```

### TeamMember
Junction table for team membership.

```typescript
interface TeamMember {
  id: string;
  user_id: string;               // FK to users
  team_id: string;               // FK to teams
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
}
```

### Project
A project is a container for tasks and agents.

```typescript
interface Project {
  id: string;                    // UUID primary key
  team_id: string;               // FK to teams
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'completed';
  visibility: 'public' | 'private';
  settings: ProjectSettings;     // JSON: workflows, AI config
  metadata: ProjectMetadata;     // JSON: custom fields
  start_date: Date | null;
  target_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ProjectSettings {
  default_agent_id: string | null;
  auto_assign_enabled: boolean;
  ai_suggestions_enabled: boolean;
  status_workflow: StatusTransition[];
}

interface StatusTransition {
  from: TaskStatus;
  to: TaskStatus[];
}

interface ProjectMetadata {
  tags: string[];
  custom_fields: Record<string, unknown>;
}
```

### Task
The core work unit in PM-Cursor.

```typescript
type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: string;                    // UUID primary key
  project_id: string;            // FK to projects
  parent_id: string | null;      // Self-reference for subtasks
  title: string;
  description: string | null;    // Markdown supported
  status: TaskStatus;
  priority: Priority;
  
  // Assignments
  assignee_id: string | null;    // FK to users (human)
  creator_id: string;            // FK to users
  
  // AI-specific fields
  ai_generated: boolean;         // Was this task AI-created?
  ai_confidence: number | null;  // AI confidence score (0-1)
  
  // Scheduling
  due_date: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  
  // Ordering
  position: number;              // For drag-drop ordering
  
  // Metadata
  labels: string[];              // Array of label strings
  metadata: TaskMetadata;        // JSON: custom fields
  
  created_at: Date;
  updated_at: Date;
}

interface TaskMetadata {
  source: 'manual' | 'ai_breakdown' | 'import' | null;
  external_refs: ExternalRef[];
  custom_fields: Record<string, unknown>;
}

interface ExternalRef {
  provider: string;              // e.g., 'github', 'jira'
  external_id: string;
  url: string;
}
```

### Agent
AI agents that can be assigned to tasks.

```typescript
type AgentType = 'planner' | 'executor' | 'reviewer' | 'custom';
type AgentStatus = 'active' | 'paused' | 'error';

interface Agent {
  id: string;                    // UUID primary key
  project_id: string;            // FK to projects
  name: string;
  description: string | null;
  type: AgentType;
  status: AgentStatus;
  
  // Configuration
  config: AgentConfig;           // JSON: behavior settings
  prompts: AgentPrompts;         // JSON: system prompts
  
  // Capabilities
  capabilities: AgentCapability[];
  
  // Performance tracking
  metrics: AgentMetrics;         // JSON: performance stats
  
  created_at: Date;
  updated_at: Date;
}

interface AgentConfig {
  model: string;                 // e.g., 'gpt-4', 'gpt-4o'
  temperature: number;
  max_tokens: number;
  auto_execute: boolean;         // Auto-approve actions?
  human_approval_required: string[]; // Actions needing approval
}

interface AgentPrompts {
  system: string;
  task_breakdown: string | null;
  status_update: string | null;
  code_review: string | null;
}

interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

interface AgentMetrics {
  tasks_completed: number;
  tasks_created: number;
  avg_response_time_ms: number;
  success_rate: number;
  last_active_at: Date | null;
}
```

### AgentTask
Junction table linking agents to tasks with role information.

```typescript
interface AgentTask {
  id: string;
  agent_id: string;              // FK to agents
  task_id: string;               // FK to tasks
  role: 'primary' | 'assistant' | 'observer';
  assigned_at: Date;
  assigned_by: string | null;    // FK to users (who assigned)
}
```

### Comment
Comments on tasks for collaboration.

```typescript
interface Comment {
  id: string;                    // UUID primary key
  task_id: string;               // FK to tasks
  author_id: string;             // FK to users
  author_type: 'user' | 'agent'; // Distinguish human vs AI
  content: string;               // Markdown supported
  parent_id: string | null;      // For threaded replies
  edited_at: Date | null;
  created_at: Date;
}
```

### Attachment
Files attached to tasks.

```typescript
interface Attachment {
  id: string;                    // UUID primary key
  task_id: string;               // FK to tasks
  uploaded_by: string;           // FK to users
  name: string;
  url: string;
  size: number;                  // Bytes
  mime_type: string;
  metadata: AttachmentMetadata;  // JSON: dimensions, etc.
  created_at: Date;
}

interface AttachmentMetadata {
  width?: number;
  height?: number;
  duration?: number;
}
```

### Activity
Audit log for all system actions.

```typescript
interface Activity {
  id: string;                    // UUID primary key
  actor_id: string;              // FK to users or agents
  actor_type: 'user' | 'agent' | 'system';
  action: string;                // e.g., 'task.created', 'task.updated'
  entity_type: 'project' | 'task' | 'agent' | 'comment' | 'user';
  entity_id: string;
  project_id: string | null;     // For filtering by project
  metadata: ActivityMetadata;    // JSON: before/after values
  created_at: Date;
}

interface ActivityMetadata {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}
```

## Knowledge Graph Models (Future)

### KnowledgeNode
Nodes in the project knowledge graph.

```typescript
interface KnowledgeNode {
  id: string;
  project_id: string;
  type: 'task' | 'document' | 'concept' | 'code' | 'decision';
  title: string;
  content: string;
  embedding: number[] | null;    // Vector embedding for semantic search
  metadata: Record<string, unknown>;
  created_at: Date;
}
```

### KnowledgeEdge
Relationships between knowledge nodes.

```typescript
interface KnowledgeEdge {
  id: string;
  source_id: string;             // FK to knowledge_nodes
  target_id: string;             // FK to knowledge_nodes
  type: 'depends_on' | 'relates_to' | 'implements' | 'blocks';
  weight: number;                // Relationship strength
  metadata: Record<string, unknown>;
  created_at: Date;
}
```

## Indexes

### Performance-Critical Indexes

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Team membership
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);

-- Project queries
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Task queries (heavily used)
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_ai_generated ON tasks(ai_generated);

-- Full-text search
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || coalesce(description, '')));

-- Activity feed
CREATE INDEX idx_activities_project ON activities(project_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);

-- Agent queries
CREATE INDEX idx_agents_project ON agents(project_id);
CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_task ON agent_tasks(task_id);
```

## TypeScript Type Exports

```typescript
// packages/shared/src/types/index.ts

export * from './user';
export * from './team';
export * from './project';
export * from './task';
export * from './agent';
export * from './activity';
export * from './comment';
export * from './attachment';

// Re-export commonly used types
export type {
  TaskStatus,
  Priority,
  AgentType,
  AgentStatus,
} from './enums';
```
