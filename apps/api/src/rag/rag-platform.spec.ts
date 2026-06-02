import type { RagRetrievedChunk } from '@company-os/types';
import { rankRetrievedChunks } from './rag-retrieval.service';
import { RagSourceRegistry } from './rag-source-registry.service';
import { normalizeWebQuery, webQueryKey } from './web-research-cache.service';

describe('RagSourceRegistry', () => {
  const registry = new RagSourceRegistry();

  it('gates each source behind its required permission and always allows public sources', () => {
    const allowed = registry.allowedSourceTypes(['brain.read']);
    expect(allowed).toContain('brain_entry');
    expect(allowed).toContain('web_research'); // null permission → public
    expect(allowed).toContain('manual');
    expect(allowed).not.toContain('asset'); // asset.read not held
    expect(allowed).not.toContain('context_source'); // context.read not held
  });

  it('unlocks context-scoped sources with context.read', () => {
    const allowed = registry.allowedSourceTypes(['context.read']);
    expect(allowed).toEqual(
      expect.arrayContaining(['context_source', 'agent_context_file', 'agent_context_reference']),
    );
    expect(allowed).not.toContain('brain_entry');
  });

  it('registers all six mandatory sources plus manual', () => {
    const types = registry.list().map((d) => d.sourceType);
    expect(types).toEqual(
      expect.arrayContaining([
        'brain_entry',
        'context_source',
        'agent_context_file',
        'agent_context_reference',
        'asset',
        'design_system',
        'design_asset',
        'web_research',
        'manual',
      ]),
    );
  });

  it('gates design sources behind design-system.read', () => {
    const allowed = registry.allowedSourceTypes(['design-system.read']);
    expect(allowed).toEqual(
      expect.arrayContaining(['design_system', 'design_asset', 'web_research', 'manual']),
    );
    expect(allowed).not.toContain('context_source');
  });

  it('exposes default weights for every registered source', () => {
    const weights = registry.defaultWeights();
    for (const descriptor of registry.list()) {
      expect(weights[descriptor.sourceType]).toBe(descriptor.defaultWeight);
    }
  });
});

describe('rankRetrievedChunks', () => {
  const chunk = (id: string, sourceType: string, score: number): RagRetrievedChunk => ({
    id,
    documentId: `doc-${id}`,
    sourceType: sourceType as RagRetrievedChunk['sourceType'],
    sourceId: null,
    title: null,
    snippet: '',
    score,
    metadata: {},
  });

  it('lets source weighting promote a slightly-lower-similarity but higher-trust source', () => {
    const ranked = rankRetrievedChunks(
      [chunk('web', 'web_research', 0.81), chunk('brain', 'brain_entry', 0.75)],
      { weights: { web_research: 0.8, brain_entry: 1.2 }, limit: 2 },
    );
    // brain weighted 0.9 > web weighted 0.648 → brain first despite lower raw score
    expect(ranked.map((c) => c.id)).toEqual(['brain', 'web']);
  });

  it('drops chunks below minScore using the RAW similarity, not the weighted one', () => {
    const ranked = rankRetrievedChunks(
      [chunk('a', 'brain_entry', 0.4), chunk('b', 'brain_entry', 0.6)],
      { minScore: 0.5, limit: 5 },
    );
    expect(ranked.map((c) => c.id)).toEqual(['b']);
  });

  it('returns at most `limit` chunks', () => {
    const ranked = rankRetrievedChunks(
      [chunk('a', 'manual', 0.9), chunk('b', 'manual', 0.8), chunk('c', 'manual', 0.7)],
      { limit: 2 },
    );
    expect(ranked).toHaveLength(2);
  });

  it('treats an unknown source weight as neutral (1.0)', () => {
    const ranked = rankRetrievedChunks([chunk('x', 'manual', 0.5)], { weights: {}, limit: 1 });
    expect(ranked[0].id).toBe('x');
  });
});

describe('web research cache keys', () => {
  it('normalizes case and whitespace so equal queries share a key', () => {
    expect(normalizeWebQuery('  Preço   do  Dólar ')).toBe('preço do dólar');
    expect(webQueryKey('Preço do Dólar')).toBe(webQueryKey('  preço   do dólar  '));
  });

  it('produces different keys for different queries', () => {
    expect(webQueryKey('dólar hoje')).not.toBe(webQueryKey('euro hoje'));
  });

  it('prefixes keys with web: for easy identification', () => {
    expect(webQueryKey('qualquer coisa')).toMatch(/^web:[a-f0-9]+$/);
  });
});
