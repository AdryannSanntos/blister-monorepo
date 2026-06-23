import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@company-os/db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  isConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL);
  }

  getClient(): PrismaClient {
    return this;
  }

  async onModuleInit(): Promise<void> {
    if (this.isConfigured()) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConfigured()) {
      await this.$disconnect();
    }
  }
}
