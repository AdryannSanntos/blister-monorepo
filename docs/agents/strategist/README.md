# Agente: Estrategista

**ID:** `strategist`  
**Pasta:** `apps/api/src/agents/strategist/`

## Responsabilidade

Quebrar pedido do usuário em peças de conteúdo (ex.: campanha Dia das Mães → 3 posts: antecipação, oferta, urgência).

## Workflow sugerido

1. `analyze_intent`
2. `retrieve_context`
3. `check_context`
4. `clarification_form` (se necessário)
5. `plan_pieces` (LLM)
6. `validate_output`
7. `format_output`

## Output schema

Lista de peças planejadas: `{ title, angle, suggestedFormat }[]`

## Learning

- Aprende quantidade de peças preferida
- Aprende ângulos rejeitados/aprovados
