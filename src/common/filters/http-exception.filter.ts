import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics/metrics.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly metrics: MetricsService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: this.getErrorMessage(exception),
      requestId: request.headers['x-request-id'],
    };

    // Log error
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${errorResponse.message}`,
    );

    // Record metrics
    this.metrics.httpRequests.inc({
      method: request.method,
      route: request.route?.path || request.url,
      status_code: status.toString(),
    });

    response.status(status).json(errorResponse);
  }

  private getErrorMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && 'message' in response) {
      return Array.isArray(response.message) 
        ? response.message.join(', ') 
        : String(response.message);
    }
    return 'An error occurred';
  }
}
