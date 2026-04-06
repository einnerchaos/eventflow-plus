import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // API key validation is handled by ApiKeyGuard
    // This middleware is just for additional processing if needed
    next();
  }
}
