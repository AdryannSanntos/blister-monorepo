import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { ResendEmailAdapter } from './resend-email.adapter';

// Mock the Resend SDK so no real HTTP calls are made
jest.mock('resend', () => {
  const mockSend = jest.fn();
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
    __mockSend: mockSend,
  };
});

// Helper to access the mock send function
const getResendMockSend = (): jest.Mock => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('resend') as { __mockSend: jest.Mock }).__mockSend;
};

describe('ResendEmailAdapter', () => {
  let adapter: ResendEmailAdapter;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSend = getResendMockSend();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendEmailAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'RESEND_API_KEY') return 'test-api-key';
              if (key === 'RESEND_FROM_EMAIL') return defaultValue ?? 'noreply@example.com';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<ResendEmailAdapter>(ResendEmailAdapter);
  });

  describe('send', () => {
    it('returns id on successful send', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-abc-123' }, error: null });

      const result = await adapter.send({
        to: 'recipient@example.com',
        subject: 'Hello World',
        html: '<p>Test email</p>',
      });

      expect(result).toEqual({ id: 'email-abc-123' });
    });

    it('throws Error when Resend returns an error', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      });

      await expect(
        adapter.send({
          to: 'recipient@example.com',
          subject: 'Hello',
          html: '<p>Test</p>',
        }),
      ).rejects.toThrow(Error);

      await expect(
        adapter.send({
          to: 'recipient@example.com',
          subject: 'Hello',
          html: '<p>Test</p>',
        }),
      ).rejects.toThrow('Email delivery failed: Invalid API key');
    });

    it('sends to a single address wrapped in an array', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      await adapter.send({
        to: 'single@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['single@example.com'],
        }),
      );
    });

    it('sends to multiple addresses as-is when already an array', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-2' }, error: null });

      await adapter.send({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Bulk',
        html: '<p>Hi</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['a@example.com', 'b@example.com'],
        }),
      );
    });

    it('uses the configured from address when options.from is not provided', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-3' }, error: null });

      await adapter.send({
        to: 'user@example.com',
        subject: 'Greetings',
        html: '<p>Hello</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@example.com',
        }),
      );
    });

    it('overrides from address when options.from is provided', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-4' }, error: null });

      await adapter.send({
        to: 'user@example.com',
        subject: 'Custom Sender',
        html: '<p>Hello</p>',
        from: 'custom@myapp.com',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@myapp.com',
        }),
      );
    });

    it('returns id as "unknown" when data is null but no error', async () => {
      mockSend.mockResolvedValue({ data: null, error: null });

      const result = await adapter.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result).toEqual({ id: 'unknown' });
    });

    it('includes subject and html in the send call', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-5' }, error: null });

      await adapter.send({
        to: 'user@example.com',
        subject: 'You have been invited',
        html: '<p>Click here to join</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'You have been invited',
          html: '<p>Click here to join</p>',
        }),
      );
    });
  });
});
