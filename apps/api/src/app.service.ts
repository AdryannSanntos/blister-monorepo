import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { service: string; status: string } {
    return {
      service: 'api',
      status: 'ok',
    };
  }
}
