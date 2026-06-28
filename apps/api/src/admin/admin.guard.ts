import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req as any).currentUser?.id;

    if (!userId) throw new ForbiddenException('Not authenticated');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
