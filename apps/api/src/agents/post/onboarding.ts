/**
 * Onboarding for the "post" agent: a short, click-through brief collected one
 * question at a time. Each unanswered required question pauses the run with a
 * single-field `pauseFormSchema`; once every question is answered the brief is
 * normalized into concrete generation parameters (platform dimensions, slide
 * count, objective).
 */

export type ClarificationFieldKind = 'single' | 'multi' | 'text';

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
}

export interface ClarificationField {
  name: string;
  kind: ClarificationFieldKind;
  label: string;
  description?: string;
  options?: ClarificationOption[];
  placeholder?: string;
  required?: boolean;
}

export type SocialNetwork = 'instagram' | 'facebook' | 'linkedin' | 'tiktok';
export type PostFormat = 'single' | 'carousel';
export type PostObjective = 'sell' | 'engage' | 'promo' | 'awareness';

interface PlatformSpec {
  label: string;
  width: number;
  height: number;
}

/**
 * Feed dimensions per network (in px). Carousels reuse the same canvas so every
 * slide is consistent. Values follow each platform's recommended feed size.
 */
const PLATFORM_SPECS: Record<SocialNetwork, PlatformSpec> = {
  instagram: { label: 'Instagram', width: 1080, height: 1350 },
  facebook: { label: 'Facebook', width: 1080, height: 1080 },
  linkedin: { label: 'LinkedIn', width: 1080, height: 1080 },
  tiktok: { label: 'TikTok', width: 1080, height: 1920 },
};

const SOCIAL_NETWORK_VALUES: SocialNetwork[] = ['instagram', 'facebook', 'linkedin', 'tiktok'];
const POST_FORMAT_VALUES: PostFormat[] = ['single', 'carousel'];
const OBJECTIVE_VALUES: PostObjective[] = ['sell', 'engage', 'promo', 'awareness'];

const OBJECTIVE_LABELS: Record<PostObjective, string> = {
  sell: 'Vender ou divulgar um produto/serviço',
  engage: 'Engajar e educar a audiência',
  promo: 'Anunciar uma promoção ou oferta',
  awareness: 'Apresentar e fortalecer a marca',
};

const MIN_SLIDES = 2;
const MAX_SLIDES = 8;
const DEFAULT_CAROUSEL_SLIDES = 3;

const FIELD_SOCIAL_NETWORK: ClarificationField = {
  name: 'socialNetwork',
  kind: 'single',
  label: 'Para qual rede social é o post?',
  required: true,
  options: SOCIAL_NETWORK_VALUES.map((value) => ({
    id: value,
    label: PLATFORM_SPECS[value].label,
  })),
};

const FIELD_POST_FORMAT: ClarificationField = {
  name: 'postFormat',
  kind: 'single',
  label: 'Qual o formato do post?',
  required: true,
  options: [
    { id: 'single', label: 'Imagem única' },
    { id: 'carousel', label: 'Carrossel (vários slides)' },
  ],
};

const FIELD_SLIDES_COUNT: ClarificationField = {
  name: 'slidesCount',
  kind: 'single',
  label: 'Quantos slides terá o carrossel?',
  required: true,
  options: ['2', '3', '4', '5', '6', '7', '8'].map((value) => ({
    id: value,
    label: `${value} slides`,
  })),
};

const FIELD_OBJECTIVE: ClarificationField = {
  name: 'objective',
  kind: 'single',
  label: 'Qual o objetivo principal deste post?',
  required: true,
  options: OBJECTIVE_VALUES.map((value) => ({
    id: value,
    label: OBJECTIVE_LABELS[value],
  })),
};

function isAnswered(answers: Record<string, unknown>, name: string): boolean {
  const value = answers[name];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function readString(answers: Record<string, unknown>, name: string): string {
  const value = answers[name];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Returns the next question to ask given the answers collected so far, or null
 * when the brief is complete. `slidesCount` is only asked for carousels.
 */
export function getNextOnboardingField(
  answers: Record<string, unknown>,
): ClarificationField | null {
  if (!isAnswered(answers, 'socialNetwork')) return FIELD_SOCIAL_NETWORK;
  if (!isAnswered(answers, 'postFormat')) return FIELD_POST_FORMAT;

  const format = readString(answers, 'postFormat');
  if (format === 'carousel' && !isAnswered(answers, 'slidesCount')) {
    return FIELD_SLIDES_COUNT;
  }

  if (!isAnswered(answers, 'objective')) return FIELD_OBJECTIVE;

  return null;
}

export interface PostBrief {
  socialNetwork: SocialNetwork;
  platformLabel: string;
  format: PostFormat;
  slidesCount: number;
  objective: PostObjective;
  objectiveLabel: string;
  width: number;
  height: number;
}

function coerceSocialNetwork(value: string): SocialNetwork {
  return (SOCIAL_NETWORK_VALUES as string[]).includes(value)
    ? (value as SocialNetwork)
    : 'instagram';
}

function coerceFormat(value: string): PostFormat {
  return (POST_FORMAT_VALUES as string[]).includes(value) ? (value as PostFormat) : 'single';
}

function coerceObjective(value: string): PostObjective {
  return (OBJECTIVE_VALUES as string[]).includes(value) ? (value as PostObjective) : 'engage';
}

function coerceSlidesCount(value: string, format: PostFormat): number {
  if (format === 'single') return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_CAROUSEL_SLIDES;
  return Math.min(MAX_SLIDES, Math.max(MIN_SLIDES, parsed));
}

/**
 * Normalizes raw onboarding answers into a concrete generation brief. Falls
 * back to sensible defaults for any missing/invalid value so generation never
 * crashes on a partial brief.
 */
export function buildPostBrief(answers: Record<string, unknown>): PostBrief {
  const socialNetwork = coerceSocialNetwork(readString(answers, 'socialNetwork'));
  const format = coerceFormat(readString(answers, 'postFormat'));
  const objective = coerceObjective(readString(answers, 'objective'));
  const slidesCount = coerceSlidesCount(readString(answers, 'slidesCount'), format);
  const spec = PLATFORM_SPECS[socialNetwork];

  return {
    socialNetwork,
    platformLabel: spec.label,
    format,
    slidesCount,
    objective,
    objectiveLabel: OBJECTIVE_LABELS[objective],
    width: spec.width,
    height: spec.height,
  };
}
