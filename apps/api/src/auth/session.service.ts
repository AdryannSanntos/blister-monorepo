import type { IncomingHttpHeaders } from 'node:http';
import { Injectable } from '@nestjs/common';
import { getAuthInstance } from './register-better-auth';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class SessionService {
  async getSession(rawHeaders: IncomingHttpHeaders): Promise<CurrentUser | null> {
    const auth = getAuthInstance();
    if (!auth) return null;

    // Convert Node.js IncomingHttpHeaders to fetch Headers so better-auth
    // can validate the session using its own logic (handles signing, prefixes, etc.)
    const headers = new Headers();
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = (await auth.api.getSession({ headers })) as {
      user?: { id: string; name: string; email: string };
    } | null;

    if (!result?.user) return null;

    return {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    };
  }
}
