import {
  IconBrain as Brain,
  IconBuildingSkyscraper as Building,
  IconEye as Eye,
  IconFile as File,
  IconFileCode as FileCode2,
  IconFilePlus as FilePlus,
  IconFileText as FileText,
  IconFolderSearch as FolderSearch,
  IconGitBranch as GitBranch,
  IconGlobe as Globe,
  IconChecklist as ListTodo,
  IconLogout as LogOut,
  IconPalette as Palette,
  IconPhoto as Photo,
  IconSearch as Search,
  IconSparkles as Sparkles,
  IconTerminal2 as Terminal,
  IconCircleX as XCircle,
} from "@tabler/icons-react";
import type React from "react";

type IconComponent = React.ComponentType<{ className?: string }>;

export type ToolVariant = "simple" | "collapsible";

export type ToolMeta = {
  /** Static icon, or a resolver when the icon depends on the part (e.g. source type). */
  icon: IconComponent | ((part: any) => IconComponent);
  title: (part: any) => string;
  subtitle?: (part: any) => string;
  variant: ToolVariant;
};

/**
 * Resolves a tool's icon, supporting per-part icon selection. Icon components
 * are objects (forwardRef), so a `function` icon is always a resolver.
 */
export function resolveToolIcon(meta: ToolMeta, part: unknown): IconComponent {
  return typeof meta.icon === "function"
    ? (meta.icon as (p: unknown) => IconComponent)(part)
    : meta.icon;
}

/**
 * Per-source-family icon + PT label for agent-chat retrieval rows. An uploaded
 * file, the company brain, the design system and an external source each read
 * distinctly instead of all looking like a generic "search".
 */
const SOURCE_KIND_META: Record<string, { icon: IconComponent; label: string }> =
  {
    file: { icon: FileText, label: "Arquivo" },
    brain: { icon: Brain, label: "Brain" },
    design: { icon: Palette, label: "Design system" },
    asset: { icon: Photo, label: "Asset" },
    web: { icon: Globe, label: "Fonte externa" },
    company: { icon: Building, label: "Contexto da empresa" },
    document: { icon: File, label: "Documento" },
  };

function getDisplayPath(filePath: string): string {
  if (!filePath) return "";
  const prefixes = [
    "/project/sandbox/repo/",
    "/project/sandbox/",
    "/project/",
    "/workspace/",
  ];
  for (const prefix of prefixes) {
    if (filePath.startsWith(prefix)) return filePath.slice(prefix.length);
  }
  const worktreeMatch = filePath.match(
    /\.21st\/worktrees\/[^/]+\/[^/]+\/(.+)$/,
  );
  if (worktreeMatch) return worktreeMatch[1]!;
  if (filePath.startsWith("/")) {
    const parts = filePath.split("/");
    const rootIndicators = ["apps", "packages", "src", "lib", "components"];
    const rootIndex = parts.findIndex((p) => rootIndicators.includes(p));
    if (rootIndex > 0) return parts.slice(rootIndex).join("/");
  }
  return filePath;
}

function calculateDiffStats(oldString: string, newString: string) {
  const oldLines = oldString.split("\n");
  const newLines = newString.split("\n");
  const maxLines = Math.max(oldLines.length, newLines.length);
  let addedLines = 0;
  let removedLines = 0;
  for (let i = 0; i < maxLines; i++) {
    if (oldLines[i] !== undefined && newLines[i] !== undefined) {
      if (oldLines[i] !== newLines[i]) {
        removedLines++;
        addedLines++;
      }
    } else if (oldLines[i] !== undefined) {
      removedLines++;
    } else if (newLines[i] !== undefined) {
      addedLines++;
    }
  }
  return { addedLines, removedLines };
}

/** PT label for the kind of agent-chat search, used as the search row subtitle. */
function searchActionLabel(part: {
  input?: { toolName?: string };
  state?: string;
}): string {
  const isPending =
    part.state !== "output-available" && part.state !== "output-error";
  const labels: Record<string, { pending: string; done: string }> = {
    next_action_analysis: {
      pending: "Analisando solicitacao",
      done: "Definiu proxima acao",
    },
    rag_search: {
      pending: "Consultando contexto",
      done: "Consultou contexto da empresa",
    },
    file_search: {
      pending: "Pesquisando arquivos",
      done: "Pesquisou arquivos do contexto",
    },
    web_research: {
      pending: "Pesquisando na web",
      done: "Pesquisou fontes externas",
    },
  };
  const label = part.input?.toolName ? labels[part.input.toolName] : undefined;
  if (label) return isPending ? label.pending : label.done;
  return isPending ? "Pesquisando" : "Pesquisa concluída";
}

