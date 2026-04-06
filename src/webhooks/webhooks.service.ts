import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { PrismaService } from '../common/database/prisma.service';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly axiosInstance = axios.create();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {
    // Setup axios defaults
    const timeout = this.configService.get('webhook.timeoutMs', 30000) as number;
    this.axiosInstance.defaults.timeout = timeout;
    this.axiosInstance.defaults.maxRedirects = this.configService.get('webhook.maxRedirects', 5) as number;

    // Setup interceptors for logging
    this.axiosInstance.interceptors.request.use((config) => {
      config.headers['x-request-start-time'] = Date.now().toString();
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error),
    );
  }

  /**
   * Call a webhook URL
   */
  async callWebhook(executionId: string, config: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
  }): Promise<{ status: number; body: string; headers: Record<string, string> }> {
    const startTime = Date.now();
    const method = config.method || 'POST';

    this.logger.log(`Calling webhook: ${method} ${config.url} for execution ${executionId}`);

    const requestConfig: AxiosRequestConfig = {
      url: config.url,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-EventFlow-Execution-Id': executionId,
        ...config.headers,
      },
      data: config.body,
      validateStatus: () => true, // Accept any status code
    };

    let response: AxiosResponse;
    let duration: number;

    try {
      response = await this.axiosInstance.request(requestConfig);
      duration = Date.now() - startTime;
    } catch (error) {
      duration = Date.now() - startTime;
      return this.handleWebhookError(error, executionId, config, startTime, duration);
    }

    // Store delivery record
    await this.storeDelivery(
      executionId,
      { url: config.url, method, headers: requestConfig.headers, data: config.body },
      response,
      startTime,
      duration,
      true,
    );

    // Record metrics
    this.metrics.webhookRequests.inc({
      status_code: String(response.status),
      target: new URL(config.url).hostname,
    });
    this.metrics.webhookDuration.observe(duration / 1000);

    this.logger.log(`Webhook call successful: ${response.status} in ${duration}ms`);

    return {
      status: response.status,
      body: JSON.stringify(response.data),
      headers: response.headers as Record<string, string>,
    };
  }

  private async handleWebhookError(
    error: any,
    executionId: string,
    config: { url: string; method?: string; headers?: any; body?: any },
    startTime: number,
    duration: number,
  ): Promise<never> {
    const axiosError = error as AxiosError;
    
    let status = 0;
    let responseBody = '';
    let errorMessage = '';

    if (axiosError.response) {
      // Server responded with error status
      status = axiosError.response.status;
      responseBody = JSON.stringify(axiosError.response.data);
      errorMessage = `HTTP ${status}: ${responseBody}`;
    } else if (axiosError.request) {
      // Request made but no response
      errorMessage = `Network error: ${axiosError.message}`;
      this.metrics.webhookFailures.inc({ error_type: 'network' });
    } else {
      // Error in setting up request
      errorMessage = `Request setup error: ${axiosError.message}`;
      this.metrics.webhookFailures.inc({ error_type: 'setup' });
    }

    // Store failed delivery record
    await this.storeDelivery(
      executionId,
      { ...config, method: config.method || 'POST', headers: config.headers },
      axiosError.response || null,
      startTime,
      duration,
      false,
      errorMessage,
    );

    this.logger.error(`Webhook call failed: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  private async storeDelivery(
    executionId: string,
    request: { url: string; method: string; headers?: any; data?: any },
    response: AxiosResponse | null,
    startTime: number,
    duration: number,
    isSuccess: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.webhookDelivery.create({
        data: {
          executionId,
          targetUrl: request.url,
          method: request.method,
          requestHeaders: request.headers || {},
          requestBody: request.data || {},
          responseStatus: response?.status,
          responseHeaders: response?.headers || {},
          responseBody: response ? JSON.stringify(response.data) : null,
          requestStartedAt: new Date(startTime),
          requestEndedAt: new Date(startTime + duration),
          durationMs: duration,
          isSuccess,
          errorMessage,
        },
      });
    } catch (dbError) {
      this.logger.error(`Failed to store webhook delivery: ${dbError instanceof Error ? dbError.message : 'Unknown'}`);
      // Don't throw - delivery record is not critical
    }
  }
}
