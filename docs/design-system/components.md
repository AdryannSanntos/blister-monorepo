# Componentes — Workana AI

## Base Oficial

Todos os componentes base vivem em `apps/web/src/core/shared/components/ui` e devem ser importados via `@/core/shared/components/ui/...` ou caminho equivalente usado no módulo.

## Catálogo Base

### Tipografia

- `Display`
- `Heading`
- `Paragraph`
- `Kbd`

### Layout

- `AppSidebar`
- `Card`
- `Tabs`
- `Separator`
- `ScrollArea`
- `Breadcrumb`

### Formulários

- `Button`
- `Input`
- `PasswordInput`
- `Textarea`
- `Select`
- `Combobox`
- `Checkbox`
- `RadioGroup`
- `Switch`
- `Slider`
- `TagInput`
- `Form` com RHF + Zod

### Dados

- `Table`
- `DataTable`
- `Badge`
- `Avatar`
- `Progress`
- `ChartContainer`
- `Skeleton`

### Feedback e Overlays

- `Alert`
- `Dialog`
- `Drawer`
- `Sheet`
- `Popover`
- `Tooltip`
- `DropdownMenu`
- `HoverCard`
- `Sonner`
- `AlertDialog`

## Componentes de Produto

Devem nascer em `core/modules/<dominio>/components` quando forem específicos:

- `AgentCard`
- `AgentRunRow`
- `BrainSummaryCard`
- `BrainSourceList`
- `CreditsMeter`
- `CreditsUsageTable`
- `MemberInviteDialog`
- `PermissionMatrix`
- `IntegrationConnectCard`
- `AssetDetailSheet`

## Variantes Relevantes

- Button: `default`, `flat`, `secondary`, `outline`, `ghost`, `destructive`, `link`
- Badge: `default`, `secondary`, `outline`, `success`, `warning`, `info`, `destructive`
- Card: default shadcn com composição por slots; variantes visuais devem usar tokens no caller
- Table: padrão para dados operacionais; `DataTable` quando houver sort/paginação

## Regras

- Reutilizar primitives antes de criar markup paralelo.
- `Card` raiz não recebe padding.
- `CardTitle` usa `font-medium`, nunca `font-semibold` amplo.
- `AvatarFallback` usa iniciais e superfície sutil.
- `Dialog` precisa de título e descrição.
- Status é `Badge`, não texto solto colorido.
- Ações sensíveis sempre ficam dentro de `PermissionGate`.
