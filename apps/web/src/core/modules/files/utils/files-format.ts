const sizeUnits = ["B", "KB", "MB", "GB", "TB"] as const;

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    sizeUnits.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${sizeUnits[unitIndex]}`;
};

export const inferFileKind = (fileName: string): "video" | "doc" | "image" => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(extension)) {
    return "video";
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "image";
  }

  return "doc";
};

export const inferFileKindFromMime = (
  mimeType: string,
  fileName: string,
): "video" | "doc" | "image" => {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "video";
  return inferFileKind(fileName);
};

export const formatIsoDate = (isoDate: string) => {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  });

  return formatter.format(new Date(isoDate)).replace(".", "");
};

export const formatUploadDate = () => formatIsoDate(new Date().toISOString());
