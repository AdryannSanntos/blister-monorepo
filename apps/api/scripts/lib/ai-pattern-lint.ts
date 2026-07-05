/**
 * Static CSS lint for common AI-generated UI patterns in carousel templates.
 */

export type AiPatternSeverity = 'blocking' | 'warning';

export type AiPatternHit = {
  code: string;
  severity: AiPatternSeverity;
  message: string;
  match?: string;
};

const BLOCKING_RULES: Array<{
  code: string;
  test: (css: string) => string | null;
  message: string;
}> = [
  {
    code: 'ai_font_inter',
    test: (css) => (/font-family:\s*[^;]*\bInter\b/i.test(css) ? 'Inter' : null),
    message: 'Inter font-family detected — use editorial display/body pairing instead.',
  },
  {
    code: 'ai_glassmorphism',
    test: (css) => (/backdrop-filter:\s*blur/i.test(css) ? 'backdrop-filter: blur' : null),
    message: 'Glassmorphism (backdrop-filter blur) detected.',
  },
  {
    code: 'ai_purple_blue_button',
    test: (css) => {
      const hit = css.match(/linear-gradient\([^)]*#(?:4f46e5|6366f1|7c3aed|0ea5e9)/i);
      return hit ? hit[0] : null;
    },
    message: 'Purple→blue SaaS button gradient detected.',
  },
  {
    code: 'ai_three_col_grid',
    test: (css) => {
      const hit = css.match(/grid-template-columns:\s*repeat\(3[^)]*\)/i);
      return hit ? hit[0] : null;
    },
    message: 'Three-column equal card grid detected.',
  },
  {
    code: 'ai_indigo_accent',
    test: (css) => {
      const hit = css.match(/#(?:6366f1|7c3aed|4f46e5)\b/i);
      return hit ? hit[0] : null;
    },
    message: 'Generic indigo/violet AI accent color detected.',
  },
];

const WARNING_RULES: Array<{
  code: string;
  test: (css: string) => string | null;
  message: string;
}> = [
  {
    code: 'ai_pill_radius',
    test: (css) => {
      const hit = css.match(/border-radius:\s*999px/i);
      return hit ? hit[0] : null;
    },
    message: 'Full pill border-radius (999px) — prefer editorial corners (4–12px).',
  },
  {
    code: 'ai_mesh_radial',
    test: (css) => {
      const count = (css.match(/radial-gradient/gi) ?? []).length;
      return count >= 2 ? `${count} radial-gradient` : null;
    },
    message: 'Multiple radial gradients (mesh-style background).',
  },
  {
    code: 'ai_global_center',
    test: (css) =>
      /\.slide\s*\{[^}]*text-align:\s*center/i.test(css) ? 'text-align:center on .slide' : null,
    message: 'Global centered text on slide container.',
  },
];

export const lintCssForAiPatterns = (css: string): AiPatternHit[] => {
  const hits: AiPatternHit[] = [];

  for (const rule of BLOCKING_RULES) {
    const match = rule.test(css);
    if (match) {
      hits.push({
        code: rule.code,
        severity: 'blocking',
        message: rule.message,
        match,
      });
    }
  }

  for (const rule of WARNING_RULES) {
    const match = rule.test(css);
    if (match) {
      hits.push({
        code: rule.code,
        severity: 'warning',
        message: rule.message,
        match,
      });
    }
  }

  return hits;
};

export const hasBlockingAiPatterns = (hits: AiPatternHit[]): boolean =>
  hits.some((h) => h.severity === 'blocking');