export const toolRegistry: Record<string, ToolMeta> = {
  "tool-Task": {
    icon: Sparkles,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      const subagentType = part.input?.subagent_type || "Agent";
      return isPending
        ? `Running ${subagentType}`
        : `${subagentType} completed`;
    },
    subtitle: (part) => {
      const desc = part.input?.description || "";
      return desc.length > 50 ? desc.slice(0, 47) + "..." : desc;
    },
    variant: "simple",
  },
  // Agent tool — renamed from "Task" in claude-agent-sdk 0.2.63+
  "tool-Agent": {
    icon: Sparkles,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      const subagentType = part.input?.subagent_type || "Agent";
      return isPending
        ? `Running ${subagentType}`
        : `${subagentType} completed`;
    },
    subtitle: (part) => {
      const desc = part.input?.description || "";
      return desc.length > 50 ? desc.slice(0, 47) + "..." : desc;
    },
    variant: "simple",
  },
  "tool-Skill": {
    icon: Sparkles,
    title: () => "Skill",
    subtitle: (part) => part.input?.skill || "",
    variant: "simple",
  },
  // Conversational agent chat tools (rag_search / file_search / web_research).
  "tool-Search": {
    // Each source family (uploaded file, brain, design system, web, …) renders
    // with its own icon; generic searches fall back to the magnifier.
    icon: (part: any) => {
      const kind =
        typeof part?.input?.sourceKind === "string"
          ? part.input.sourceKind
          : "";
      return SOURCE_KIND_META[kind]?.icon ?? Search;
    },
    // The row leads with the concrete file/context that was read, so it is
    // directed at the source rather than echoing a generic action. The source
    // family ("Arquivo", "Brain", "Design system", …) drops to the subtitle.
    title: (part) => {
      const fileTitle =
        typeof part.input?.fileTitle === "string" ? part.input.fileTitle : "";
      if (fileTitle) {
        return fileTitle.length > 64
          ? `${fileTitle.slice(0, 61)}...`
          : fileTitle;
      }
      return searchActionLabel(part);
    },
    subtitle: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      const fileTitle =
        typeof part.input?.fileTitle === "string" ? part.input.fileTitle : "";
      if (fileTitle) {
        const kind =
          typeof part.input?.sourceKind === "string"
            ? part.input.sourceKind
            : "";
        return SOURCE_KIND_META[kind]?.label ?? searchActionLabel(part);
      }
      if (!isPending) return "Nenhum resultado";
      const query = part.input?.query || "";
      return query.length > 40 ? `${query.slice(0, 37)}...` : query;
    },
    variant: "collapsible",
  },
  "tool-Grep": {
    icon: Search,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      if (isPending) return "Grepping";
      const numFiles = part.output?.numFiles || 0;
      return numFiles > 0 ? `Grepped ${numFiles} files` : "No matches";
    },
    subtitle: (part) => {
      const pattern = part.input?.pattern || "";
      const path = part.input?.path || "";
      if (path) {
        const combined = `${pattern} in ${getDisplayPath(path)}`;
        return combined.length > 40 ? combined.slice(0, 37) + "..." : combined;
      }
      return pattern.length > 40 ? pattern.slice(0, 37) + "..." : pattern;
    },
    variant: "simple",
  },
  "tool-Glob": {
    icon: FolderSearch,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      if (isPending) return "Exploring files";
      const numFiles = part.output?.numFiles || 0;
      return numFiles > 0 ? `Found ${numFiles} files` : "No files found";
    },
    subtitle: (part) => {
      const pattern = part.input?.pattern || "";
      return pattern.length > 40 ? pattern.slice(0, 37) + "..." : pattern;
    },
    variant: "simple",
  },
  "tool-Read": {
    icon: Eye,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Reading" : "Read";
    },
    subtitle: (part) => {
      const filePath = part.input?.file_path || "";
      if (!filePath) return "";
      return filePath.split("/").pop() || "";
    },
    variant: "simple",
  },
  "tool-Edit": {
    icon: FileCode2,
    title: (part) => {
      const filePath = part.input?.file_path || "";
      if (!filePath) return "Edit";
      return filePath.split("/").pop() || "Edit";
    },
    subtitle: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      if (isPending) return "";
      const oldString = part.input?.old_string || "";
      const newString = part.input?.new_string || "";
      if (!oldString && !newString) return "";
      if (oldString !== newString) {
        const { addedLines, removedLines } = calculateDiffStats(
          oldString,
          newString,
        );
        return `+${addedLines} -${removedLines}`;
      }
      return "";
    },
    variant: "simple",
  },
  "tool-Write": {
    icon: FilePlus,
    title: () => "Create",
    subtitle: (part) => {
      const filePath = part.input?.file_path || "";
      if (!filePath) return "";
      return filePath.split("/").pop() || "";
    },
    variant: "simple",
  },
  "tool-Bash": {
    icon: Terminal,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Running command" : "Ran command";
    },
    subtitle: (part) => {
      const command = part.input?.command || "";
      if (!command) return "";
      let normalized = command.replace(/\\\s*\n\s*/g, " ").trim();
      normalized = normalized.replace(
        /\/(?:Users|home|root)\/[^\s"']+/g,
        (match: string) => getDisplayPath(match),
      );
      return normalized.length > 50
        ? normalized.slice(0, 47) + "..."
        : normalized;
    },
    variant: "simple",
  },
  "tool-WebFetch": {
    icon: Globe,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Fetching" : "Fetched";
    },
    subtitle: (part) => {
      const url = part.input?.url || "";
      try {
        return new URL(url).hostname.replace("www.", "");
      } catch {
        return url.slice(0, 30);
      }
    },
    variant: "simple",
  },
  "tool-WebSearch": {
    icon: Search,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Searching web" : "Searched web";
    },
    subtitle: (part) => {
      const query = part.input?.query || "";
      return query.length > 40 ? query.slice(0, 37) + "..." : query;
    },
    variant: "collapsible",
  },
  "tool-TodoWrite": {
    icon: ListTodo,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      const action = part.input?.action || "update";
      if (isPending) return action === "add" ? "Adding todo" : "Updating todos";
      return action === "add" ? "Added todo" : "Updated todos";
    },
    subtitle: (part) => {
      const todos = part.input?.todos || [];
      if (todos.length === 0) return "";
      return `${todos.length} ${todos.length === 1 ? "item" : "items"}`;
    },
    variant: "simple",
  },
  "tool-PlanWrite": {
    icon: Sparkles,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      const action = part.input?.action || "create";
      if (isPending) {
        if (action === "create") return "Creating plan";
        if (action === "approve") return "Approving plan";
        return "Updating plan";
      }
      const status = part.input?.plan?.status;
      if (status === "awaiting_approval") return "Plan ready for review";
      if (status === "approved") return "Plan approved";
      if (status === "completed") return "Plan completed";
      return action === "create" ? "Created plan" : "Updated plan";
    },
    variant: "simple",
  },
  "tool-ExitPlanMode": {
    icon: LogOut,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Finishing plan" : "Plan complete";
    },
    variant: "simple",
  },
  "tool-NotebookEdit": {
    icon: FileCode2,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Editing notebook" : "Edited notebook";
    },
    subtitle: (part) => {
      const filePath = part.input?.file_path || "";
      if (!filePath) return "";
      return filePath.split("/").pop() || "";
    },
    variant: "simple",
  },
  "tool-BashOutput": {
    icon: Terminal,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Getting output" : "Command output";
    },
    subtitle: (part) => {
      const output = part.output;
      if (typeof output === "string" && output.trim()) return output.trim();
      const command = part.input?.command || "";
      if (!command) return "";
      let normalized = command.replace(/\\\s*\n\s*/g, " ").trim();
      normalized = normalized.replace(
        /\/(?:Users|home|root)\/[^\s"']+/g,
        (match: string) => getDisplayPath(match),
      );
      return normalized.length > 50
        ? normalized.slice(0, 47) + "..."
        : normalized;
    },
    variant: "simple",
  },
  "tool-KillShell": {
    icon: XCircle,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Stopping shell" : "Shell stopped";
    },
    subtitle: (part) => {
      const pid = part.input?.pid;
      return typeof pid === "number" ? `pid ${pid}` : "";
    },
    variant: "simple",
  },
  "tool-cloning": {
    icon: GitBranch,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Cloning repo" : "Repo cloned";
    },
    subtitle: (part) => part.input?.repo ?? "",
    variant: "simple",
  },
  "tool-Thinking": {
    icon: Sparkles,
    title: (part) => {
      const isPending =
        part.state !== "output-available" && part.state !== "output-error";
      return isPending ? "Thinking..." : "Thought";
    },
    variant: "collapsible",
  },
};

