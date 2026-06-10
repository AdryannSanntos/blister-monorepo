"use client";

import { Component, type ReactNode } from "react";

type ChatErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type ChatErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Guards the message list so a single malformed block/part can't take down the
 * whole chat surface. Resets when the message list identity changes.
 */
export class ChatErrorBoundary extends Component<
  ChatErrorBoundaryProps,
  ChatErrorBoundaryState
> {
  state: ChatErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChatErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("[agent-chat] render error", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
