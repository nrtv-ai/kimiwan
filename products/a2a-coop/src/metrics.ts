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
  buckets: Map<number, number>; // upper bound -> count
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
export class MetricsCollector {
  private counters = new Map<string, CounterMetric>();
  private gauges = new Map<string, GaugeMetric>();
  private histograms = new Map<string, HistogramMetric>();
  private timings = new Map<string, TimingMetric>();
  private startTime = Date.now();

  // Request metrics
  private requestCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private requestDurations: number[] = [];

  // Agent metrics
  private agentConnections = 0;
  private agentDisconnections = 0;
  private messagesByAgent = new Map<string, number>();

  // Task metrics
  private tasksCreated = 0;
  private tasksCompleted = 0;
  private tasksFailed = 0;
  private taskDurations: number[] = [];

  // Message metrics
  private messagesSent = 0;
  private messagesBroadcast = 0;
  private bytesTransferred = 0;

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.keyWithLabels(name, labels);
    const existing = this.counters.get(key);
    if (existing) {
      existing.count++;
      existing.lastUpdated = new Date();
    } else {
      this.counters.set(key, { count: 1, lastUpdated: new Date() });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.keyWithLabels(name, labels);
    this.gauges.set(key, { value, lastUpdated: new Date() });
  }

  /**
   * Record a value in a histogram
   */
  recordHistogram(name: string, value: number, buckets: number[] = [10, 50, 100, 500, 1000], labels?: Record<string, string>): void {
    const key = this.keyWithLabels(name, labels);
    let hist = this.histograms.get(key);
    
    if (!hist) {
      hist = {
        buckets: new Map(buckets.map(b => [b, 0])),
        sum: 0,
        count: 0,
        min: value,
        max: value,
      };
      this.histograms.set(key, hist);
    }

    hist.sum += value;
    hist.count++;
    hist.min = Math.min(hist.min, value);
    hist.max = Math.max(hist.max, value);

    for (const bucket of buckets) {
      if (value <= bucket) {
        hist.buckets.set(bucket, (hist.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  /**
   * Record a timing
   */
  recordTiming(name: string, durationMs: number, labels?: Record<string, string>): void {
    const key = this.keyWithLabels(name, labels);
    let timing = this.timings.get(key);

    if (!timing) {
      timing = {
        durations: [],
        sum: 0,
        count: 0,
        min: durationMs,
        max: durationMs,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
      this.timings.set(key, timing);
    }

    timing.durations.push(durationMs);
    timing.sum += durationMs;
    timing.count++;
    timing.min = Math.min(timing.min, durationMs);
    timing.max = Math.max(timing.max, durationMs);
    timing.avg = timing.sum / timing.count;

    // Calculate percentiles when we have enough samples
    if (timing.durations.length >= 10) {
      const sorted = [...timing.durations].sort((a, b) => a - b);
      timing.p50 = this.percentile(sorted, 0.5);
      timing.p95 = this.percentile(sorted, 0.95);
      timing.p99 = this.percentile(sorted, 0.99);

      // Keep array size manageable
      if (timing.durations.length > 1000) {
        timing.durations = sorted.slice(-500);
      }
    }
  }

  /**
   * Record a WebSocket request
   */
  recordRequest(type: string, durationMs: number, error?: boolean): void {
    const count = this.requestCounts.get(type) || 0;
    this.requestCounts.set(type, count + 1);

    this.requestDurations.push(durationMs);
    if (this.requestDurations.length > 1000) {
      this.requestDurations = this.requestDurations.slice(-500);
    }

    if (error) {
      const errCount = this.errorCounts.get(type) || 0;
      this.errorCounts.set(type, errCount + 1);
    }
  }

  /**
   * Record agent connection
   */
  recordAgentConnect(): void {
    this.agentConnections++;
  }

  /**
   * Record agent disconnection
   */
  recordAgentDisconnect(): void {
    this.agentDisconnections++;
  }

  /**
   * Record message from agent
   */
  recordAgentMessage(agentId: string): void {
    const count = this.messagesByAgent.get(agentId) || 0;
    this.messagesByAgent.set(agentId, count + 1);
  }

  /**
   * Record task creation
   */
  recordTaskCreated(): void {
    this.tasksCreated++;
  }

  /**
   * Record task completion
   */
  recordTaskCompleted(durationMs: number, success: boolean): void {
    this.tasksCompleted++;
    this.taskDurations.push(durationMs);
    if (this.taskDurations.length > 1000) {
      this.taskDurations = this.taskDurations.slice(-500);
    }
    if (!success) {
      this.tasksFailed++;
    }
  }

  /**
   * Record message sent
   */
  recordMessageSent(bytes: number): void {
    this.messagesSent++;
    this.bytesTransferred += bytes;
  }

  /**
   * Record broadcast
   */
  recordBroadcast(count: number): void {
    this.messagesBroadcast += count;
  }

  /**
   * Get all metrics summary
   */
  getMetrics(): MetricsSummary {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Calculate request stats
    const totalRequests = Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const avgRequestDuration = this.requestDurations.length > 0 
      ? this.requestDurations.reduce((a, b) => a + b, 0) / this.requestDurations.length 
      : 0;

    // Calculate task stats
    const avgTaskDuration = this.taskDurations.length > 0 
      ? this.taskDurations.reduce((a, b) => a + b, 0) / this.taskDurations.length 
      : 0;

    return {
      uptime,
      requests: {
        total: totalRequests,
        byType: Object.fromEntries(this.requestCounts),
        errors: totalErrors,
        errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
        avgDuration: avgRequestDuration,
      },
      agents: {
        connections: this.agentConnections,
        disconnections: this.agentDisconnections,
        activeConnections: this.agentConnections - this.agentDisconnections,
        messagesByAgent: Object.fromEntries(this.messagesByAgent),
      },
      tasks: {
        created: this.tasksCreated,
        completed: this.tasksCompleted,
        failed: this.tasksFailed,
        successRate: this.tasksCompleted > 0 
          ? (this.tasksCompleted - this.tasksFailed) / this.tasksCompleted 
          : 0,
        avgDuration: avgTaskDuration,
      },
      messages: {
        sent: this.messagesSent,
        broadcasts: this.messagesBroadcast,
        bytesTransferred: this.bytesTransferred,
      },
      counters: Object.fromEntries(
        Array.from(this.counters.entries()).map(([k, v]) => [k, v.count])
      ),
      gauges: Object.fromEntries(
        Array.from(this.gauges.entries()).map(([k, v]) => [k, v.value])
      ),
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    // Counters
    for (const [key, metric] of this.counters) {
      const [name, ...labelParts] = key.split('#');
      const labels = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labels} ${metric.count} ${timestamp}`);
    }

    // Gauges
    for (const [key, metric] of this.gauges) {
      const [name, ...labelParts] = key.split('#');
      const labels = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${labels} ${metric.value} ${timestamp}`);
    }

    // Timings
    for (const [key, metric] of this.timings) {
      const [name, ...labelParts] = key.split('#');
      const labels = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
      lines.push(`# TYPE ${name} summary`);
      lines.push(`${name}_count${labels} ${metric.count} ${timestamp}`);
      lines.push(`${name}_sum${labels} ${metric.sum} ${timestamp}`);
      lines.push(`${name}{quantile="0.5"${labels ? ',' + labels.slice(1, -1) : ''}} ${metric.p50} ${timestamp}`);
      lines.push(`${name}{quantile="0.95"${labels ? ',' + labels.slice(1, -1) : ''}} ${metric.p95} ${timestamp}`);
      lines.push(`${name}{quantile="0.99"${labels ? ',' + labels.slice(1, -1) : ''}} ${metric.p99} ${timestamp}`);
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timings.clear();
    this.requestCounts.clear();
    this.errorCounts.clear();
    this.requestDurations = [];
    this.agentConnections = 0;
    this.agentDisconnections = 0;
    this.messagesByAgent.clear();
    this.tasksCreated = 0;
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
    this.taskDurations = [];
    this.messagesSent = 0;
    this.messagesBroadcast = 0;
    this.bytesTransferred = 0;
    this.startTime = Date.now();
  }

  private keyWithLabels(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}#{${labelStr}}`;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
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
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}
