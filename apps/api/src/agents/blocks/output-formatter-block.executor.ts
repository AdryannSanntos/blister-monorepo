import type { BlockExecutorFn } from '../agent-block-executor.registry';
import type { UiOutputBlockDto, UiOutputEnvelopeDto } from '../dto/ui-output.dto';

type RawBlockSpec = string | { type: string; source?: string; [key: string]: unknown };

const resolveSourceValue = (
  inputs: Record<string, unknown>,
  source: string | undefined,
): unknown => {
  if (source && inputs[source] !== undefined) return inputs[source];
  return inputs.default ?? inputs;
};

const buildBlock = (
  spec: RawBlockSpec,
  inputs: Record<string, unknown>,
): UiOutputBlockDto | null => {
  const type = typeof spec === 'string' ? spec : spec.type;
  const source = typeof spec === 'object' ? spec.source : undefined;
  const value = resolveSourceValue(inputs, source);

  const toText = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  switch (type) {
    case 'text':
      return { type: 'text', value: toText(value) };
    case 'markdown':
      return { type: 'markdown', value: toText(value) };
    case 'list': {
      const items = Array.isArray(value)
        ? value.map(toText)
        : toText(value)
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
      return { type: 'list', items };
    }
    case 'card': {
      const obj = typeof value === 'object' && value ? (value as Record<string, unknown>) : {};
      const title =
        typeof obj.title === 'string' ? obj.title : toText(value).slice(0, 80) || 'Resultado';
      const body = typeof obj.body === 'string' ? obj.body : undefined;
      return { type: 'card', title, body };
    }
    case 'image': {
      const obj = typeof value === 'object' && value ? (value as Record<string, unknown>) : {};
      const url = typeof obj.url === 'string' ? obj.url : typeof value === 'string' ? value : '';
      if (!url) return null;
      return { type: 'image', url, alt: typeof obj.alt === 'string' ? obj.alt : undefined };
    }
    case 'cta': {
      const obj = typeof value === 'object' && value ? (value as Record<string, unknown>) : {};
      const label = typeof obj.label === 'string' ? obj.label : 'Continuar';
      const action =
        typeof obj.action === 'object' && obj.action ? (obj.action as Record<string, unknown>) : {};
      return { type: 'cta', label, action };
    }
    default:
      return { type: 'markdown', value: toText(value) };
  }
};

export const outputFormatterBlockExecutor: BlockExecutorFn = async (ctx) => {
  const rawSpecs = Array.isArray(ctx.blockConfig.outputBlocks)
    ? (ctx.blockConfig.outputBlocks as RawBlockSpec[])
    : ['markdown'];

  const blocks = rawSpecs
    .map((spec) => buildBlock(spec, ctx.inputs))
    .filter((b): b is UiOutputBlockDto => b !== null);

  const envelope: UiOutputEnvelopeDto = {
    blocks,
    metadata:
      typeof ctx.blockConfig.metadata === 'object' && ctx.blockConfig.metadata
        ? (ctx.blockConfig.metadata as Record<string, unknown>)
        : undefined,
  };

  return { outputs: { ui_output: envelope } };
};
