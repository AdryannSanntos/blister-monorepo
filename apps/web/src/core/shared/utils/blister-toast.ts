import {
  toast as sonnerToast,
  type ExternalToast,
} from "sonner";

const DEFAULT_OPTIONS = {
  duration: 4_500,
} satisfies ExternalToast;

const withDefaults = (options?: ExternalToast): ExternalToast => ({
  ...DEFAULT_OPTIONS,
  ...options,
});

type ToastVariant = "success" | "error" | "info" | "warning" | "loading";

/**
 * Blister toast API — wraps Sonner with design-system defaults.
 * Use `title` + `description` for long dynamic values (file names, IDs, etc.).
 */
export const toast = Object.assign(
  (message: string, options?: ExternalToast) =>
    sonnerToast(message, withDefaults(options)),
  {
    success: (message: string, options?: ExternalToast) =>
      sonnerToast.success(message, withDefaults(options)),
    error: (message: string, options?: ExternalToast) =>
      sonnerToast.error(message, withDefaults(options)),
    info: (message: string, options?: ExternalToast) =>
      sonnerToast.info(message, withDefaults(options)),
    warning: (message: string, options?: ExternalToast) =>
      sonnerToast.warning(message, withDefaults(options)),
    loading: (message: string, options?: ExternalToast) =>
      sonnerToast.loading(message, withDefaults(options)),
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    custom: sonnerToast.custom,
    message: sonnerToast.message,

    /** Short title + clamped detail — ideal for file names and long values. */
    detail: (
      title: string,
      detail: string,
      variant: ToastVariant = "success",
      options?: ExternalToast,
    ) => sonnerToast[variant](title, withDefaults({ description: detail, ...options })),
  },
);

export type { ExternalToast };
