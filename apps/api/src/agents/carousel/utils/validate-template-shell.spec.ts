import { CarouselTemplateService } from '../services/carousel-template.service';
import { validateAllTemplateShells } from './validate-template-shell';

describe('carousel template shell consistency', () => {
  it('validates structural shell for daylight, reel, spotlight, voltage', () => {
    const service = new CarouselTemplateService();
    const issues = validateAllTemplateShells(service);

    if (issues.length > 0) {
      const summary = issues
        .map(
          (issue) =>
            `[${issue.templateId}] ${issue.slideType}/${issue.variationId} — ${issue.code}: ${issue.message}`,
        )
        .join('\n');
      throw new Error(`Template shell issues:\n${summary}`);
    }

    expect(issues).toHaveLength(0);
  });
});
