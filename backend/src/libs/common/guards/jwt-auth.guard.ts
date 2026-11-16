import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err instanceof UnauthorizedException) {
      throw err;
    }

    if (err || !user) {
      throw new UnauthorizedException(
        info?.name === 'TokenExpiredError'
          ? 'Session expired. Please sign in again.'
          : 'Unauthorized',
      );
    }

    return user;
  }
}