// MCP tool parsing
const MCP_TOOL_PREFIX = "tool-mcp__";

export type McpToolInfo = {
  serverName: string;
  toolName: string;
  displayName: string;
  category: string;
};

const BUILTIN_MCP_TOOLS: Record<string, McpToolInfo> = {
  "tool-ListMcpResources": {
    serverName: "mcp",
    toolName: "list_resources",
    displayName: "List Resources",
    category: "list",
  },
  "tool-ListMcpResourcesTool": {
    serverName: "mcp",
    toolName: "list_resources",
    displayName: "List Resources",
    category: "list",
  },
  "tool-ReadMcpResource": {
    serverName: "mcp",
    toolName: "read_resource",
    displayName: "Read Resource",
    category: "get",
  },
  "tool-ReadMcpResourceTool": {
    serverName: "mcp",
    toolName: "read_resource",
    displayName: "Read Resource",
    category: "get",
  },
};

export function parseMcpToolType(partType: string): McpToolInfo | null {
  const builtin = BUILTIN_MCP_TOOLS[partType];
  if (builtin) return builtin;
  if (!partType.startsWith(MCP_TOOL_PREFIX)) return null;
  const withoutPrefix = partType.slice(MCP_TOOL_PREFIX.length);
  const separatorIndex = withoutPrefix.indexOf("__");
  if (separatorIndex === -1) return null;
  const serverName = withoutPrefix.slice(0, separatorIndex);
  const toolName = withoutPrefix.slice(separatorIndex + 2);
  return {
    serverName,
    toolName,
    displayName: toolName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim(),
    category: "other",
  };
}
