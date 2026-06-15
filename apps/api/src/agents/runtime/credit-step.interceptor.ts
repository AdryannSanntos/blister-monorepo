import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CreditService } from '../../credits/credits.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreditStepInterceptor {
  constructor(
    private readonly creditService: CreditService,
    private readonly prisma: PrismaService,
  ) {}

  async checkBalance(companyId: string, estimatedCost: number): Promise<void> {
    const settings = await this.prisma.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });

    const minCost = settings?.minRunCost ? Number(settings.minRunCost) : 0.01;
    const requiredBalance = Math.max(estimatedCost, minCost);

    try {
      await this.creditService.checkBalance(companyId, requiredBalance);
    } catch {
      throw new UnprocessableEntityException(
        'Saldo de créditos insuficiente para executar este agente',
      );
    }
  }

  async checkPersonalBalance(personalSpaceId: string, estimatedCost: number): Promise<void> {
    const settings = await this.prisma.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });

    const minCost = settings?.minRunCost ? Number(settings.minRunCost) : 0.01;
    const requiredBalance = Math.max(estimatedCost, minCost);

    const balance = await this.creditService.getPersonalBalance(personalSpaceId);
    if (Number(balance.amount) < requiredBalance) {
      throw new UnprocessableEntityException(
        'Saldo de créditos insuficiente para executar este agente',
      );
    }
  }

  async debitStep(
    companyId: string,
    agentRunId: string,
    agentRunStepId: string,
    cost: number,
    model?: string,
  ): Promise<void> {
    if (cost <= 0) return;

    const settings = await this.prisma.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });

    const markup = settings?.markupDefault ? Number(settings.markupDefault) : 1.2;
    const finalCost = cost * markup;

    await this.creditService.debit(
      companyId,
      finalCost,
      model ? `LLM: ${model}` : 'Agent step execution',
      agentRunStepId,
      agentRunId,
    );
  }

  async getMarkup(): Promise<number> {
    const settings = await this.prisma.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });

    return settings?.markupDefault ? Number(settings.markupDefault) : 1.2;
  }

  async getMinRunCost(): Promise<number> {
    const settings = await this.prisma.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });

    return settings?.minRunCost ? Number(settings.minRunCost) : 0.01;
  }
}
