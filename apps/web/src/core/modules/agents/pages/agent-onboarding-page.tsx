"use client";

import { BookOpen, Bot, ChevronRight, Cpu, Globe, Search, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type AgentTool,
  useCompleteAgentOnboarding,
  useCompanyAgent,
} from "src/core/modules/agents/hooks/use-agents";
import { useAgentBuilderCatalog } from "src/core/modules/agents/hooks/use-agent-catalog";
import { ModelPicker } from "src/core/modules/agents/components/model-picker";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import { Switch } from "src/core/shared/components/ui/switch";
import { Textarea } from "src/core/shared/components/ui/textarea";

const TOTAL_STEPS = 3;

const STEPS = [
  { label: "Objetivo", description: "O que este agente faz" },
  { label: "Comportamento", description: "Tom, persona e instruções" },
  { label: "Contexto", description: "Ferramentas e fontes" },
];

type Reference = {
  sourceType: "brain_entry" | "asset" | "manual" | "web";
  sourceId: string;
  label?: string;
};

const AGENT_TOOLS: Array<{
  value: AgentTool;
  label: string;
  description: string;
  icon: typeof Search;
}> = [
  {
    value: "rag_search",
    label: "Consulta ao contexto",
    description: "Busca no material indexado da empresa.",
    icon: BookOpen,
  },
  {
    value: "file_search",
    label: "Pesquisa em arquivos",
    description: "Procura em arquivos de contexto do agente.",
    icon: Search,
  },
  {
    value: "web_research",
    label: "Pesquisa na web",
    description: "Consulta fontes externas com evidências resumidas.",
    icon: Globe,
  },
];

const DEFAULT_AGENT_TOOLS: AgentTool[] = ["rag_search", "file_search"];

