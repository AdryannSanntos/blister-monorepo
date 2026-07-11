"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "src/core/shared/components/ui/button";
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
import { Paragraph } from "src/core/shared/components/ui/paragraph";

import {
  type CreateCompanyResult,
  useCreateCompany,
} from "../hooks/use-platform-companies-admin";

const createCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  ownerEmail: z.string().email("Email inválido"),
  ownerName: z.string().min(2).optional().or(z.literal("")),
});

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;

type CreateCompanyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateCompanyDialog({ open, onOpenChange }: CreateCompanyDialogProps) {
  const t = useTranslations("platformAdmin.companiesPage");
  const [createdInvite, setCreatedInvite] = useState<CreateCompanyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { mutateAsync, isPending } = useCreateCompany();

  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      ownerEmail: "",
      ownerName: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setCreatedInvite(null);
      setCopied(false);
      form.reset();
    }
  }, [open, form]);

  const handleCopyLink = async () => {
    if (!createdInvite?.firstAccessUrl) return;

    await navigator.clipboard.writeText(createdInvite.firstAccessUrl);
    setCopied(true);
    toast.success(t("copyLinkSuccess"));
  };

  const handleSubmit = async (data: CreateCompanyFormValues) => {
    try {
      const result = await mutateAsync(data);
      setCreatedInvite(result);
      setCopied(false);
      toast.success(
        t("createSuccess", {
          company: result.company.name,
          email: result.owner.email,
        }),
      );
      form.reset();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t("createError");
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5" />
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
          </div>
          <DialogDescription>{t("createDialogDescription")}</DialogDescription>
        </DialogHeader>

        {createdInvite?.firstAccessUrl ? (
          <div className="flex flex-col gap-4">
            <Input
              readOnly
              value={createdInvite.firstAccessUrl}
              aria-label={t("firstAccessLinkLabel")}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={handleCopyLink}>
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? t("copied") : t("copyLink")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreatedInvite(null)}
              >
                {t("closeLinkPanel")}
              </Button>
            </div>
            <Paragraph size="p6" tone="tertiary">
              {t("createdCompanyHint", { name: createdInvite.company.name })}
            </Paragraph>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyNameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("companyNamePlaceholder")} autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ownerEmailLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("ownerEmailPlaceholder")}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ownerNameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("ownerNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t("creating") : t("createSubmit")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
