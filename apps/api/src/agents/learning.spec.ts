import { LearningSerializerRegistry } from '@company-os/agent-sdk';
// Importing the agents registers their learning serializers via .withLearning().
import { copywriterAgent } from './copywriter/agent';
import { postAgent } from './post/agent';

describe('learning serializers wired through the SDK registry', () => {
  it('registers post and copywriter serializers on build', () => {
    expect(postAgent.learning).toBeDefined();
    expect(copywriterAgent.learning).toBeDefined();
    expect(LearningSerializerRegistry.has('post')).toBe(true);
    expect(LearningSerializerRegistry.has('copywriter')).toBe(true);
  });

  it('serializes a post review into an agent-specific learning note', () => {
    const note = LearningSerializerRegistry.serialize('post', {
      agentRunId: 'run_1',
      companyId: 'company_1',
      approved: true,
      output: {
        platform: 'Instagram',
        format: 'single',
        slidesCount: 1,
        caption: 'Bolo de cenoura artesanal!',
        hashtags: ['#bolo', '#cenoura'],
      },
      userFeedback: 'Ficou ótimo',
    });

    expect(note).toContain('Aprendizado do Post');
    expect(note).toContain('Bolo de cenoura artesanal!');
    expect(note).toContain('Instagram');
  });

  it('serializes a copywriter review into an agent-specific learning note', () => {
    const note = LearningSerializerRegistry.serialize('copywriter', {
      agentRunId: 'run_2',
      companyId: 'company_1',
      approved: true,
      output: {
        caption: 'Texto irresistível',
        hashtags: ['#novidade'],
        tone: 'enthusiastic',
      },
    });

    expect(note).toContain('Aprendizado do Copywriter');
    expect(note).toContain('Texto irresistível');
  });
});
