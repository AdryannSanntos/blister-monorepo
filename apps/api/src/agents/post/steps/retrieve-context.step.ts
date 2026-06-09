import type { CustomStepExecutor } from '../../runtime/kernel/agent-execution.kernel';

/**
 * Preparation step for the post agent. Emits a searching_context block after
 * RAG retrieval so the chat shows brand-brain lookup progress.
 */
export const retrieveContextStep: CustomStepExecutor = async (context, deps) => {
  const chunks = context.contextPack.chunks;
  const results = chunks.slice(0, 5).map((chunk, index) => ({
    title:
      typeof chunk.metadata?.title === 'string'
        ? chunk.metadata.title
        : `Contexto ${index + 1}`,
    source: chunk.sourceType,
    date: '',
  }));

  await deps.message.searching(
    { resultsCount: chunks.length, results },
    'Consultando o Cérebro da Marca',
  );

  return {
    type: 'CONTINUE',
    output: {
      contextRetrieved: true,
      chunksCount: chunks.length,
    },
  };
};
