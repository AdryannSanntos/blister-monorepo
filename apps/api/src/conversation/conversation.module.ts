import { Module } from '@nestjs/common';
import { ConversationEventStoreService } from './conversation-event-store.service';
import { ConversationProjectionService } from './conversation-projection.service';
import { ConversationSseService } from './conversation-sse.service';
import { ConversationService } from './conversation.service';

/**
 * Shared conversational domain, intentionally detached from `AgentRun`. Exposes
 * the event log + projections so any conversational surface (`agent chat` now,
 * `company chat` later) can persist and replay narrative without redesign.
 */
@Module({
  providers: [
    ConversationEventStoreService,
    ConversationProjectionService,
    ConversationSseService,
    ConversationService,
  ],
  exports: [
    ConversationEventStoreService,
    ConversationProjectionService,
    ConversationSseService,
    ConversationService,
  ],
})
export class ConversationModule {}
