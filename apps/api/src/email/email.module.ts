import { Global, Module } from '@nestjs/common';
import { EMAIL_PORT } from './email.port';
import { ResendEmailAdapter } from './resend-email.adapter';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_PORT,
      useClass: ResendEmailAdapter,
    },
  ],
  exports: [EMAIL_PORT],
})
export class EmailModule {}
