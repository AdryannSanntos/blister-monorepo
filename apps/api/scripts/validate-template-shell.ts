/**
 * CLI wrapper for template shell validation.
 * Run: npx tsx apps/api/scripts/validate-template-shell.ts
 */
import { CarouselTemplateService } from '../src/agents/carousel/services/carousel-template.service';
import { validateAllTemplateShells } from '../src/agents/carousel/utils/validate-template-shell';

const issues = validateAllTemplateShells(new CarouselTemplateService());

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(
      `[${issue.templateId}] ${issue.slideType}/${issue.variationId} — ${issue.code}: ${issue.message}`,
    );
  }
  console.error(`\n${issues.length} shell issue(s) found.`);
  process.exit(1);
}

console.log('All template shells passed validation.');
