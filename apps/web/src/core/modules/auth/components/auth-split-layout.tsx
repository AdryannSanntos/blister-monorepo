import type { ReactNode } from 'react';

interface AuthSplitLayoutProps {
  children: ReactNode;
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Painel visual — fundo ocupando toda a viewport */}
      <div className="absolute inset-0 hidden overflow-hidden lg:flex auth-visual-panel">
        {/* Gradient mesh abstrato */}
        <div className="absolute inset-0 auth-mesh-bg" />

        {/* Orbs de luz */}
        <div className="absolute top-1/4 left-1/4 size-[400px] rounded-full opacity-30 blur-3xl auth-orb-1" />
        <div className="absolute bottom-1/4 right-1/4 size-[300px] rounded-full opacity-25 blur-3xl auth-orb-2" />
        <div className="absolute top-3/4 left-1/2 size-[200px] rounded-full opacity-20 blur-2xl auth-orb-3" />

        {/* Glassmorphism footer */}
        <div className="absolute right-6 bottom-6 left-[calc(50%+1.5rem)] rounded-[var(--r-xl)] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <p className="text-center text-[11px] text-white/50 leading-relaxed">
            © {new Date().getFullYear()} Workana AI. Todos os direitos reservados.{' '}
            <a
              href="/privacy"
              className="underline-offset-2 hover:underline hover:text-white/70 transition-colors"
            >
              Política de Privacidade
            </a>
            {' · '}
            <a
              href="/terms"
              className="underline-offset-2 hover:underline hover:text-white/70 transition-colors"
            >
              Termos de Uso
            </a>
          </p>
        </div>
      </div>

      {/* Painel funcional */}
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 py-12 lg:w-1/2 lg:rounded-r-[var(--r-2xl)] lg:border-r lg:border-[var(--line-subtle)] lg:shadow-[var(--shadow-lg)]">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
