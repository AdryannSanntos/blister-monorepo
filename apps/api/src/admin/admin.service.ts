import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateCompanyDto } from './dto/create-company.dto';
import { createCompanyForUser } from '../company/company-bootstrap.util';
import { getAuthInstance } from '../auth/register-better-auth';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCompanyWithOwner(dto: CreateCompanyDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: dto.ownerEmail, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(`Já existe um usuário com o email ${dto.ownerEmail}`);
    }

    const userId = randomUUID();
    const accountId = randomUUID();

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: dto.ownerEmail,
          name: dto.ownerName ?? dto.ownerEmail,
          emailVerified: true,
          userType: 'BUSINESS',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Credential account without password — user only gets access after setting via reset-password
      await tx.account.create({
        data: {
          id: accountId,
          userId: newUser.id,
          accountId: newUser.id,
          providerId: 'credential',
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return newUser;
    });

    const company = await createCompanyForUser(this.prisma.getClient(), user, dto.name);

    await this.sendFirstAccessEmail(dto.ownerEmail);

    return { company, owner: { id: user.id, email: user.email, name: user.name } };
  }

  private async sendFirstAccessEmail(email: string) {
    const auth = getAuthInstance();
    if (!auth) {
      this.logger.warn('Auth instance not available, skipping first-access email');
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:3000';

    try {
      await (auth as any).api.forgetPassword({
        body: {
          email,
          redirectTo: `${frontendUrl}/auth/reset-password`,
        },
        headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
      });
    } catch (err) {
      this.logger.error(`Failed to send first-access email to ${email}`, err);
      throw new BadRequestException('Empresa criada mas falha ao enviar email. Tente reenviar o convite.');
    }
  }
}
