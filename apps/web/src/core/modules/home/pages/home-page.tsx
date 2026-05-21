import { ChevronRight } from "lucide-react";

export function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] px-6 py-16 text-[var(--fg-primary)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--fg-tertiary)]">
          Workana AI
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Workspace inteligente para operar com freelancers e times remotos.
        </h1>
        <p className="max-w-2xl text-base text-[var(--fg-secondary)]">
          Centralize brain da empresa, agentes de IA, créditos, equipe e integrações em uma experiência operacional premium.
        </p>
        <div>
          <a
            href="/design-system"
            className="inline-flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-glow)]"
          >
            Abrir design system
            <ChevronRight className="size-4" />
          </a>
        </div>
      </div>
    </main>
  );
}
