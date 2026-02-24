# Tech Stack Selection

## Overview

PM-Cursor is built as a modern, scalable full-stack application with a clear separation between frontend, backend, and AI layers.

## Frontend

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component library |

### State Management
- **Zustand** - Global state management (lightweight, TypeScript-friendly)
- **TanStack Query (React Query)** - Server state management and caching
- **Zod** - Runtime type validation

### Routing & Navigation
- **React Router v6** - Client-side routing
- **TanStack Router** (future consideration) - Type-safe routing

### Real-time Communication
- **Socket.io-client** - WebSocket connections for live updates

### Key Libraries
- **date-fns** - Date manipulation
- **lodash-es** - Utility functions
- **react-hook-form** - Form handling
- **recharts** - Data visualization

## Backend

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| Express | 4.x | Web framework |
| TypeScript | 5.x | Type safety |

### Database & Storage
- **PostgreSQL 16** - Primary database
  - JSONB for flexible metadata
  - Full-text search capabilities
  - Row-level security
- **Redis 7** - Caching and session storage
- **Pinecone/Weaviate** (future) - Vector database for embeddings

### ORM & Query Building
- **Drizzle ORM** - Type-safe SQL
  - Lightweight, SQL-like syntax
  - Excellent TypeScript support
  - Migration support

### Authentication & Security
- **Passport.js** - Authentication middleware
- **JWT** - Token-based auth
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin handling
- **express-rate-limit** - Rate limiting

### Validation
- **Zod** - Schema validation (shared with frontend)

### Background Jobs
- **BullMQ** - Redis-based job queue
  - Task processing
  - Email sending
  - AI job scheduling

### Logging & Monitoring
- **Pino** - Fast JSON logging
- **OpenTelemetry** - Observability (future)

## AI Layer

### LLM Integration
| Service | Purpose |
|---------|---------|
| OpenAI API | Primary LLM (GPT-4, GPT-4o) |
| Anthropic Claude | Alternative LLM |
| Ollama (local) | Self-hosted option |

### AI Framework
- **LangChain** - LLM orchestration
  - Chains and agents
  - Prompt management
  - Memory/conversation history
- **LangGraph** (future) - Complex multi-agent workflows

### Embeddings & Vector Search
- **OpenAI Embeddings** - Text vectorization
- **Pinecone** - Vector database (production)
- **ChromaDB** - Local vector store (development)

### Prompt Management
- Custom prompt registry
- Version-controlled prompts
- A/B testing framework (future)

## Infrastructure

### Containerization
- **Docker** - Container runtime
- **Docker Compose** - Local development
- **multi-stage builds** - Optimized production images

### Orchestration
- **Kubernetes** - Production orchestration
- **Helm** - K8s package management

### CI/CD
- **GitHub Actions** - CI/CD pipeline
  - Automated testing
  - Docker image builds
  - Deployment automation

### Cloud Services (AWS/GCP/Azure)
| Service | Purpose |
|---------|---------|
| S3/Cloud Storage | File uploads, backups |
| RDS/Cloud SQL | Managed PostgreSQL |
| ElastiCache/Memorystore | Managed Redis |
| SES/SendGrid | Email delivery |
| CloudWatch/Monitoring | Observability |

### Domain & CDN
- **Cloudflare** - DNS, CDN, DDoS protection

## Development Tools

### Code Quality
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

### Testing
| Type | Tool |
|------|------|
| Unit | Vitest |
| Integration | Vitest + Supertest |
| E2E | Playwright |
| API | Postman / Insomnia |

### Documentation
- **TypeDoc** - API documentation
- **Storybook** - Component documentation
- **Mintlify** - User documentation site

## Project Structure

```
pm-cursor/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Route pages
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── lib/            # Utilities
│   │   │   └── types/          # TypeScript types
│   │   ├── public/
│   │   └── package.json
│   │
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── services/       # Business logic
│       │   ├── controllers/    # Route handlers
│       │   ├── models/         # Database models
│       │   ├── routes/         # API routes
│       │   ├── middleware/     # Express middleware
│       │   ├── agents/         # AI agent logic
│       │   ├── lib/            # Utilities
│       │   └── types/          # TypeScript types
│       ├── tests/
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types and utilities
│   │   ├── src/
│   │   └── package.json
│   └── ui/                     # Shared UI components
│       ├── src/
│       └── package.json
│
├── ai/
│   ├── prompts/                # LLM prompts
│   ├── agents/                 # Agent definitions
│   └── notebooks/              # Experimentation
│
├── infra/
│   ├── docker/                 # Docker configs
│   ├── k8s/                    # Kubernetes manifests
│   └── terraform/              # Infrastructure as code
│
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
├── .github/                    # GitHub Actions
├── package.json                # Root package (workspaces)
└── turbo.json                  # Turborepo config
```

## Package Management

- **pnpm** - Fast, disk space efficient
- **Turborepo** - Monorepo build system
- **Workspace protocol** - Internal package linking

## Environment Configuration

```
# Development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/pmcursor_dev
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
JWT_SECRET=dev-secret

# Production
NODE_ENV=production
DATABASE_URL=postgresql://... (RDS/Cloud SQL)
REDIS_URL=redis://... (ElastiCache)
OPENAI_API_KEY=sk-...
JWT_SECRET=... (AWS Secrets Manager)
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Time to First Byte | < 200ms |
| First Contentful Paint | < 1.5s |
| API Response (p95) | < 500ms |
| AI Response | < 3s |
| WebSocket Latency | < 100ms |

## Migration Path

### Phase 1: MVP
- Single Node.js process
- SQLite for development
- Single Docker container

### Phase 2: Scale
- PostgreSQL + Redis
- Service separation
- Kubernetes deployment

### Phase 3: Enterprise
- Multi-region deployment
- Advanced caching
- Dedicated AI infrastructure