export function AgentOnboardingPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const { activeOrgId } = useActiveOrganization();
  const orgId = activeOrgId ?? "";
  const router = useRouter();
  const agent = useCompanyAgent(orgId, agentId);
  const complete = useCompleteAgentOnboarding(orgId, agentId);

  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [allowedTools, setAllowedTools] = useState<AgentTool[]>(DEFAULT_AGENT_TOOLS);
  const [references, setReferences] = useState<Reference[]>([]);
  const [refDraft, setRefDraft] = useState({
    sourceType: "manual" as Reference["sourceType"],
    sourceId: "",
    label: "",
  });
  const catalog = useAgentBuilderCatalog(orgId);
  const [selectedModelId, setSelectedModelId] = useState("");

  useEffect(() => {
    if (!agent.data) return;
    if (agent.data.allowedTools.length > 0) {
      setAllowedTools(agent.data.allowedTools);
    }
  }, [agent.data]);

  function toggleTool(tool: AgentTool) {
    setAllowedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }

  function addReference() {
    if (!refDraft.sourceId.trim()) return;
    setReferences((prev) => [
      ...prev,
      {
        sourceType: refDraft.sourceType,
        sourceId: refDraft.sourceId.trim(),
        label: refDraft.label.trim() || undefined,
      },
    ]);
    setRefDraft({ sourceType: "manual", sourceId: "", label: "" });
  }

  async function handleComplete() {
    if (allowedTools.length === 0) {
      toast.error("Habilite ao menos uma fonte de pesquisa para o agente.");
      return;
    }

    await complete.mutateAsync({
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      notes: notes.trim() || undefined,
      allowedTools,
      references: references.length > 0 ? references : undefined,
      modelId: selectedModelId || undefined,
    });
    router.push(`/dashboard/workspace/agents/${agentId}/chat`);
  }

  if (!agent.data && !agent.isLoading) return null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Painel esquerdo — identidade e progresso ── */}
      <div className="flex w-72 shrink-0 flex-col justify-between border-r border-[var(--line-default)] bg-[var(--bg-raised)] px-8 py-10">
        <div className="flex flex-col gap-8">
          {/* Agent identity */}
          <div className="flex flex-col gap-3">
            <div className="flex size-12 items-center justify-center rounded-[var(--r-xl)] bg-[var(--accent-soft)]">
              <Bot className="size-6 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--fg-quaternary)]">
                Configurando agente
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-[var(--fg-primary)]">
                {agent.data?.name ?? "…"}
              </p>
            </div>
          </div>

          {/* Step list */}
          <div className="flex flex-col gap-1">
            {STEPS.map((s, i) => {
              const num = i + 1;
              const done = num < step;
              const active = num === step;
              return (
                <div
                  key={num}
                  className="flex items-start gap-3 rounded-[var(--r-md)] px-3 py-2.5 transition-colors duration-[var(--dur-fast)]"
                  style={{
                    background: active ? "var(--bg-hover)" : "transparent",
                  }}
                >
                  <div
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-[var(--dur-fast)]"
                    style={{
                      background: done
                        ? "var(--accent)"
                        : active
                          ? "var(--accent-soft)"
                          : "var(--bg-sunken)",
                      color: done
                        ? "white"
                        : active
                          ? "var(--accent)"
                          : "var(--fg-quaternary)",
                    }}
                  >
                    {done ? "✓" : num}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[13px] font-medium transition-colors duration-[var(--dur-fast)]"
                      style={{
                        color: active
                          ? "var(--fg-primary)"
                          : done
                            ? "var(--fg-secondary)"
                            : "var(--fg-quaternary)",
                      }}
                    >
                      {s.label}
                    </p>
                    <p className="text-[11.5px] text-[var(--fg-quaternary)]">
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11.5px] text-[var(--fg-quaternary)]">
          Você pode ajustar tudo depois em Configurações.
        </p>
      </div>

      {/* ── Painel direito — conteúdo do passo ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-base)]">
        <div className="flex flex-1 flex-col px-12 py-10">
          {/* Step 1 — Objetivo */}
          {step === 1 && (
            <div className="flex flex-1 flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                  Qual é o objetivo deste agente?
                </h2>
                <p className="mt-1.5 text-[13px] text-[var(--fg-tertiary)]">
                  Descreva em linguagem natural o que ele faz. Isso orienta como ele responde aos usuários.
                </p>
              </div>
              <Textarea
                rows={6}
                placeholder="Ex: Agente especializado em criar briefings de campanhas de marketing para freelancers. Recebe informações do cliente e gera um documento completo com contexto, objetivos e métricas de sucesso."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none flex-1 text-[13.5px]"
              />
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!description.trim()}
                  className="gap-1.5"
                >
                  Próximo
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Comportamento */}
          {step === 2 && (
            <div className="flex flex-1 flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                  Como o agente deve se comportar?
                </h2>
                <p className="mt-1.5 text-[13px] text-[var(--fg-tertiary)]">
                  Defina tom, persona e regras de resposta. Notas internas ficam visíveis apenas para editores.
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-medium text-[var(--fg-secondary)]">
                    Instruções e tom
                  </label>
                  <Textarea
                    rows={5}
                    placeholder="Ex: Responda sempre em português, com tom profissional mas acessível. Faça perguntas quando faltarem informações. Nunca invente dados nem assuma contexto não fornecido."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="resize-none text-[13.5px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-medium text-[var(--fg-secondary)]">
                    Notas internas{" "}
                    <span className="font-normal text-[var(--fg-quaternary)]">(opcional)</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Contexto adicional para editores do agente — não aparece para usuários..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none text-[13.5px]"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button onClick={() => setStep(3)} className="gap-1.5">
                  Próximo
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Contexto & ferramentas */}
          {step === 3 && (
            <div className="flex flex-1 flex-col gap-7 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--fg-primary)]">
                  Contexto e ferramentas
                </h2>
                <p className="mt-1.5 text-[13px] text-[var(--fg-tertiary)]">
                  Defina quais fontes e capacidades o agente pode usar durante as conversas.
                </p>
              </div>

              {/* Model */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Cpu className="size-3.5 text-[var(--fg-tertiary)]" />
                  <span className="text-[12.5px] font-semibold text-[var(--fg-secondary)]">
                    Modelo de IA
                  </span>
                </div>
                <ModelPicker
                  catalog={catalog.data}
                  value={selectedModelId}
                  onChange={setSelectedModelId}
                />
              </div>

              {/* Tools */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Wrench className="size-3.5 text-[var(--fg-tertiary)]" />
                  <span className="text-[12.5px] font-semibold text-[var(--fg-secondary)]">
                    Ferramentas habilitadas
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {AGENT_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const checked = allowedTools.includes(tool.value);
                    return (
                      <button
                        key={tool.value}
                        type="button"
                        onClick={() => toggleTool(tool.value)}
                        className="flex flex-col gap-2.5 rounded-[var(--r-lg)] border p-4 text-left transition-colors duration-[var(--dur-fast)]"
                        style={{
                          borderColor: checked
                            ? "var(--accent)"
                            : "var(--line-subtle)",
                          background: checked
                            ? "var(--accent-soft)"
                            : "var(--bg-raised)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex size-7 items-center justify-center rounded-[var(--r-md)]"
                            style={{
                              background: checked
                                ? "color-mix(in oklch, var(--accent) 20%, transparent)"
                                : "var(--bg-sunken)",
                            }}
                          >
                            <Icon
                              className="size-3.5"
                              style={{
                                color: checked
                                  ? "var(--accent)"
                                  : "var(--fg-tertiary)",
                              }}
                            />
                          </div>
                          <Switch
                            checked={checked}
                            onCheckedChange={() => toggleTool(tool.value)}
                            aria-label={tool.label}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <p
                            className="text-[12.5px] font-medium"
                            style={{
                              color: checked
                                ? "var(--accent)"
                                : "var(--fg-primary)",
                            }}
                          >
                            {tool.label}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-[var(--fg-tertiary)]">
                            {tool.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* References */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-3.5 text-[var(--fg-tertiary)]" />
                  <span className="text-[12.5px] font-semibold text-[var(--fg-secondary)]">
                    Referências de contexto{" "}
                    <span className="font-normal text-[var(--fg-quaternary)]">(opcional)</span>
                  </span>
                </div>
                {references.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {references.map((ref, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                            {ref.sourceType}
                          </span>
                          <span className="truncate text-[12px] text-[var(--fg-primary)]">
                            {ref.label ?? ref.sourceId}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setReferences((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="ml-2 shrink-0 text-[11px] text-[var(--fg-quaternary)] hover:text-[var(--danger)]"
                        >
                          remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    value={refDraft.sourceType}
                    onChange={(e) =>
                      setRefDraft((d) => ({
                        ...d,
                        sourceType: e.target.value as Reference["sourceType"],
                      }))
                    }
                    className="shrink-0 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-2.5 py-1.5 text-[12px] text-[var(--fg-primary)] outline-none"
                  >
                    <option value="brain_entry">Brain</option>
                    <option value="asset">Asset</option>
                    <option value="web">Web</option>
                    <option value="manual">Manual</option>
                  </select>
                  <Input
                    placeholder="ID ou URL"
                    value={refDraft.sourceId}
                    onChange={(e) =>
                      setRefDraft((d) => ({ ...d, sourceId: e.target.value }))
                    }
                    className="flex-1 text-[12px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addReference}
                    disabled={!refDraft.sourceId.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={complete.isPending}
                  className="gap-1.5"
                >
                  {complete.isPending ? "Ativando..." : "Concluir e ativar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
