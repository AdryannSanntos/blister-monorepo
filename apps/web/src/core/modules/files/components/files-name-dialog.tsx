"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Input } from "src/core/shared/components/ui/input";
import { Label } from "src/core/shared/components/ui/label";

type FilesNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: string;
  placeholder: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
};

export const FilesNameDialog = ({
  open,
  onOpenChange,
  title,
  initialValue = "",
  placeholder,
  confirmLabel,
  onConfirm,
}: FilesNameDialogProps) => {
  const t = useTranslations("files");
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [initialValue, open]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="files-name-input">{placeholder}</Label>
          <Input
            id="files-name-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleConfirm();
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
