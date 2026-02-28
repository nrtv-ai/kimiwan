# PM-Cursor: AI-Native Product Management

**Answer: "What should we build next?"**

PM-Cursor analyzes your user analytics data (Mixpanel, Amplitude, Segment, or raw JSON/CSV) and uses AI to identify friction points, drop-offs, and growth opportunities. It generates actionable product recommendations prioritized by impact and effort.

## Features

- 📊 **Multi-source ingestion** - Mixpanel, Amplitude, Segment, GA4, JSON, CSV
- 🔍 **Automatic analysis** - Funnels, cohorts, session analysis, pattern detection
- 🤖 **AI-powered insights** - Claude or GPT-4 analyze your data for hidden patterns
- 💡 **Smart recommendations** - Prioritized by impact, effort, and confidence
- 📄 **Beautiful reports** - Markdown reports ready for sharing

## Quick Start

### Installation

```bash
npm install pm-cursor
# or
yarn add pm-cursor
```

### CLI Usage

```bash
# Set your AI API key
export PM_CURSOR_API_KEY="your-anthropic-or-openai-key"

# 1. Ingest your analytics data
npx pm-cursor ingest -s json -f ./my-events.json

# 2. Generate AI-powered insights
npx pm-cursor analyze

# 3. Create full report
npx pm-cursor report -o ./report.md

# Or try the demo with sample data
npx pm-cursor demo
```

### Programmatic Usage

```typescript
import { DataIngestor, AIAnalyzer, ReportGenerator } from 'pm-cursor';

// Ingest data
const ingestor = new DataIngestor();
const source = ingestor.createSource({
  type: 'json',
  name: 'production',
  credentials: { filePath: './events.json' }
});
ingestor.registerSource('prod', source);

const { events, profiles } = await ingestor.ingestFromSource(
  'prod',
  new Date('2024-01-01'),
  new Date('2024-02-01')
);

// Analyze with AI
const ai = new AIAnalyzer({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!
});

const generator = new ReportGenerator(ai);
const report = await generator.generateReport(events, {
  title: 'Q1 Product Analysis',
  period: { start: new Date('2024-01-01'), end: new Date('2024-02-01') },
  funnels: [
    {
      name: 'Onboarding',
      steps: [
        { name: 'Sign Up', event: 'sign_up' },
        { name: 'Complete Profile', event: 'profile_complete' },
        { name: 'First Action', event: 'first_action' }
      ]
    }
  ]
});

// Output markdown report
console.log(generator.formatReportAsMarkdown(report));
```

## Data Format

PM-Cursor accepts standard analytics event formats:

```json
{
  "events": [
    {
      "id": "evt_123",
      "user_id": "user_456",
      "event": "purchase",
      "timestamp": "2024-01-15T10:30:00Z",
      "properties": {
        "amount": 99.99,
        "product": "premium_plan"
      }
    }
  ]
}
```

Field names are automatically normalized (`user_id`, `userId`, `distinct_id` all work).

## AI Providers

PM-Cursor supports both Anthropic and OpenAI:

```bash
# Anthropic (default)
export PM_CURSOR_API_KEY="sk-ant-..."
npx pm-cursor analyze

# OpenAI
export PM_CURSOR_API_KEY="sk-..."
npx pm-cursor analyze -p openai
```

## How It Works

1. **Ingest** - Pull events from your analytics platform or files
2. **Analyze** - Calculate metrics, funnels, sessions, and patterns
3. **AI Analysis** - LLM identifies insights from the aggregated data
4. **Recommend** - Generate prioritized product recommendations
5. **Report** - Output formatted markdown report

## Sample Output

```markdown
# Product Analytics Report

## Summary

- 5 insights identified (1 critical, 2 high)
- 4 recommendations generated (2 priority "now")

## Critical Issues

🚨 50% drop-off at checkout (1,250 users affected)

## Immediate Actions

- Simplify checkout form to 2 fields
- Add progress indicator to onboarding
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
npm run dev
```

## Roadmap

- [x] Core analytics engine (funnels, cohorts, sessions)
- [x] AI insight generation
- [x] Report generation
- [x] CLI interface
- [ ] Mixpanel/Amplitude API integrations
- [ ] Persistent storage (SQLite)
- [ ] Web dashboard
- [ ] Slack/Discord notifications
- [ ] Scheduled reports

## License

MIT
