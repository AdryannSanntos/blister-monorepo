"use client";

import type {
  AdminMarketplaceItemDto,
  MarketplaceItemType,
  UpsertMarketplaceItemDto,
} from "@company-os/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "src/core/shared/components/ui/button";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Input } from "src/core/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { z } from "zod";

import {
  useCreateMarketplaceItem,
  useUpdateMarketplaceItem,
} from "../hooks/use-marketplace-admin";
import {
  MARKETPLACE_TYPES,
  useMarketplaceTypes,
} from "../hooks/use-marketplace";
import { getMarketplaceTypeLabelKey } from "../utils/marketplace-catalog.utils";

type FormValues = {
  slug: string;
  type: MarketplaceItemType;
  name: string;
  author: string;
  price: number;
  flag: string;
  description: string;
  palette: string;
  includes: string;
  refId: string;
  isActive: boolean;
  specsJson: string;
};

type MarketplaceAdminItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AdminMarketplaceItemDto;
};

const MARKETPLACE_ITEM_TYPES = MARKETPLACE_TYPES.filter(
  (entry) => entry.id !== "all",
).map((entry) => entry.id) as MarketplaceItemType[];

const DEFAULT_TYPE = MARKETPLACE_ITEM_TYPES[0] ?? "pack";

const parseSpecsJson = (value: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toFormValues = (item?: AdminMarketplaceItemDto): FormValues => ({
  slug: item?.slug ?? "",
  type: item?.type ?? DEFAULT_TYPE,
  name: item?.name ?? "",
  author: item?.author ?? "",
  price: item?.price ?? 0,
  flag: item?.flag ?? "",
  description: item?.description ?? "",
  palette: item?.palette.join(", ") ?? "",
  includes: item?.includes.join("\n") ?? "",
  refId: item?.refId ?? "",
  isActive: item?.isActive ?? true,
  specsJson: JSON.stringify(item?.specs ?? {}, null, 2),
});

const toPayload = (values: FormValues): UpsertMarketplaceItemDto => {
  const specs = parseSpecsJson(values.specsJson) ?? {};

  return {
    slug: values.slug.trim(),
    type: values.type,
    name: values.name.trim(),
    author: values.author.trim(),
    price: values.price,
    flag: values.flag.trim() ? values.flag.trim() : null,
    description: values.description,
    palette: values.palette
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    includes: values.includes
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean),
    refId: values.refId.trim() ? values.refId.trim() : null,
    isActive: values.isActive,
    specs,
  };
};

export function MarketplaceAdminItemDialog({
  open,
  onOpenChange,
  item,
}: MarketplaceAdminItemDialogProps) {
  const isEditing = Boolean(item);
  const createItem = useCreateMarketplaceItem();
  const updateItem = useUpdateMarketplaceItem();
  const types = useMarketplaceTypes();
  const t = useTranslations("marketplaceAdmin");
  const tMarketplace = useTranslations("marketplace");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");

  const schema = useMemo(
    () =>
      z.object({
        slug: z
          .string()
          .min(1, tValidation("nameMin"))
          .regex(/^[a-z0-9-]+$/, tValidation("nameMin")),
        type: z.enum(
          MARKETPLACE_ITEM_TYPES as [
            MarketplaceItemType,
            ...MarketplaceItemType[],
          ],
        ),
        name: z.string().min(1, tValidation("nameMin")),
        author: z.string().min(1, tValidation("nameMin")),
        price: z.number().int().nonnegative(),
        flag: z.string(),
        description: z.string(),
        palette: z.string(),
        includes: z.string(),
        refId: z.string(),
        isActive: z.boolean(),
        specsJson: z
          .string()
          .refine((value) => parseSpecsJson(value) !== null, t("specsJsonError")),
      }),
    [t, tValidation],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: toFormValues(item),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(item));
    }
  }, [open, item, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(toFormValues(item));
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (values: FormValues) => {
    const payload = toPayload(values);

    try {
      if (isEditing && item) {
        await updateItem.mutateAsync({ id: item.id, payload });
        toast.success(t("updateSuccess"));
      } else {
        await createItem.mutateAsync(payload);
        toast.success(t("createSuccess"));
      }
      handleOpenChange(false);
    } catch {
      toast.error(t("saveFailed"));
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;
  const typeOptions = types.filter((entry) => entry.id !== "all");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="animate-in fade-in zoom-in-95 flex max-h-[90vh] flex-col sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editItem") : t("createItem")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t("slug")}</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t("typeColumn")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {typeOptions.map((entry) => (
                            <SelectItem key={entry.id} value={entry.id}>
                              {tMarketplace(getMarketplaceTypeLabelKey(entry.id))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t("nameColumn")}</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t("author")}</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t("priceColumn")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          autoComplete="off"
                          value={field.value}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          onChange={(event) => {
                            const nextValue = Number.parseInt(
                              event.target.value,
                              10,
                            );
                            field.onChange(
                              Number.isFinite(nextValue) ? nextValue : 0,
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("flag")}</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("descriptionField")}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="palette"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("palette")}</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="off"
                        placeholder="#ff00aa, #00ffcc"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("includes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("refId")}</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specsJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("specsJson")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={6}
                        className="font-mono text-[12px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">{t("isActive")}</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t("saveItem")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
