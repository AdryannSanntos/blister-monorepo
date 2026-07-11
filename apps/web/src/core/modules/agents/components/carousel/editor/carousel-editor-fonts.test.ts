import {
  buildGoogleFontStylesheetUrl,
  CAROUSEL_EDITOR_FONT_FAMILIES,
  CAROUSEL_EDITOR_FONTS,
  collectFontFamiliesFromCss,
  collectFontFamiliesFromHtml,
  extractFontFamilyName,
  formatFontFamilyCss,
  injectFontIntoDoc,
  injectFontIntoPage,
  preloadCarouselEditorFonts,
  resolveCarouselEditorFont,
} from "./carousel-editor-fonts";

describe("carousel-editor-fonts", () => {
  it("builds valid Google Fonts URLs for single-weight display fonts", () => {
    const bebas = resolveCarouselEditorFont("Bebas Neue");
    expect(buildGoogleFontStylesheetUrl(bebas!)).toBe(
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
    );
  });

  it("builds variable-axis URLs for Inter", () => {
    const inter = resolveCarouselEditorFont("Inter");
    expect(buildGoogleFontStylesheetUrl(inter!)).toContain("Inter:ital,wght@");
  });

  it("quotes multi-word families in CSS values", () => {
    expect(formatFontFamilyCss("Plus Jakarta Sans")).toBe(
      '"Plus Jakarta Sans", sans-serif',
    );
    expect(formatFontFamilyCss("Times New Roman")).toBe(
      '"Times New Roman", Times, serif',
    );
  });

  it("extracts the first font from a CSS font stack", () => {
    expect(extractFontFamilyName('"Playfair Display", Georgia, serif')).toBe(
      "Playfair Display",
    );
  });

  it("collects families declared in slide CSS and inline HTML", () => {
    const css = '.title { font-family: "Bebas Neue", sans-serif; }';
    const html = '<p style="font-family: Inter, sans-serif">Hi</p>';

    expect(collectFontFamiliesFromCss(css)).toEqual(["Bebas Neue"]);
    expect(collectFontFamiliesFromHtml(html)).toEqual(["Inter"]);
  });

  it("includes every curated font in the picker catalog", () => {
    expect(CAROUSEL_EDITOR_FONT_FAMILIES).toHaveLength(CAROUSEL_EDITOR_FONTS.length);
    expect(CAROUSEL_EDITOR_FONT_FAMILIES).toContain("Source Sans 3");
    expect(CAROUSEL_EDITOR_FONT_FAMILIES).toContain("Archivo Black");
  });
});

describe("carousel-editor-font injection", () => {
  it("injects one stylesheet per font into a document", () => {
    const doc = document.implementation.createHTMLDocument("carousel-slide");
    injectFontIntoDoc(doc, "Bebas Neue");
    injectFontIntoDoc(doc, "Bebas Neue");

    const links = doc.head.querySelectorAll('link[data-carousel-font="Bebas Neue"]');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toContain("family=Bebas+Neue");
  });

  it("preloads multiple fonts", () => {
    const doc = document.implementation.createHTMLDocument("carousel-slide");
    preloadCarouselEditorFonts(doc, ["Inter", "Pacifico", "Arial"]);

    expect(doc.head.querySelectorAll("link[data-carousel-font]")).toHaveLength(2);
  });

  it("injects fonts into the outer page for dropdown previews", () => {
    const before = document.head.querySelectorAll('link[data-carousel-font="Oswald"]').length;
    injectFontIntoPage("Oswald");
    injectFontIntoPage("Oswald");
    const after = document.head.querySelectorAll('link[data-carousel-font="Oswald"]').length;

    expect(after).toBe(before + 1);
  });
});
