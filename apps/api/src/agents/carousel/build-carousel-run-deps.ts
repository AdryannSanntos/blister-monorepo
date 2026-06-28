import type { CarouselRunDeps } from './ports/carousel-run-deps';

/**
 * Builds carousel run dependencies.
 * For Plano 2 this is a minimal stub — no external service calls needed.
 * In Plano 3+, inject PrismaService and StorageService as needed.
 */
export const buildCarouselRunDeps = (): CarouselRunDeps => ({});
