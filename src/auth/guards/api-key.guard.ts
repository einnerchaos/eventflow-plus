import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
  constructor() {
    super();
  }

  handleRequest(err: any, result: any, info: any, context: ExecutionContext) {
    if (err) {
      throw err;
    }

    if (!result) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach source info to request
    const request = context.switchToHttp().getRequest();
    request.sourceId = result.sourceId;

    return result;
  }
}
