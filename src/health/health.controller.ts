import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

/**
 * Unversioned route so load balancers and e2e see /health without /api/v1 prefix.
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}
