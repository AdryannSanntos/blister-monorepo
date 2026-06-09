import { expect, test } from "./fixtures/auth";

const AGENT_ROUTES = [
  {
    id: "strategist",
    title: "Planejar conteúdo",
    suggestion: "Plano de conteúdo para lançamento de produto",
    placeholder: /Dia das Mães/i,
  },
  {
    id: "copywriter",
    title: "Criar texto",
    suggestion: "Legenda para promoção relâmpago",
    placeholder: /bolo de cenoura/i,
  },
  {
    id: "designer",
    title: "Gerar imagem",
    suggestion: "Arte para promoção de fim de semana",
    placeholder: /lançamento/i,
  },
  {
    id: "post",
    title: "Criar post completo",
    suggestion: "Post completo para lançamento de produto",
    placeholder: /post completo/i,
  },
] as const;

test.describe("Agent surface chat layout", () => {
  for (const agent of AGENT_ROUTES) {
    test(`${agent.id} shows organized chat shell`, async ({
      authenticatedPage: page,
    }) => {
      await page.goto(`/dashboard/agents/${agent.id}`);

      const surface = page.getByTestId("agent-surface-page");
      await expect(surface).toBeVisible();
      await expect(page.getByRole("heading", { name: agent.title })).toHaveCount(
        1,
      );

      const emptyState = page.getByTestId("agent-chat-empty-state");
      const composer = page.getByTestId("agent-chat-composer");
      const suggestions = page.getByTestId("agent-suggestion-cards");
      const input = composer.getByRole("textbox");

      await expect(emptyState).toBeVisible();
      await expect(composer).toBeVisible();
      await expect(suggestions).toBeVisible();
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute(
        "placeholder",
        expect.stringMatching(agent.placeholder),
      );

      const emptyBox = await emptyState.boundingBox();
      const composerBox = await composer.boundingBox();
      const suggestionBox = await suggestions.boundingBox();
      const inputBox = await input.boundingBox();

      expect(emptyBox).not.toBeNull();
      expect(composerBox).not.toBeNull();
      expect(suggestionBox).not.toBeNull();
      expect(inputBox).not.toBeNull();

      expect(emptyBox!.y + emptyBox!.height).toBeLessThan(composerBox!.y);
      expect(suggestionBox!.y).toBeGreaterThanOrEqual(composerBox!.y);
      expect(suggestionBox!.y + suggestionBox!.height).toBeLessThanOrEqual(
        inputBox!.y + 4,
      );
      await expect(page.getByRole("tab", { name: "Agente" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Histórico" })).toBeVisible();
      await expect(
        page.getByText(/Custo estimado|Estimated cost/i),
      ).toBeVisible();
    });
  }

  test("strategist tabs switch between chat and history", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/strategist");

    await expect(page.getByTestId("agent-chat-tab")).toBeVisible();
    await expect(page.getByTestId("agent-chat-composer")).toBeVisible();

    await page.getByRole("tab", { name: "Histórico" }).click();
    await expect(page).toHaveURL(/tab=history/);
    await expect(page.getByTestId("agent-history-tab")).toBeVisible();
    await expect(page.getByTestId("agent-chat-composer")).toHaveCount(0);

    await page.getByRole("tab", { name: "Agente" }).click();
    await expect(page.getByTestId("agent-chat-composer")).toBeVisible();
  });

  test("suggestion click fills composer proximity and keeps single input", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/agents/strategist");

    const suggestion = page.getByRole("button", {
      name: "Plano de conteúdo para lançamento de produto",
    });
    await expect(suggestion).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(1);

    const composer = page.getByTestId("agent-chat-composer");
    const suggestionBox = await suggestion.boundingBox();
    const composerBox = await composer.boundingBox();

    expect(suggestionBox!.y).toBeGreaterThanOrEqual(composerBox!.y);
  });
});
