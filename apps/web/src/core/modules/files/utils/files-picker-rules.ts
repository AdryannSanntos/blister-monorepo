import type { FileEntry } from "../types/files.types";

export type FilePickerBlockReason = "failed" | "processing" | "filtered";

export type FilePickerValidation = {
  selectable: boolean;
  reason?: FilePickerBlockReason;
};

type ValidatePickerFileOptions = {
  filterFile?: (file: FileEntry) => boolean;
};

export const validatePickerFile = (
  file: FileEntry,
  options?: ValidatePickerFileOptions,
): FilePickerValidation => {
  if (options?.filterFile && !options.filterFile(file)) {
    return { selectable: false, reason: "filtered" };
  }

  if (file.status === "failed") {
    return { selectable: false, reason: "failed" };
  }

  if (file.status === "processing" || file.status === "pending") {
    return { selectable: false, reason: "processing" };
  }

  return { selectable: true };
};

export const isPickerFileSelectable = (
  file: FileEntry,
  options?: ValidatePickerFileOptions,
) => validatePickerFile(file, options).selectable;

export const isVideoFileForCuts = (file: FileEntry) => file.kind === "video";
