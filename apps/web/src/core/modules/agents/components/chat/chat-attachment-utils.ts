import type { ChatAttachment } from "src/core/modules/agents/hooks/use-agent-chat";

const TEXT_LIKE_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "html",
  "xml",
  "js",
  "ts",
  "tsx",
  "jsx",
]);

export async function prepareChatAttachments(
  files: File[],
): Promise<ChatAttachment[]> {
  return Promise.all(files.map((file) => prepareChatAttachment(file)));
}

export function splitComposerAttachments(attachments: ChatAttachment[]) {
  return {
    images: attachments
      .filter(
        (attachment) =>
          attachment.contentType.startsWith("image/") && attachment.url,
      )
      .map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        url: attachment.url as string,
        size: attachment.size,
      })),
    files: attachments
      .filter((attachment) => !attachment.contentType.startsWith("image/"))
      .map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        size: attachment.size,
      })),
  };
}

async function prepareChatAttachment(file: File): Promise<ChatAttachment> {
  const attachment: ChatAttachment = {
    id: crypto.randomUUID(),
    filename: file.name,
    contentType: file.type || guessMimeType(file.name),
    size: file.size,
  };

  if (attachment.contentType.startsWith("image/")) {
    attachment.url = await readFileAsDataUrl(file);
    return attachment;
  }

  if (isTextLikeFile(file, attachment.contentType)) {
    const textContent = await readFileAsText(file);
    if (textContent.trim().length > 0) {
      attachment.textContent = textContent;
    }
  }

  return attachment;
}

function isTextLikeFile(file: File, contentType: string) {
  if (contentType.startsWith("text/")) return true;

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? TEXT_LIKE_EXTENSIONS.has(extension) : false;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Falha ao ler arquivo."));
    reader.readAsText(file);
  });
}

function guessMimeType(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "md":
    case "markdown":
      return "text/markdown";
    case "json":
      return "application/json";
    case "csv":
      return "text/csv";
    case "html":
      return "text/html";
    default:
      return "application/octet-stream";
  }
}
