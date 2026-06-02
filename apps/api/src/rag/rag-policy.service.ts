import { Injectable } from '@nestjs/common';
import { RagSourceRegistry } from './rag-source-registry.service';

const SECRET_KEY_PATTERN = /(token|secret|password|credential|api[-_]?key|authorization|cookie)/i;

@Injectable()
export class RagPolicyService {
  constructor(private readonly sourceRegistry: RagSourceRegistry) {}

  /**
   * Returns source types the given permission set may read. Delegates to the source
   * registry so the permission gate has a single definition shared with retrieval.
   */
  getAllowedSourceTypes(permissions: string[]): string[] {
    return this.sourceRegistry.allowedSourceTypes(permissions);
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
