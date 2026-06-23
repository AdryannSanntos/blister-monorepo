import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export {
  DISPLAY_FILENAME_MAX_CHARS,
  truncateWithEllipsis,
} from "./truncate-with-ellipsis";
