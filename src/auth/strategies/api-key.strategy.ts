import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
  constructor(private readonly authService: AuthService) {
    super(
      { header: 'X-API-Key', prefix: '' },
      false,
      async (apiKey: string, done: (error: Error | null, result?: { sourceId: string } | false) => void) => {
        const result = await this.validateApiKey(apiKey);
        if (result) {
          done(null, result);
        } else {
          done(null, false);
        }
      },
    );
  }

  async validateApiKey(apiKey: string): Promise<{ sourceId: string } | null> {
    return this.authService.validateApiKey(apiKey);
  }
}
