"use client";

import { useTranslations } from "next-intl";

import { FileDropzone } from "src/core/shared/components/blister/file-dropzone";
import { Button } from "src/core/shared/components/ui/button";
import { Checkbox } from "src/core/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Label } from "src/core/shared/components/ui/label";

type FilesUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractOnUpload: boolean;
  onExtractChange: (value: boolean) => void;
  onFileSelect: (file: File) => void;
};

export const FilesUploadDialog = ({
  open,
  onOpenChange,
  extractOnUpload,
  onExtractChange,
  onFileSelect,
}: FilesUploadDialogProps) => {
  const t = useTranslations("files");

  const handleFileSelect = (file: File) => {
    onFileSelect(file);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("uploadTitle")}</DialogTitle>
        </DialogHeader>

        <FileDropzone
          onFileSelect={handleFileSelect}
          accept="video/*,image/*,.pdf,.md,.txt,.doc,.docx"
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="extract-data-upload"
            checked={extractOnUpload}
            onCheckedChange={(checked) => onExtractChange(checked === true)}
          />
          <Label htmlFor="extract-data-upload">{t("extractData")}</Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
