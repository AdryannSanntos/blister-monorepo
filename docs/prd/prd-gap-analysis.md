# Gap Analysis — Workana AI

## Já Implementado

- Auth com better-auth
- Domínio próprio de Organization/Membership/Role/Permission
- Convites
- Onboarding draft e publicação inicial
- Dashboard shell
- Assets com backend, frontend, permissões e testes
- Shell frontend de integrações
- Design system base com tokens e shadcn/ui

## Parcial

- Onboarding publica um Brain inicial conceitual, mas ainda não existe entidade persistida/versionada de Brain.
- Emails transacionais têm adapter Resend, mas alguns fluxos de auth ainda usam logging de URL no bootstrap.
- Integrações têm experiência visual, sem conectores reais.

## Pendente

- CompanyBrain/BrainVersion
- CreditLedger e consumo de créditos
- Agent e AgentRun
- Histórico operacional real
- AuditLog
- Integrações reais
- Automações e analytics

## Riscos Atuais

- Endpoints de onboarding precisam endurecer autorização.
- `userId` não pode ser aceito no body em publish.
- Docs históricas podem conter naming antigo; a fonte atual é `workana-ai-master.md`.
