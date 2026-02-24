# PM-Cursor Development Guide

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- OpenAI API key

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```
   Edit the `.env` files with your configuration.

3. **Start databases**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - API server at http://localhost:3001
   - Web app at http://localhost:5173

## Project Structure

```
pm-cursor/
├── apps/
│   ├── api/          # Express backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared types and utilities
├── ai/               # AI prompts and configurations
└── docs/             # Documentation
```

## Development Workflow

### Adding a New Feature

1. Create a feature branch
2. Implement in both API and Web if needed
3. Add tests
4. Update documentation
5. Submit PR

### Database Changes

1. Modify schema in `apps/api/src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`

### AI Prompt Changes

1. Edit prompts in `ai/prompts/`
2. Test with example inputs
3. Version control the changes

## Testing

```bash
# Run all tests
npm test

# Run specific workspace tests
npm test --workspace=apps/api

# Run E2E tests
npm run test:e2e
```

## Deployment

See [infra/README.md](./infra/README.md) for deployment instructions.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting PRs.
