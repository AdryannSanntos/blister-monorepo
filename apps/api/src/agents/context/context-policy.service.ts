import { Injectable } from '@nestjs/common';

const SECRET_KEY_PATTERN = /(token|secret|password|credential|api[-_]?key|authorization|cookie)/i;

type PermissionKey = string;

@Injectable()
export class ContextPolicyService {
  sanitizeContext<T>(value: T): T {
    return this.sanitizeValue(value) as T;
  }

  filterStructuredContextByPermissions(
    context: Record<string, unknown>,
    permissions: PermissionKey[],
  ) {
    const allowed = new Set(permissions);

    return this.sanitizeContext({
      brain: allowed.has('brain.read') ? (context.brain ?? null) : null,
      contextSources: allowed.has('context.read') ? (context.contextSources ?? []) : [],
      contextArtifact: allowed.has('context.read') ? (context.contextArtifact ?? null) : null,
      assets: allowed.has('asset.read') ? (context.assets ?? []) : [],
      designSystem: allowed.has('design-system.read') ? (context.designSystem ?? null) : null,
      agents: allowed.has('agent.read') ? (context.agents ?? []) : [],
      runs: allowed.has('agent.run.read') ? (context.runs ?? []) : [],
      members: allowed.has('member.read') ? (context.members ?? []) : [],
      credits: allowed.has('credit.read') ? (context.credits ?? null) : null,
      integrations: allowed.has('integration.read') ? (context.integrations ?? []) : [],
    });
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const entries = Object.entries(value as Record<string, unknown>).flatMap(
      ([key, nestedValue]) => {
        if (SECRET_KEY_PATTERN.test(key)) {
          return [];
        }

        return [[key, this.sanitizeValue(nestedValue)] as const];
      },
    );

    return Object.fromEntries(entries);
  }
}
