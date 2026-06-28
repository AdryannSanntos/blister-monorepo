"use client";

import { useCallback, useReducer, useRef } from "react";

import type {
  CarouselDesignPlan,
  CarouselIdeaOption,
  CarouselOutput,
  CarouselSlideContent,
  CarouselSlideDesign,
} from "@company-os/types";
import {
  CAROUSEL_DESIGN_PLAN_FIXTURE,
  CAROUSEL_IDEAS_FIXTURE,
  CAROUSEL_OUTPUT_FIXTURE,
  CAROUSEL_SLIDE_CONTENTS_FIXTURE,
} from "src/core/modules/blister-os/fixtures/carousel-runs.fixture";

export type CarouselPhaseStatus =
  | "idle"
  | "processing"
  | "awaiting_action"
  | "completed"
  | "error";

type State = {
  ideas: {
    status: CarouselPhaseStatus;
    data: CarouselIdeaOption[];
    selectedId: string | null;
  };
  content: {
    status: CarouselPhaseStatus;
    data: CarouselSlideContent[];
  };
  design: {
    status: CarouselPhaseStatus;
    data: CarouselDesignPlan | null;
    imageUploads: Record<string, string>;
  };
  preview: {
    status: CarouselPhaseStatus;
    data: CarouselOutput | null;
    isExporting: boolean;
  };
};

type Action =
  | { type: "SELECT_IDEA"; id: string }
  | { type: "CONTENT_READY"; data: CarouselSlideContent[] }
  | { type: "APPROVE_CONTENT"; data: CarouselSlideContent[] }
  | { type: "REJECT_CONTENT" }
  | { type: "DESIGN_READY"; data: CarouselDesignPlan }
  | { type: "APPROVE_DESIGN"; plan: CarouselDesignPlan; imageUploads: Record<string, string> }
  | { type: "REJECT_DESIGN" }
  | { type: "PREVIEW_READY"; data: CarouselOutput }
  | { type: "SET_IMAGE_UPLOAD"; slideId: string; url: string }
  | { type: "START_EXPORT" }
  | { type: "EXPORT_DONE" };

const initialState: State = {
  ideas: {
    status: "awaiting_action",
    data: CAROUSEL_IDEAS_FIXTURE,
    selectedId: null,
  },
  content: { status: "idle", data: [] },
  design: { status: "idle", data: null, imageUploads: {} },
  preview: { status: "idle", data: null, isExporting: false },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SELECT_IDEA":
      return {
        ...state,
        ideas: { ...state.ideas, status: "completed", selectedId: action.id },
        content: { ...state.content, status: "processing" },
      };
    case "CONTENT_READY":
      return {
        ...state,
        content: { status: "awaiting_action", data: action.data },
      };
    case "APPROVE_CONTENT":
      return {
        ...state,
        content: { ...state.content, status: "completed", data: action.data },
        design: { ...state.design, status: "processing" },
      };
    case "REJECT_CONTENT":
      return {
        ...state,
        content: { ...state.content, status: "processing" },
      };
    case "DESIGN_READY":
      return {
        ...state,
        design: { ...state.design, status: "awaiting_action", data: action.data },
      };
    case "APPROVE_DESIGN":
      return {
        ...state,
        design: {
          status: "completed",
          data: action.plan,
          imageUploads: action.imageUploads,
        },
        preview: { status: "processing", data: null, isExporting: false },
      };
    case "REJECT_DESIGN":
      return {
        ...state,
        design: { ...state.design, status: "processing" },
      };
    case "PREVIEW_READY":
      return {
        ...state,
        preview: { status: "completed", data: action.data, isExporting: false },
      };
    case "SET_IMAGE_UPLOAD":
      return {
        ...state,
        design: {
          ...state.design,
          imageUploads: {
            ...state.design.imageUploads,
            [action.slideId]: action.url,
          },
        },
      };
    case "START_EXPORT":
      return {
        ...state,
        preview: { ...state.preview, isExporting: true },
      };
    case "EXPORT_DONE":
      return {
        ...state,
        preview: { ...state.preview, isExporting: false },
      };
    default:
      return state;
  }
}

const PROCESSING_DELAY_MS = 1800;
const PREVIEW_DELAY_MS = 2400;

export const useCarouselRunDetail = (_runId: string) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scheduleDispatch = useCallback(
    (action: Action, delay: number) => {
      const timer = setTimeout(() => {
        dispatch(action);
        timersRef.current = timersRef.current.filter((t) => t !== timer);
      }, delay);
      timersRef.current.push(timer);
    },
    [],
  );

  const selectIdea = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT_IDEA", id });
      scheduleDispatch(
        { type: "CONTENT_READY", data: CAROUSEL_SLIDE_CONTENTS_FIXTURE },
        PROCESSING_DELAY_MS,
      );
    },
    [scheduleDispatch],
  );

  const approveContent = useCallback(
    (data: CarouselSlideContent[]) => {
      dispatch({ type: "APPROVE_CONTENT", data });
      scheduleDispatch(
        { type: "DESIGN_READY", data: CAROUSEL_DESIGN_PLAN_FIXTURE },
        PROCESSING_DELAY_MS,
      );
    },
    [scheduleDispatch],
  );

  const rejectContent = useCallback(() => {
    dispatch({ type: "REJECT_CONTENT" });
    scheduleDispatch(
      { type: "CONTENT_READY", data: CAROUSEL_SLIDE_CONTENTS_FIXTURE },
      PROCESSING_DELAY_MS,
    );
  }, [scheduleDispatch]);

  const setImageUpload = useCallback((slideId: string, url: string) => {
    dispatch({ type: "SET_IMAGE_UPLOAD", slideId, url });
  }, []);

  const approveDesign = useCallback(
    (plan: CarouselDesignPlan, imageUploads: Record<string, string>) => {
      dispatch({ type: "APPROVE_DESIGN", plan, imageUploads });
      scheduleDispatch(
        { type: "PREVIEW_READY", data: CAROUSEL_OUTPUT_FIXTURE },
        PREVIEW_DELAY_MS,
      );
    },
    [scheduleDispatch],
  );

  const rejectDesign = useCallback(() => {
    dispatch({ type: "REJECT_DESIGN" });
    scheduleDispatch(
      { type: "DESIGN_READY", data: CAROUSEL_DESIGN_PLAN_FIXTURE },
      PROCESSING_DELAY_MS,
    );
  }, [scheduleDispatch]);

  const requestExport = useCallback(() => {
    dispatch({ type: "START_EXPORT" });
    setTimeout(() => dispatch({ type: "EXPORT_DONE" }), 2000);
  }, []);

  return {
    ideas: state.ideas,
    content: state.content,
    design: state.design,
    preview: state.preview,
    actions: {
      selectIdea,
      approveContent,
      rejectContent,
      setImageUpload,
      approveDesign,
      rejectDesign,
      requestExport,
    },
  };
};
