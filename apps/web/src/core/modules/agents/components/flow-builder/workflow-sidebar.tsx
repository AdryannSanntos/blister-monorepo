"use client";

import type { Node } from "@xyflow/react";
import { ArrowLeft, Blocks, Search, Settings2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "src/core/shared/components/ui/input-group";
import { Label } from "src/core/shared/components/ui/label";
import { ScrollArea } from "src/core/shared/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { useOrgAIBuilderCatalog } from "src/core/modules/agents/hooks/use-org-ai-builder-catalog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/core/shared/components/ui/tabs";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { cn } from "src/core/shared/utils";
import {
  BLOCK_CATEGORIES,
  BLOCK_TYPES,
  type BlockCategoryKey,
  type BlockTypeKey,
} from "./block-types";

type WorkflowNodeData = {
  blockType: BlockTypeKey;
  label?: string;
  prompt?: string;
  providerId?: string;
  modelId?: string;
};

export type WorkflowConfig = {
  name: string;
  objective: string;
  instructions: string;
  fallbackMessage: string;
};

type Props = {
  orgId: string;
  node: Node<WorkflowNodeData> | null;
  workflowConfig: WorkflowConfig;
  onWorkflowConfigChange: (patch: Partial<WorkflowConfig>) => void;
  onAddBlock: (blockType: BlockTypeKey) => void;
  onChange: (nodeId: string, patch: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClearSelection: () => void;
};

const CATEGORY_ORDER: BlockCategoryKey[] = [
  "essentials",
  "generation",
  "interaction",
  "validation",
];

export const WORKFLOW_BLOCK_DRAG_TYPE = "application/workflow-block";

export function WorkflowSidebar({
  orgId,
  node,
  workflowConfig,
  onWorkflowConfigChange,
  onAddBlock,
  onChange,
  onDelete,
  onClearSelection,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlockCategoryKey>(
    "essentials",
  );
  const [topTab, setTopTab] = useState<"blocks" | "config">("blocks");

  useEffect(() => {
    if (node) setTopTab("config");
  }, [node?.id]);

  const filteredBlocks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return Object.values(BLOCK_TYPES).filter((block) => {
      if (block.category !== activeCategory) return false;
      if (!normalizedQuery) return true;
      const haystack = [block.label, block.description, ...block.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeCategory, query]);

  const selectedBlock = node ? BLOCK_TYPES[node.data.blockType] : null;
  const SelectedIcon = selectedBlock?.icon;
  const canConfigurePrompt =
    node?.data.blockType === "llm_generate" ||
    node?.data.blockType === "image_generate";

  return (
    <aside className="pointer-events-auto absolute right-3 top-3 bottom-3 z-20 flex w-[20rem] flex-col overflow-hidden rounded-[var(--r-xl)] border border-[var(--line-default)] bg-[var(--bg-base)] shadow-[var(--shadow-lg)] animate-in slide-in-from-right-4 fade-in-0 duration-300">
      <div className="border-b border-[var(--line-subtle)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Workflow Builder
            </p>
            <h2 className="mt-0.5 truncate text-[14px] font-medium text-[var(--fg-primary)]">
              {node ? (node.data.label ?? selectedBlock?.label) : "Adicionar bloco"}
            </h2>
          </div>
          {node ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Voltar para blocos"
              onClick={onClearSelection}
              className="shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : (
            <Badge variant="secondary">Beta</Badge>
          )}
        </div>
      </div>

      <Tabs
        value={topTab}
        onValueChange={(next) => setTopTab(next as "blocks" | "config")}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 border-b border-[var(--line-subtle)] px-3 pt-2">
          <TabsList variant="underline" className="w-full">
            <TabsTrigger value="blocks">
              <Blocks className="size-3.5" />
              Blocos
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings2 className="size-3.5" />
              Configuração
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="blocks"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200"
        >
          <div className="shrink-0 border-b border-[var(--line-subtle)] px-3 py-3">
            <InputGroup size="md">
              <InputGroupAddon align="inline-start">
                <Search className="size-4 text-[var(--fg-quaternary)]" />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar bloco"
                aria-label="Buscar blocos"
              />
            </InputGroup>
          </div>

          <Tabs
            value={activeCategory}
            onValueChange={(next) =>
              setActiveCategory(next as BlockCategoryKey)
            }
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="shrink-0 px-3 pt-3">
              <TabsList className="grid w-full grid-cols-4 gap-1">
                {CATEGORY_ORDER.map((key) => (
                  <TabsTrigger key={key} value={key} className="text-[11px]">
                    {BLOCK_CATEGORIES[key].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {CATEGORY_ORDER.map((key) => (
              <TabsContent
                key={key}
                value={key}
                className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"
              >
                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-3 p-3">
                    <p className="text-[11.5px] leading-[1.5] text-[var(--fg-tertiary)] animate-in fade-in-0 duration-200">
                      {BLOCK_CATEGORIES[key].description}
                    </p>
                    {filteredBlocks.length === 0 ? (
                      <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-5 text-center animate-in fade-in-0 duration-200">
                        <p className="text-[12px] font-medium text-[var(--fg-secondary)]">
                          Nenhum bloco encontrado
                        </p>
                        <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--fg-tertiary)]">
                          Tente outro termo ou outra categoria.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredBlocks.map((block, idx) => {
                          const Icon = block.icon;
                          return (
                            <button
                              key={block.key}
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData(
                                  WORKFLOW_BLOCK_DRAG_TYPE,
                                  block.key,
                                );
                                event.dataTransfer.effectAllowed = "move";
                              }}
                              onClick={() => onAddBlock(block.key)}
                              style={{ animationDelay: `${idx * 40}ms` }}
                              className={cn(
                                "flex w-full cursor-grab items-start gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-3 py-3 text-left transition-all duration-[var(--dur-fast)] active:cursor-grabbing active:scale-[0.98]",
                                "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both",
                                "hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] hover:shadow-[var(--shadow-sm)]",
                              )}
                            >
                              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] transition-transform duration-200 group-hover:scale-110">
                                <Icon className={cn("size-4", block.tone)} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                                  {block.label}
                                </p>
                                <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--fg-tertiary)]">
                                  {block.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent
          value="config"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 data-[state=active]:duration-200"
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 p-4">
              {node ? (
                <>
                  <div className="flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-3 animate-in fade-in-0 slide-in-from-top-1 duration-300">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)]">
                      {SelectedIcon ? (
                        <SelectedIcon
                          className={cn("size-4", selectedBlock?.tone)}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                        {selectedBlock?.label}
                      </p>
                      <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--fg-tertiary)]">
                        {selectedBlock?.description}
                      </p>
                    </div>
                  </div>

                  <FieldBlock
                    label="Rótulo"
                    description="Nome interno exibido no canvas."
                  >
                    <Input
                      value={node.data.label ?? ""}
                      onChange={(event) =>
                        onChange(node.id, { label: event.target.value })
                      }
                      placeholder={selectedBlock?.label}
                    />
                  </FieldBlock>

                  {canConfigurePrompt ? (
                    <>
                      <GenerationModelFields
                        orgId={orgId}
                        blockType={
                          node.data.blockType as "llm_generate" | "image_generate"
                        }
                        providerId={node.data.providerId}
                        modelId={node.data.modelId}
                        onChange={(patch) => onChange(node.id, patch)}
                      />
                      <FieldBlock
                        label="Prompt"
                        description="Use variáveis como {{chave}} para reaproveitar saídas anteriores."
                      >
                        <Textarea
                          value={node.data.prompt ?? ""}
                          onChange={(event) =>
                            onChange(node.id, { prompt: event.target.value })
                          }
                          placeholder="Descreva o que este bloco deve fazer..."
                          className="min-h-[160px]"
                        />
                      </FieldBlock>
                    </>
                  ) : null}

                  {node.data.blockType !== "input" &&
                  node.data.blockType !== "output" ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-center text-[var(--danger)] transition-transform duration-150 hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] active:scale-95"
                      onClick={() => onDelete(node.id)}
                    >
                      <Trash2 className="size-4" />
                      Remover bloco
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-[11.5px] leading-[1.6] text-[var(--fg-tertiary)] animate-in fade-in-0 duration-200">
                    Configuração global do workflow. Selecione um bloco no
                    canvas para configurá-lo individualmente.
                  </p>
                  <FieldBlock
                    label="Nome"
                    description="Identificação interna do workflow."
                  >
                    <Input
                      value={workflowConfig.name}
                      onChange={(event) =>
                        onWorkflowConfigChange({ name: event.target.value })
                      }
                      placeholder="Workflow principal"
                    />
                  </FieldBlock>
                  <FieldBlock
                    label="Objetivo"
                    description="O que o fluxo deve entregar."
                  >
                    <Textarea
                      value={workflowConfig.objective}
                      onChange={(event) =>
                        onWorkflowConfigChange({
                          objective: event.target.value,
                        })
                      }
                      placeholder="Resumo em uma frase."
                      className="min-h-[90px]"
                    />
                  </FieldBlock>
                  <FieldBlock
                    label="Instruções"
                    description="Regras para todos os blocos."
                  >
                    <Textarea
                      value={workflowConfig.instructions}
                      onChange={(event) =>
                        onWorkflowConfigChange({
                          instructions: event.target.value,
                        })
                      }
                      placeholder="Tom, validações, prioridades."
                      className="min-h-[110px]"
                    />
                  </FieldBlock>
                  <FieldBlock
                    label="Fallback"
                    description="Mensagem padrão se o fluxo falhar."
                  >
                    <Textarea
                      value={workflowConfig.fallbackMessage}
                      onChange={(event) =>
                        onWorkflowConfigChange({
                          fallbackMessage: event.target.value,
                        })
                      }
                      placeholder="Resposta de contingência."
                      className="min-h-[90px]"
                    />
                  </FieldBlock>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function GenerationModelFields({
  orgId,
  blockType,
  providerId,
  modelId,
  onChange,
}: {
  orgId: string;
  blockType: "llm_generate" | "image_generate";
  providerId?: string;
  modelId?: string;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
}) {
  const kind = blockType === "image_generate" ? "image" : "text";
  const catalog = useOrgAIBuilderCatalog(orgId, kind);
  const providers = catalog.data?.providers ?? [];
  const modelsForProvider = (catalog.data?.models ?? []).filter(
    (model) => model.providerId === providerId,
  );

  const handleProviderChange = (nextProviderId: string) => {
    const nextModels = (catalog.data?.models ?? []).filter(
      (model) => model.providerId === nextProviderId,
    );
    const keepsModel = nextModels.some((model) => model.id === modelId);
    onChange({
      providerId: nextProviderId,
      modelId: keepsModel ? modelId : undefined,
    });
  };

  return (
    <>
      <FieldBlock
        label="Provedor"
        description="Gateway de IA usado neste bloco."
      >
        <Select
          value={providerId ?? ""}
          onValueChange={handleProviderChange}
          disabled={catalog.isLoading || providers.length === 0}
        >
          <SelectTrigger aria-label="Selecionar provedor">
            <SelectValue
              placeholder={
                catalog.isLoading
                  ? "Carregando provedores..."
                  : "Selecione um provedor"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldBlock>

      <FieldBlock
        label="Modelo"
        description={
          blockType === "image_generate"
            ? "Modelo de geração de imagem."
            : "Modelo de linguagem para texto."
        }
      >
        <Select
          value={modelId ?? ""}
          onValueChange={(nextModelId) => onChange({ modelId: nextModelId })}
          disabled={
            !providerId ||
            catalog.isLoading ||
            modelsForProvider.length === 0
          }
        >
          <SelectTrigger aria-label="Selecionar modelo">
            <SelectValue
              placeholder={
                !providerId
                  ? "Escolha um provedor primeiro"
                  : catalog.isLoading
                    ? "Carregando modelos..."
                    : "Selecione um modelo"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {modelsForProvider.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldBlock>
    </>
  );
}

function FieldBlock({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 fill-mode-both">
      <div className="space-y-1">
        <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--fg-quaternary)]">
          {label}
        </Label>
        <p className="text-[11.5px] leading-[1.5] text-[var(--fg-tertiary)]">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
