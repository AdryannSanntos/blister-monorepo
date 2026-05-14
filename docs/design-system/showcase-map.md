# Showcase Map

Mapeamento da rota `/design-system` para componentes e tokens.

- Página: `apps/web/src/core/modules/design-system/pages/design-system-page.tsx`
- Rota: `apps/web/src/app/design-system/page.tsx`

Toda demonstração na página deve usar componentes de `core/shared/components/ui` — sem markup paralelo solto.

## Seções

| # | id | Título | Componentes principais |
| --- | --- | --- | --- |
| 01 | `brand` | Brand | `Card`, `DsSection` |
| 02 | `color` | Color | `DsStage`, `Separator` |
| 03 | `type` | Typography | `Card`, fontes `--font-sans/serif/mono` |
| 04 | `space` | Spacing | `DsStage` |
| 05 | `radius` | Radius | `DsStage` |
| 06 | `elevation` | Elevation | `DsStage` |
| 07 | `borders` | Borders | `DsStage` |
| 08 | `icons` | Icons | lucide-react |
| 09 | `motion` | Motion | `Card`, `Skeleton`, `ds-ai-pulse`, `ds-check-pop` |
| 10 | `buttons` | Buttons | `Button` (todas variantes e tamanhos) |
| 11 | `inputs` | Inputs | `Input`, `Textarea`, `DsField`, `Kbd` |
| 12 | `select` | Select & Combobox | `Select`, `Combobox` |
| 13 | `dropdown` | Dropdown | `DropdownMenu`, `DropdownMenuSub`, `Avatar` |
| 14 | `navigation` | Navigation | `Sidebar`, `SidebarProvider`, `CommandDialog` |
| 15 | `overlays` | Overlays | `Dialog`, `Drawer`, `Popover`, `Tooltip` |
| 16 | `tables` | Tables | `Table`, `Badge` |
| 17 | `cards` | Cards | `Card`, `Progress` |
| 18 | `forms` | Forms | `Form`, `FormField`, `ToggleGroup`, RHF + Zod |
| 19 | `empty` | Empty & Loading | `Card`, `Skeleton` |
| 20 | `notifications` | Notifications | `Toaster` (sonner), `Alert` |
| 21 | `ai` | AI Patterns | `Card`, `ds-ai-pulse`, `ds-check-pop` |
| 22 | `composition` | Composition | `Tabs`, `Card`, `Alert`, `Table`, `RadioGroup`, `Switch` |
| 23 | `extras` | Operational extras | `Accordion`, `Breadcrumb`, `Calendar`, `Chart`, `Collapsible`, `DataTable`, `HoverCard`, `InputOTP`, `Kbd`, `Pagination`, `ScrollArea`, `Slider` |

## Regra

Se uma seção precisar de um novo elemento visual, criar componente em `ui/` antes — nunca acrescentar markup inline na página de showcase.
