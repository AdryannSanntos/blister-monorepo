import {
  ProviderExecutionError,
  ProviderNotConfiguredError,
} from './adapters/ai-provider.adapter';

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  gemini: 'Google Gemini',
  assemblyai: 'AssemblyAI',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

const getProviderLabel = (provider: string): string =>
  PROVIDER_LABELS[provider] ?? provider;

export const toUserFacingProviderError = (error: unknown): string => {
  if (error instanceof ProviderNotConfiguredError) {
    return `O provedor ${getProviderLabel(error.provider)} não está configurado. Adicione a chave de API no ambiente do servidor.`;
  }

  if (error instanceof ProviderExecutionError) {
    return formatProviderExecutionError(error);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Não foi possível concluir a geração. Tente novamente em instantes.';
};

export const formatProviderExecutionError = (
  error: ProviderExecutionError,
): string => {
  const provider = getProviderLabel(error.provider);

  if (error.statusCode === 402) {
    return `Créditos insuficientes no ${provider}. Recarregue a conta do provedor ou altere o modelo configurado para este agente.`;
  }

  if (error.statusCode === 401 || error.statusCode === 403 || error.category === 'auth') {
    return `Falha de autenticação no ${provider}. Verifique se a chave de API está correta e ativa.`;
  }

  if (error.statusCode === 429 || error.category === 'rate_limit') {
    return `Limite de uso do ${provider} atingido. Aguarde alguns minutos e tente novamente.`;
  }

  if (error.statusCode === 400 || error.category === 'validation') {
    const detail = extractProviderDetail(error.message);
    return detail
      ? `Requisição inválida para o ${provider}: ${detail}`
      : `Requisição inválida para o ${provider}. Revise o modelo configurado para este agente.`;
  }

  if (error.statusCode && error.statusCode >= 500) {
    return `O ${provider} está indisponível no momento (erro ${error.statusCode}). Tente novamente em instantes.`;
  }

  const detail = extractProviderDetail(error.message);
  if (detail) {
    return `Falha ao gerar conteúdo com ${provider}: ${detail}`;
  }

  return `Falha ao gerar conteúdo com ${provider}. Tente novamente em instantes.`;
};

const extractProviderDetail = (message: string): string | null => {
  const trimmed = message.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string };
      message?: string;
    };
    const nested = parsed.error?.message ?? parsed.message;
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
  } catch {
    // Plain text error body
  }

  if (trimmed.length > 240) {
    return `${trimmed.slice(0, 237)}...`;
  }

  return trimmed;
};
