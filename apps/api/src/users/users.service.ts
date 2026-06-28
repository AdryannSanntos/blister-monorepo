import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, userType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, userType: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserRoles(userId: string) {
    return this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: { include: { permissions: true } } },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        onboardingCompletedAt: true,
        userType: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isFirstTime = user.onboardingCompletedAt === null;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.cpf !== undefined ? { cpf: dto.cpf || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(isFirstTime ? { onboardingCompletedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        onboardingCompletedAt: true,
        userType: true,
      },
    });

    return updated;
  }
}
