// Keys whose string value is worth showing as a live "typing" preview while the
// agent streams its (usually JSON) answer. Order matters: the first match wins.
const PREVIEW_KEYS = [
  "creativeDirection",
  "compositionSystem",
  "caption",
  "copy",
  "legenda",
  "content",
  "text",
  "message",
  "recommendations",
  "summary",
  "plan",
  "headline",
  "imagePrompt",
  "prompt",
  "aestheticLanguage",
];

function unescapeJsonString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Turns a partial streamed buffer into a human-readable preview.
 *
 * Agents stream structured JSON, so the raw buffer looks like
 * `{"caption":"Descubra o sab`. We extract the value of the first meaningful
 * text field (even if the closing quote hasn't arrived yet) so the user sees
 * clean text typing in, not raw JSON braces. Falls back to the raw buffer for
 * plain-text streams, and to an empty string until a text field appears.
 */
export function extractStreamingText(buffer: string | undefined): string {
  if (!buffer) return "";

  const trimmed = buffer.trimStart();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return buffer;
  }

  for (const key of PREVIEW_KEYS) {
    const regex = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, "i");
    const match = trimmed.match(regex);
    if (match?.[1]) {
      const preview = unescapeJsonString(match[1]).trim();
      if (preview) return preview;
    }
  }

  if (/"creativeDirection"/i.test(trimmed)) {
    return "Definindo direção criativa e composição visual…";
  }

  if (/"slides"/i.test(trimmed)) {
    return "Estruturando os slides do post…";
  }

  if (/"html"/i.test(trimmed) || /"caption"/i.test(trimmed)) {
    return "Montando legenda e HTML dos slides…";
  }

  return "";
}
