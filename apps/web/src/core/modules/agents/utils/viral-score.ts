/** Badge variants used to give the viral score a visual tier. */
export type ViralScoreBadgeVariant = "accent" | "secondary" | "outline";

/**
 * Maps a 0–100 viral score to a Badge variant so the strongest cuts stand out
 * with the brand accent, mid cuts stay neutral, and weak cuts read as quiet.
 */
export function viralScoreBadgeVariant(score: number): ViralScoreBadgeVariant {
  if (score >= 80) return "accent";
  if (score >= 50) return "secondary";
  return "outline";
}
