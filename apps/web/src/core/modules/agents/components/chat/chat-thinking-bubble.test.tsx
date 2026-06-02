import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChatThinkingBubble } from "./chat-thinking-bubble";

describe("ChatThinkingBubble", () => {
  it("renders a plain animated loading message without icons", () => {
    render(<ChatThinkingBubble />);

    expect(screen.getByText("Pensando...")).toBeInTheDocument();
    expect(screen.getByTestId("chat-thinking-bubble")).toHaveClass(
      "rounded-an-message",
      "bg-an-user-message-bg",
    );
    expect(screen.queryByTestId("spiral-loader")).not.toBeInTheDocument();
  });
});
