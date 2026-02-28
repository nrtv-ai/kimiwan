/**
 * CLI for PM-Cursor
 * 
 * Command-line interface for ingesting data, running analysis, and generating reports.
 */

import { Command } from 'commander';
import { DataIngestor, JSONSource } from './ingestion';
import { AIAnalyzer } from './ai';
import { ReportGenerator } from './report';
import { DataSourceConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('pm-cursor')
  .description('AI-native product management - analyze user analytics to identify what to build')
  .version('0.1.0');

program
  .command('ingest')
  .description('Ingest analytics data from a source')
  .requiredOption('-s, --source <type>', 'Source type (json, csv, mixpanel)')
  .requiredOption('-f, --file <path>', 'Path to data file')
  .option('-n, --name <name>', 'Source name', 'default')
  .action(async (options) => {
    try {
      console.log(`📥 Ingesting data from ${options.source} source: ${options.file}`);
      
      const config: DataSourceConfig = {
        type: options.source,
        name: options.name,
        credentials: { filePath: options.file }
      };
      
      const ingestor = new DataIngestor();
      const source = ingestor.createSource(config);
      ingestor.registerSource(options.name, source);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const { events, profiles } = await ingestor.ingestFromSource(
        options.name,
        startDate,
        endDate
      );
      
      console.log(`✅ Ingested ${events.length} events and ${profiles.length} user profiles`);
      
      // Save to local cache
      const cacheDir = './.pm-cursor/cache';
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(
        path.join(cacheDir, 'events.json'),
        JSON.stringify(events, null, 2)
      );
      
      console.log(`💾 Data cached to ${cacheDir}/events.json`);
    } catch (error) {
      console.error('❌ Ingestion failed:', error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze ingested data and generate insights')
  .option('-k, --api-key <key>', 'AI API key', process.env.PM_CURSOR_API_KEY)
  .option('-p, --provider <provider>', 'AI provider (anthropic|openai)', 'anthropic')
  .action(async (options) => {
    try {
      if (!options.apiKey) {
        console.error('❌ API key required. Set PM_CURSOR_API_KEY or use --api-key');
        process.exit(1);
      }
      
      console.log('🔍 Loading data...');
      const cachePath = './.pm-cursor/cache/events.json';
      
      if (!fs.existsSync(cachePath)) {
        console.error('❌ No cached data found. Run `pm-cursor ingest` first.');
        process.exit(1);
      }
      
      const events = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      console.log(`📊 Loaded ${events.length} events`);
      
      console.log('🤖 Analyzing with AI...');
      const ai = new AIAnalyzer({
        provider: options.provider,
        apiKey: options.apiKey
      });
      
      // Import analytics engine for session building
      const { AnalyticsEngine } = await import('./analytics');
      const analytics = new AnalyticsEngine();
      const sessions = analytics.buildSessions(events);
      const metrics = analytics.calculateMetrics(events, sessions);
      
      const insights = await ai.generateInsights(events, sessions, [], metrics);
      
      console.log(`\n💡 Found ${insights.length} insights:\n`);
      for (const insight of insights) {
        const emoji = insight.severity === 'critical' ? '🚨' : 
                     insight.severity === 'high' ? '⚠️' : '💡';
        console.log(`${emoji} ${insight.title}`);
        console.log(`   ${insight.description.slice(0, 100)}...`);
        console.log(`   Confidence: ${(insight.confidence * 100).toFixed(0)}% | Affected: ${insight.affectedUsers} users\n`);
      }
      
      // Save insights
      fs.writeFileSync(
        './.pm-cursor/cache/insights.json',
        JSON.stringify(insights, null, 2)
      );
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate full product analytics report')
  .option('-k, --api-key <key>', 'AI API key', process.env.PM_CURSOR_API_KEY)
  .option('-p, --provider <provider>', 'AI provider', 'anthropic')
  .option('-o, --output <path>', 'Output file path', './report.md')
  .action(async (options) => {
    try {
      if (!options.apiKey) {
        console.error('❌ API key required. Set PM_CURSOR_API_KEY or use --api-key');
        process.exit(1);
      }
      
      console.log('📄 Generating report...');
      
      const cachePath = './.pm-cursor/cache/events.json';
      if (!fs.existsSync(cachePath)) {
        console.error('❌ No cached data found. Run `pm-cursor ingest` first.');
        process.exit(1);
      }
      
      const events = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      
      const ai = new AIAnalyzer({
        provider: options.provider,
        apiKey: options.apiKey
      });
      
      const generator = new ReportGenerator(ai);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const report = await generator.generateReport(events, {
        title: 'Product Analytics Report',
        period: { start: startDate, end: endDate },
        funnels: [
          {
            name: 'Onboarding Flow',
            steps: [
              { name: 'Sign Up', event: 'sign_up' },
              { name: 'Complete Profile', event: 'profile_complete' },
              { name: 'First Action', event: 'first_action' }
            ]
          }
        ]
      });
      
      const markdown = generator.formatReportAsMarkdown(report);
      fs.writeFileSync(options.output, markdown);
      
      console.log(`✅ Report saved to ${options.output}`);
      console.log(`\n📊 Summary:`);
      console.log(`   ${report.insights.length} insights`);
      console.log(`   ${report.recommendations.length} recommendations`);
      console.log(`   ${report.funnels.length} funnels analyzed`);
      
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('Run with sample data to see PM-Cursor in action')
  .option('-k, --api-key <key>', 'AI API key', process.env.PM_CURSOR_API_KEY)
  .option('-p, --provider <provider>', 'AI provider', 'anthropic')
  .action(async (options) => {
    console.log('🎮 PM-Cursor Demo Mode\n');
    
    // Generate sample data
    const sampleEvents = generateSampleData();
    console.log(`Generated ${sampleEvents.length} sample events\n`);
    
    // Save to cache
    const cacheDir = './.pm-cursor/cache';
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, 'events.json'),
      JSON.stringify(sampleEvents, null, 2)
    );
    
    if (options.apiKey) {
      console.log('🤖 Analyzing with AI...\n');
      const ai = new AIAnalyzer({
        provider: options.provider,
        apiKey: options.apiKey
      });
      
      const { AnalyticsEngine } = await import('./analytics');
      const analytics = new AnalyticsEngine();
      const sessions = analytics.buildSessions(sampleEvents);
      const metrics = analytics.calculateMetrics(sampleEvents, sessions);
      
      console.log('📊 Key Metrics:');
      for (const metric of metrics) {
        console.log(`   ${metric.name}: ${metric.value}`);
      }
      
      console.log('\n🔍 Running AI analysis...\n');
      const insights = await ai.generateInsights(sampleEvents, sessions, [], metrics);
      
      console.log('💡 AI-Generated Insights:\n');
      for (const insight of insights) {
        const emoji = insight.severity === 'critical' ? '🚨' : 
                     insight.severity === 'high' ? '⚠️' : '💡';
        console.log(`${emoji} ${insight.title} (${insight.type})`);
        console.log(`   ${insight.description}`);
        console.log(`   → Suggested: ${insight.suggestedActions.join(', ')}\n`);
      }
    } else {
      console.log('💡 Set PM_CURSOR_API_KEY to see AI-powered insights');
      console.log('   Example: PM_CURSOR_API_KEY=your_key npx pm-cursor demo');
    }
  });

function generateSampleData() {
  const events = [];
  const userCount = 1000;
  const now = new Date();
  
  for (let i = 0; i < userCount; i++) {
    const userId = `user_${i}`;
    const signupTime = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    // Sign up event
    events.push({
      id: `evt_${events.length}`,
      userId,
      eventName: 'sign_up',
      timestamp: signupTime,
      properties: { source: Math.random() > 0.5 ? 'organic' : 'paid' }
    });
    
    // 70% complete profile
    if (Math.random() < 0.7) {
      events.push({
        id: `evt_${events.length}`,
        userId,
        eventName: 'profile_complete',
        timestamp: new Date(signupTime.getTime() + Math.random() * 60 * 60 * 1000),
        properties: {}
      });
    }
    
    // 50% perform first action (drop-off point!)
    if (Math.random() < 0.5) {
      events.push({
        id: `evt_${events.length}`,
        userId,
        eventName: 'first_action',
        timestamp: new Date(signupTime.getTime() + Math.random() * 2 * 60 * 60 * 1000),
        properties: {}
      });
      
      // Active users (30%)
      if (Math.random() < 0.6) {
        const sessionCount = Math.floor(Math.random() * 10) + 1;
        for (let s = 0; s < sessionCount; s++) {
          events.push({
            id: `evt_${events.length}`,
            userId,
            eventName: 'session_start',
            timestamp: new Date(signupTime.getTime() + s * 24 * 60 * 60 * 1000),
            properties: {}
          });
          
          // Some users get stuck on a feature
          if (Math.random() < 0.3) {
            events.push({
              id: `evt_${events.length}`,
              userId,
              eventName: 'feature_stuck',
              timestamp: new Date(signupTime.getTime() + s * 24 * 60 * 60 * 1000 + 60000),
              properties: { feature: 'checkout' }
            });
          }
        }
      }
    }
  }
  
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

program.parse();
