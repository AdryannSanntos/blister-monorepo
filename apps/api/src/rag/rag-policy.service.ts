import { Injectable } from '@nestjs/common';

const SECRET_KEY_PATTERN = /(token|secret|password|credential|api[-_]?key|authorization|cookie)/i;

@Injectable()
export class RagPolicyService {
  /**
   * Returns source types the given permission set may read.
   * Guards retrieval results before surfacing to the caller.
   */
  getAllowedSourceTypes(permissions: string[]): string[] {
    const allowed: string[] = [];

    if (permissions.includes('brain.read')) {
      allowed.push('brain_entry');
    }
    if (permissions.includes('asset.read')) {
      allowed.push('asset');
    }
    if (permissions.includes('agent.read')) {
      allowed.push('agent_context_file');
    }
    // manual documents are readable by any authenticated member
    allowed.push('manual');

    return allowed;
  }

  sanitizeMetadata<T>(metadata: T): T {
    return this.sanitize(metadata) as T;
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.sanitize(v));
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => {
        if (SECRET_KEY_PATTERN.test(k)) return [];
        return [[k, this.sanitize(v)]];
      }),
    );
  }
}
