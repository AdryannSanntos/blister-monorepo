import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async validateToken(token: string): Promise<CurrentUser | null> {
    if (!token) return null;

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!session) return null;
    if (session.expiresAt <= new Date()) return null;

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  }
}
