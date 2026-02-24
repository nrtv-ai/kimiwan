# ACP Pricing Optimization Analysis

## Current State

### My ACP Offerings
| Service | Price | Description |
|---------|-------|-------------|
| deep_research | $0.25 | Multi-source deep research synthesis |
| code_review | $0.50 | Security-focused code review |
| web_automation | $0.50 | Browser automation and data extraction |

### Kimi K2.5 Pricing (RMB → USD)
*Exchange rate: 1 USD ≈ 7.3 CNY*

| Cost Type | RMB per 1M | USD per 1M |
|-----------|-----------|-----------|
| Input (cache hit) | ¥0.70 | ~$0.096 |
| Input (cache miss) | ¥4.00 | ~$0.55 |
| Output | ¥21.00 | ~$2.88 |

## Actual Token Consumption Analysis

From recent sessions, I can see usage patterns:

### Typical Session Examples:
1. **Simple query response**: ~13K-16K total tokens
2. **Research + synthesis**: ~15K-19K total tokens  
3. **Complex multi-step task**: ~18K+ total tokens

### Estimated Cost Per Job (assuming 50/50 cache hit/miss average):

| Scenario | Input Tokens | Output Tokens | Est. Cost |
|----------|-------------|---------------|-----------|
| **Deep Research** (5 sources, synthesis) | ~8K | ~2K | ~$0.10-0.15 |
| **Code Review** (medium file) | ~6K | ~1.5K | ~$0.08-0.12 |
| **Web Automation** (single page) | ~5K | ~1K | ~$0.06-0.09 |

## Profitability Analysis

| Service | Current Price | Est. Cost | Margin | Margin % |
|---------|--------------|-----------|--------|----------|
| deep_research | $0.25 | $0.12 | $0.13 | 52% |
| code_review | $0.50 | $0.10 | $0.40 | 80% |
| web_automation | $0.50 | $0.08 | $0.42 | 84% |

## Issues Identified

1. **deep_research is underpriced** - Complex research with multiple searches can easily exceed $0.20 in costs alone
2. **No pricing tier for complexity** - A 10-line code review vs 500-line review = same price
3. **No buffer for edge cases** - Long outputs, multiple tool calls, retries
4. **Fixed pricing doesn't scale** - Large research jobs should cost more

## Recommended Pricing Strategy

### Option A: Tiered Pricing (Recommended)

| Service | Basic | Standard | Premium |
|---------|-------|----------|---------|
| deep_research | $0.25 (3 sources) | $0.50 (5 sources) | $1.00 (10 sources) |
| code_review | $0.50 (<100 lines) | $1.00 (<500 lines) | $2.00 (unlimited) |
| web_automation | $0.50 (single page) | $1.00 (multi-step) | $2.00 (complex flow) |

### Option B: Cost-Plus with Minimum

Base formula: `max($0.25, actual_cost × 2.5)`

This ensures:
- Minimum viable profit on small jobs
- 150% markup covers overhead + profit
- Fair pricing for large/complex requests

### Option C: Subscription + Usage

- Base access: $5/month
- Per-request: $0.10-0.20 (at cost or minimal markup)
- Better for repeat customers

## Immediate Actions

1. **Update deep_research to $0.50 minimum** - Current $0.25 is too thin
2. **Add complexity parameters** to all offerings
3. **Monitor actual costs** for 1 week to refine
4. **Consider output token limits** to prevent runaway costs

## Risk Factors

- Token costs may change
- Complex queries can spike costs unexpectedly
- ACP takes a cut (need to verify %)
- Customer price sensitivity unknown

## Next Steps

1. Which pricing model do you prefer?
2. Should I update the offerings now or test current pricing first?
3. Do you want me to add complexity-based pricing parameters?
