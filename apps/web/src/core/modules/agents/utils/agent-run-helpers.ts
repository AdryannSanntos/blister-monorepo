import type {
  AgentRunStatus,
  AgentRunStatusDto,
  ReviewStatus,
} from "@company-os/types";

export function normalizeReviewStatus(
  status: string | null | undefined,
): ReviewStatus | null {
  if (!status) return null;
  if (status === "PENDING") return "PENDING_REVIEW";
  if (
    status === "PENDING_REVIEW" ||
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "EDITED"
  ) {
    return status;
  }
  return null;
}

export function getRunUserInput(run: AgentRunStatusDto): string {
  const input = run.inputPayload.userInput;
  return typeof input === "string" ? input : "";
}

export function isRunActive(status: AgentRunStatus): boolean {
  return status === "QUEUED" || status === "RUNNING" || status === "PAUSED";
}

export function canReviewRun(run: AgentRunStatusDto): boolean {
  const reviewStatus =
    normalizeReviewStatus(run.reviewStatus) ??
    normalizeReviewStatus(
      typeof run.outputPayload.reviewStatus === "string"
        ? run.outputPayload.reviewStatus
        : null,
    );

  return (
    run.status === "COMPLETED" &&
    (reviewStatus === "PENDING_REVIEW" ||
      reviewStatus === "EDITED" ||
      reviewStatus === null)
  );
}

export function getReviewStatusLabelKey(
  status: ReviewStatus | null,
):
  | "reviewPending"
  | "reviewApproved"
  | "reviewRejected"
  | "reviewEdited"
  | null {
  switch (status) {
    case "PENDING_REVIEW":
      return "reviewPending";
    case "APPROVED":
      return "reviewApproved";
    case "REJECTED":
      return "reviewRejected";
    case "EDITED":
      return "reviewEdited";
    default:
      return null;
  }
}
