import {
  type WebResearchCache,
  type WebResearchGateway,
  type WebResearchResult,
  runWebResearchTool,
} from './web-research.tool';

const result = (url: string): WebResearchResult => ({
  title: `Title ${url}`,
  url,
  snippet: 'snippet',
  source: 'example.com',
  retrievedAt: '2026-05-30T00:00:00.000Z',
});

describe('runWebResearchTool', () => {
  it('serves from cache without calling the external gateway on a cache hit', async () => {
    const gateway: WebResearchGateway = { searchAndFetch: jest.fn() };
    const cache: WebResearchCache = {
      getCached: jest.fn().mockResolvedValue([result('https://a.com')]),
      store: jest.fn(),
    };

    const out = await runWebResearchTool({
      gateway,
      cache,
      organizationId: 'org1',
      query: 'q',
      limit: 5,
    });

    expect(gateway.searchAndFetch).not.toHaveBeenCalled();
    expect(cache.store).not.toHaveBeenCalled();
    expect(out.results).toHaveLength(1);
    expect(out.summary).toContain('Reaproveitadas');
  });

  it('queries the gateway and stores fresh results on a cache miss', async () => {
    const gateway: WebResearchGateway = {
      searchAndFetch: jest
        .fn()
        .mockResolvedValue([result('https://a.com'), result('https://b.com')]),
    };
    const cache: WebResearchCache = {
      getCached: jest.fn().mockResolvedValue([]),
      store: jest.fn().mockResolvedValue(undefined),
    };

    const out = await runWebResearchTool({
      gateway,
      cache,
      organizationId: 'org1',
      query: 'q',
      limit: 5,
    });

    expect(gateway.searchAndFetch).toHaveBeenCalledWith({
      query: 'q',
      limit: 5,
      organizationId: 'org1',
    });
    expect(cache.store).toHaveBeenCalledWith(
      'org1',
      'q',
      expect.arrayContaining([expect.objectContaining({ url: 'https://a.com' })]),
    );
    expect(out.results).toHaveLength(2);
    expect(out.summary).toContain('Pesquisadas');
  });

  it('does not store when the gateway returns nothing', async () => {
    const gateway: WebResearchGateway = { searchAndFetch: jest.fn().mockResolvedValue([]) };
    const cache: WebResearchCache = {
      getCached: jest.fn().mockResolvedValue([]),
      store: jest.fn(),
    };

    const out = await runWebResearchTool({
      gateway,
      cache,
      organizationId: 'org1',
      query: 'q',
      limit: 5,
    });

    expect(cache.store).not.toHaveBeenCalled();
    expect(out.results).toHaveLength(0);
    expect(out.citations).toHaveLength(0);
  });

  it('respects the limit and flags truncation', async () => {
    const gateway: WebResearchGateway = {
      searchAndFetch: jest
        .fn()
        .mockResolvedValue([
          result('https://a.com'),
          result('https://b.com'),
          result('https://c.com'),
        ]),
    };
    const out = await runWebResearchTool({ gateway, organizationId: 'org1', query: 'q', limit: 2 });

    expect(out.results).toHaveLength(2);
    expect(out.metadata.truncated).toBe(true);
    expect(out.metadata.resultCount).toBe(2);
  });

  it('works without a cache (gateway-only)', async () => {
    const gateway: WebResearchGateway = {
      searchAndFetch: jest.fn().mockResolvedValue([result('https://a.com')]),
    };
    const out = await runWebResearchTool({ gateway, organizationId: 'org1', query: 'q', limit: 5 });
    expect(out.results).toHaveLength(1);
  });
});
