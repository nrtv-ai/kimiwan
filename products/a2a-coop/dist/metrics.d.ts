/**
 * Metrics and monitoring for A2A-Coop
 *
 * Provides:
 * - Request/response metrics
 * - Agent activity tracking
 * - Task lifecycle metrics
 * - Message throughput
 * - Custom metrics
 */
export interface MetricValue {
    name: string;
    value: number;
    timestamp: Date;
    labels?: Record<string, string>;
}
export interface CounterMetric {
    count: number;
    lastUpdated: Date;
}
export interface GaugeMetric {
    value: number;
    lastUpdated: Date;
}
export interface HistogramMetric {
    buckets: Map<number, number>;
    sum: number;
    count: number;
    min: number;
    max: number;
}
export interface TimingMetric {
    durations: number[];
    sum: number;
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
}
/**
 * Metrics collector for A2A-Coop
 */
export declare class MetricsCollector {
    private counters;
    private gauges;
    private histograms;
    private timings;
    private startTime;
    private requestCounts;
    private errorCounts;
    private requestDurations;
    private agentConnections;
    private agentDisconnections;
    private messagesByAgent;
    private tasksCreated;
    private tasksCompleted;
    private tasksFailed;
    private taskDurations;
    private messagesSent;
    private messagesBroadcast;
    private bytesTransferred;
    /**
     * Increment a counter
     */
    incrementCounter(name: string, labels?: Record<string, string>): void;
    /**
     * Set a gauge value
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Record a value in a histogram
     */
    recordHistogram(name: string, value: number, buckets?: number[], labels?: Record<string, string>): void;
    /**
     * Record a timing
     */
    recordTiming(name: string, durationMs: number, labels?: Record<string, string>): void;
    /**
     * Record a WebSocket request
     */
    recordRequest(type: string, durationMs: number, error?: boolean): void;
    /**
     * Record agent connection
     */
    recordAgentConnect(): void;
    /**
     * Record agent disconnection
     */
    recordAgentDisconnect(): void;
    /**
     * Record message from agent
     */
    recordAgentMessage(agentId: string): void;
    /**
     * Record task creation
     */
    recordTaskCreated(): void;
    /**
     * Record task completion
     */
    recordTaskCompleted(durationMs: number, success: boolean): void;
    /**
     * Record message sent
     */
    recordMessageSent(bytes: number): void;
    /**
     * Record broadcast
     */
    recordBroadcast(count: number): void;
    /**
     * Get all metrics summary
     */
    getMetrics(): MetricsSummary;
    /**
     * Get metrics in Prometheus format
     */
    getPrometheusMetrics(): string;
    /**
     * Reset all metrics
     */
    reset(): void;
    private keyWithLabels;
    private percentile;
}
/**
 * Metrics summary interface
 */
export interface MetricsSummary {
    uptime: number;
    requests: {
        total: number;
        byType: Record<string, number>;
        errors: number;
        errorRate: number;
        avgDuration: number;
    };
    agents: {
        connections: number;
        disconnections: number;
        activeConnections: number;
        messagesByAgent: Record<string, number>;
    };
    tasks: {
        created: number;
        completed: number;
        failed: number;
        successRate: number;
        avgDuration: number;
    };
    messages: {
        sent: number;
        broadcasts: number;
        bytesTransferred: number;
    };
    counters: Record<string, number>;
    gauges: Record<string, number>;
}
/**
 * Create a metrics collector with default A2A-Coop metrics
 */
export declare function createMetricsCollector(): MetricsCollector;
//# sourceMappingURL=metrics.d.ts.map