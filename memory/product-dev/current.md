# Current Product Development

## Active Products

### 1. A2A-Coop: Agent-to-Agent Collaboration Engine ✅

**Status**: v0.2.0 Complete - REST API Added

**What**: Enterprise-grade agent collaboration system enabling multiple AI agents to share context, divide tasks, coordinate execution, and report collective results.

**Completed**:
- [x] Core architecture (Registry, MessageBus, ContextStore, TaskOrchestrator)
- [x] WebSocket API server for remote agent connections
- [x] TypeScript client SDK with promise-based API
- [x] Comprehensive test suite (148+ tests)
- [x] **Rate limiting middleware** with sliding window algorithm
- [x] **Health check endpoint** (`/health`) for monitoring
- [x] **Docker & docker-compose** for easy deployment
- [x] **Complete API documentation** (docs/API.md)
- [x] Enhanced README with examples
- [x] **HTTP REST API** for simpler integrations (NEW!)
  - Full CRUD for agents, tasks, contexts
  - Message send/broadcast endpoints
  - System status endpoint
  - Comprehensive test coverage (68 new tests)

**Location**: `/products/a2a-coop/`

**Quick Start**:
```bash
cd products/a2a-coop
npm install
npm test
npm run server

# Or with Docker
docker-compose up -d
```

**REST API Examples**:
```bash
# Create an agent
curl -X POST http://localhost:8080/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "ResearchAgent", "capabilities": ["research"]}'

# Create a task
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"request": {...}, "createdBy": "agent-id"}'

# Get system status
curl http://localhost:8080/api/status
```

**Next Steps** (v0.3.0):
- [ ] Persistent storage (Redis/PostgreSQL)
- [ ] Authentication & authorization
- [ ] Metrics and monitoring
- [ ] Example multi-agent workflows

---

### 2. PM-Cursor: AI-Native Product Management

**Status**: Concept Phase

**What**: System that analyzes user analytics data (Mixpanel, Databricks, GA) to identify what to build next.

**Location**: `/products/pm-cursor/`

**Next Steps**:
- Define core data ingestion architecture
- Design analysis engine for insight generation
- Create proof-of-concept with sample data

---

### 3. Agent-Native Notion Alternative

**Status**: Research Phase

**Goal**: Create a GitHub-based alternative to Notion designed specifically for AI agents

**Why**: Current tools (Notion, Google Docs) are built for humans. Agents need:
- Git-native versioning
- Markdown-first content
- Programmatic access
- Structured data with semantic search

## Status

| Phase | Status | Agent | Last Update |
|-------|--------|-------|-------------|
| Research | 🔄 In Progress | - | - |
| Development | ⏳ Pending | - | - |
| Code Review | ⏳ Pending | - | - |

## Research Questions

1. What existing Git-based CMS/wiki tools exist? (GitBook, Docusaurus, etc.)
2. How to structure content for both human and agent consumption?
3. What AI-native features would differentiate this? (auto-tagging, semantic search, agent API)
4. Tech stack: Next.js? Svelte? Pure static?

## Deliverables

- [ ] Research report
- [ ] Architecture decision record
- [ ] MVP implementation
- [ ] GitHub repository

## Notes

- Target: GitHub Pages deployment for zero-cost hosting
- Focus: Markdown content with YAML frontmatter
- Differentiator: Built-in agent API and semantic search

---

**Last Updated**: 2026-02-24
