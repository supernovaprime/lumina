import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    // Admin can access everything
    if (user.role === 'ADMIN') {
      return true;
    }

    // Check ownership based on resource type
    const resourceOwnerId = params.ownerId || params.userId;
    if (resourceOwnerId && resourceOwnerId !== user.id) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }
}
