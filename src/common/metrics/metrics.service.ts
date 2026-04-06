import { Injectable, Logger } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // ==========================================
  // EVENT METRICS
  // ==========================================
  public readonly eventsReceived = new client.Counter({
    name: 'events_received_total',
    help: 'Total number of events received',
    labelNames: ['source_id', 'event_type'],
  });

  public readonly eventsProcessed = new client.Counter({
    name: 'events_processed_total',
    help: 'Total number of events successfully processed',
    labelNames: ['status'],
  });

  public readonly eventsFailed = new client.Counter({
    name: 'events_failed_total',
    help: 'Total number of events that failed processing',
    labelNames: ['reason'],
  });

  public readonly eventProcessingDuration = new client.Histogram({
    name: 'event_processing_duration_seconds',
    help: 'Event processing duration in seconds',
    labelNames: ['event_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  });

  // ==========================================
  // EXECUTION METRICS
  // ==========================================
  public readonly executionsCreated = new client.Counter({
    name: 'executions_created_total',
    help: 'Total number of action executions created',
    labelNames: ['action_type'],
  });

  public readonly executionsCompleted = new client.Counter({
    name: 'executions_completed_total',
    help: 'Total number of action executions completed',
    labelNames: ['action_type', 'status'],
  });

  public readonly executionDuration = new client.Histogram({
    name: 'execution_duration_seconds',
    help: 'Action execution duration in seconds',
    labelNames: ['action_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  });

  public readonly executionsRetried = new client.Counter({
    name: 'executions_retried_total',
    help: 'Total number of execution retries',
    labelNames: ['attempt_number'],
  });

  public readonly executionsDeadLettered = new client.Counter({
    name: 'executions_dead_lettered_total',
    help: 'Total number of executions moved to dead letter queue',
    labelNames: ['error_category'],
  });

  // ==========================================
  // QUEUE METRICS
  // ==========================================
  public readonly queueDepth = new client.Gauge({
    name: 'queue_depth',
    help: 'Current number of jobs in queue',
    labelNames: ['queue_name'],
  });

  public readonly queueProcessingRate = new client.Counter({
    name: 'queue_jobs_processed_total',
    help: 'Total number of jobs processed from queue',
    labelNames: ['queue_name', 'status'],
  });

  public readonly queueJobWaitTime = new client.Histogram({
    name: 'queue_job_wait_time_seconds',
    help: 'Time job waited in queue before processing',
    labelNames: ['queue_name'],
    buckets: [1, 5, 10, 30, 60, 300, 600],
  });

  // ==========================================
  // RULE ENGINE METRICS
  // ==========================================
  public readonly rulesEvaluated = new client.Counter({
    name: 'rules_evaluated_total',
    help: 'Total number of rules evaluated',
    labelNames: ['matched'],
  });

  public readonly ruleEvaluationDuration = new client.Histogram({
    name: 'rule_evaluation_duration_seconds',
    help: 'Rule engine evaluation duration',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  });

  // ==========================================
  // WEBHOOK METRICS
  // ==========================================
  public readonly webhookRequests = new client.Counter({
    name: 'webhook_requests_total',
    help: 'Total number of webhook requests made',
    labelNames: ['status_code', 'target'],
  });

  public readonly webhookDuration = new client.Histogram({
    name: 'webhook_request_duration_seconds',
    help: 'Webhook request duration',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  public readonly webhookFailures = new client.Counter({
    name: 'webhook_failures_total',
    help: 'Total number of webhook failures',
    labelNames: ['error_type'],
  });

  // ==========================================
  // HTTP METRICS
  // ==========================================
  public readonly httpRequests = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  public readonly httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });

  constructor() {
    // Register all metrics
    client.register.registerMetric(this.eventsReceived);
    client.register.registerMetric(this.eventsProcessed);
    client.register.registerMetric(this.eventsFailed);
    client.register.registerMetric(this.eventProcessingDuration);
    client.register.registerMetric(this.executionsCreated);
    client.register.registerMetric(this.executionsCompleted);
    client.register.registerMetric(this.executionDuration);
    client.register.registerMetric(this.executionsRetried);
    client.register.registerMetric(this.executionsDeadLettered);
    client.register.registerMetric(this.queueDepth);
    client.register.registerMetric(this.queueProcessingRate);
    client.register.registerMetric(this.queueJobWaitTime);
    client.register.registerMetric(this.rulesEvaluated);
    client.register.registerMetric(this.ruleEvaluationDuration);
    client.register.registerMetric(this.webhookRequests);
    client.register.registerMetric(this.webhookDuration);
    client.register.registerMetric(this.webhookFailures);
    client.register.registerMetric(this.httpRequests);
    client.register.registerMetric(this.httpRequestDuration);

    // Set default Node.js metrics
    client.collectDefaultMetrics({
      register: client.register,
      prefix: 'nodejs_',
    });

    this.logger.log('✅ Prometheus metrics registered');
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return client.register.metrics();
  }

  /**
   * Get content type for metrics endpoint
   */
  getContentType(): string {
    return client.register.contentType;
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequests.inc({ method, route, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  /**
   * Update queue depth gauge
   */
  setQueueDepth(queueName: string, count: number) {
    this.queueDepth.set({ queue_name: queueName }, count);
  }

  /**
   * Record event processing
   */
  recordEvent(sourceId: string, eventType: string, duration: number, success: boolean) {
    this.eventsReceived.inc({ source_id: sourceId, event_type: eventType });
    this.eventProcessingDuration.observe({ event_type: eventType }, duration);
    
    if (success) {
      this.eventsProcessed.inc({ status: 'success' });
    } else {
      this.eventsFailed.inc({ reason: 'processing_error' });
    }
  }
}
