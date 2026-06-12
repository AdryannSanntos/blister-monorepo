# Design System Skill — Blister OS

> Fonte visual: [`blister-os-reference.html`](../../blister-os-reference.html) · Inventário: [`blister-os-reference.md`](../design-system/blister-os-reference.md)

## Objetivo

Portar proto HTML → Tailwind/shadcn em `apps/web` com fidelidade ao reference.

## Tokens

- Satoshi (body), Poppins (headings/buttons)
- `--primary-600` accent
- Dark via class `.dark` on `<html>` — tokens semantic from `globals.css`
- No raw `dark:` utilities — use semantic tokens

## Componentes reference → prod

| Proto | Prod target |
|-------|-------------|
| `PageHeader` | module page headers |
| `StyleThumb` | marketplace previews |
| `BlisterStepper` | editor/cuts wizards |
| `StatCard` | home KPIs |
| Cards `.card.pad.hov` | shadcn Card variants |

## Layout

- Shell: sidebar 18rem / collapsed 4.25rem
- `.page-inner` max-width 1280px (narrow 1020px)
- NAV groups collapsible

## Regras

- Uma ação principal por tela
- Loading/empty/error sempre
- `tw-animate-css` on overlays
- Não expor metadados internos de IA

## Produto copy

Settings = "Contexto da marca" — **never** "Cérebro da Marca"

## Showcase

Existing `/design-system` route for primitives — OS screens live under `/dashboard/*`.
