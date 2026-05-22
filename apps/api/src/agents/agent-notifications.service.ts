import { Injectable, Logger } from '@nestjs/common';

type RunNotification = {
  type: 'run_completed' | 'run_failed' | 'run_awaiting_validation' | 'run_queued';
  organizationId: string;
  agentId: string;
  runId: string;
  userId: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AgentNotificationsService {
  private readonly logger = new Logger(AgentNotificationsService.name);

  async notifyRunStatusChange(notification: RunNotification) {
    this.logger.log(
      `[${notification.type}] org=${notification.organizationId} run=${notification.runId.slice(0, 8)} agent=${notification.agentId.slice(0, 8)} user=${notification.userId.slice(0, 8)}`,
    );
  }

  buildTitle(type: RunNotification['type']): string {
    switch (type) {
      case 'run_completed':
        return 'Execução concluída';
      case 'run_failed':
        return 'Execução falhou';
      case 'run_awaiting_validation':
        return 'Validação necessária';
      case 'run_queued':
        return 'Execução na fila';
    }
  }

  buildBody(type: RunNotification['type'], runId: string): string {
    const shortId = runId.slice(0, 8);
    switch (type) {
      case 'run_completed':
        return `A execução ${shortId} foi concluída com sucesso.`;
      case 'run_failed':
        return `A execução ${shortId} falhou. Verifique os detalhes.`;
      case 'run_awaiting_validation':
        return `A execução ${shortId} aguarda sua validação.`;
      case 'run_queued':
        return `A execução ${shortId} foi adicionada à fila.`;
    }
  }
}
