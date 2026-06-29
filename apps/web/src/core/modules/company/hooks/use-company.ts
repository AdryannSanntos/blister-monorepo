"use client";
import type {
  CompanyResponse,
  FileUploadResponse,
  OnboardingDto,
  PresignedUploadRequest,
  PresignedUploadResponse,
  UpdateCompanyDto,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export function useCompany() {
  return useQuery<CompanyResponse>({
    queryKey: ["company"],
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyResponse>("/company");
      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useOnboardingStatus() {
  return useQuery<{ completed: boolean }>({
    queryKey: ["company", "onboarding-status"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ completed: boolean }>(
        "/company/onboarding-status",
      );
      return data;
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation<CompanyResponse, Error, OnboardingDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<CompanyResponse>(
        "/company/onboarding",
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({
        queryKey: ["company", "onboarding-status"],
      });
      queryClient.invalidateQueries({
        queryKey: ["companies", "home-destination"],
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation<CompanyResponse, Error, UpdateCompanyDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch<CompanyResponse>("/company", dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function usePresignedUpload() {
  return useMutation<PresignedUploadResponse, Error, PresignedUploadRequest>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<PresignedUploadResponse>(
        "/storage/presigned-upload",
        dto,
      );
      return data;
    },
  });
}

export function useUploadFile() {
  return useMutation<FileUploadResponse, Error, { file: File; keyHint: string }>({
    mutationFn: async ({ file, keyHint }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("keyHint", keyHint);

      const { data } = await apiClient.post<FileUploadResponse>(
        "/storage/upload",
        formData,
        {
          // Let axios set multipart boundary; manual Content-Type breaks parsing.
          headers: { "Content-Type": undefined },
        },
      );
      return data;
    },
  });
}
