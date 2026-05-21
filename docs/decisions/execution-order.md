# Ordem de Execução — Workana AI

## Diretriz

O produto deve primeiro garantir acesso, workspace e contexto da empresa. Depois evolui para Brain, equipe, governança, créditos, agentes e execução operacional. Integrações e automações entram após o núcleo estar estável.

## Ordem Atual

1. Auth: login, signup, verificação de email e reset de senha
2. Criação ou seleção de workspace/company
3. Convites por email e entrada por link único
4. Onboarding curto da empresa
5. Brain inicial a partir do onboarding
6. Dashboard operacional
7. Equipe, roles e permissões
8. Assets e fontes do Brain
9. Créditos por empresa
10. Agentes default
11. Histórico de execuções
12. Integrações
13. Templates de briefing
14. Automações e analytics

## Estado de Implementação

- Auth: implementado como fundação
- Workspace/company: implementado com domínio próprio
- Convites: implementado com backend/frontend e testes de service/controller
- Roles/permissões: implementado com CASL, guards e PermissionGate
- Onboarding: implementado como draft/publicação inicial, precisa endurecer autorização
- Dashboard shell: implementado
- Assets: implementado como primeiro fluxo funcional de fontes/arquivos
- Integrações: shell frontend implementado, sem conectores reais
- Créditos, agentes e histórico: próximos domínios do MVP

## Próximos Domínios Prioritários

1. Corrigir autorização do onboarding e publicar Brain sem `userId` no body
2. Criar domínio persistido de Brain/CompanyBrain
3. Criar domínio de créditos por empresa (`CreditLedger`)
4. Criar agentes default e histórico de execuções (`Agent`, `AgentRun`)
5. Conectar assets e onboarding ao Brain persistido
