/**
 * PM-Cursor: AI-native Product Management
 * 
 * Main entry point and exports
 */

export * from './types';
export * from './ingestion';
export * from './analytics';
export * from './ai';
export * from './report';

// Re-export main classes for convenience
export { DataIngestor, MixpanelSource, CSVSource, JSONSource } from './ingestion';
export { AnalyticsEngine } from './analytics';
export { AIAnalyzer } from './ai';
export { ReportGenerator } from './report';
