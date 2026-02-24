# PM-Cursor

**AI-Native Project Management Tool - v0.1.0**

PM-Cursor is an intelligent project management platform designed for the AI era. Unlike traditional PM tools that treat AI as an afterthought, PM-Cursor is built from the ground up with AI agents as first-class citizens in the project workflow.

## 🚀 Current Status: Foundation Phase (v0.1.0)

### What's Working
- ✅ Full project/task/agent CRUD
- ✅ AI-powered task breakdown, status summaries, and risk analysis
- ✅ Real-time WebSocket infrastructure
- ✅ Responsive React frontend
- ✅ PostgreSQL + Drizzle ORM
- ✅ Docker Compose for local dev

### Quick Start

```bash
# 1. Clone and setup
cd projects/pm-cursor

# 2. Set up environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and add your OPENAI_API_KEY

# 3. Start with Docker (recommended)
docker-compose up -d

# Or manually:
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start dev servers
npm run dev
```

The app will be available at:
- Web UI: http://localhost:5173
- API: http://localhost:3001

### AI Features

1. **Task Breakdown** - AI analyzes your project and creates structured tasks
2. **Status Summary** - Get AI-generated project status reports
3. **Risk Analysis** - Identify potential risks with mitigation strategies

## Vision

We believe the future of project management is not about humans managing AI, but about **humans and AI collaborating seamlessly** to deliver better outcomes faster.

### Core Principles

1. **AI-Native Architecture** - Every feature is designed with AI collaboration in mind
2. **Context-Aware Intelligence** - AI agents understand project context, history, and goals
3. **Transparent Decision Making** - Clear visibility into AI recommendations and actions
4. **Human-in-the-Loop** - Humans retain control while AI handles the heavy lifting
5. **Continuous Learning** - The system improves from every interaction

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for development plans.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + TanStack Query
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Cache**: Redis
- **AI**: OpenAI API (GPT-4o)
- **Real-time**: Socket.io
- **Build**: Turbo + Vite

## Project Structure

```
pm-cursor/
├── apps/
│   ├── api/          # Express backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared types
├── docs/             # Documentation
└── docker-compose.yml
```

## Contributing

This is an active development project. See [ROADMAP.md](./ROADMAP.md) for areas that need help.

## License

MIT License

---

Built with ❤️ by the PM-Cursor team
