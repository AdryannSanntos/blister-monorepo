"use client";

import { buildImageUploadKey } from "@company-os/types";
import { useMutation } from "@tanstack/react-query";

import { useUploadWorkspaceFile } from "src/core/modules/files/hooks/use-files-api";

export type CarouselImageUploadInput = {
  file: File;
  slideId: string;
  slotKey: string;
  onProgress?: (percent: number) => void;
};

export type CarouselImageUploadResult = {
  uploadKey: string;
  fileId: string;
};

export const useCarouselImageUpload = () => {
  const uploadFile = useUploadWorkspaceFile();

  return useMutation<CarouselImageUploadResult, Error, CarouselImageUploadInput>({
    mutationFn: async ({ file, slideId, slotKey, onProgress }) => {
      const uploadKey = buildImageUploadKey(slideId, slotKey);
      const registered = await uploadFile.mutateAsync({
        file,
        extractData: false,
        onProgress,
      });
      return { uploadKey, fileId: registered.id };
    },
  });
};

export { buildImageUploadKey };
