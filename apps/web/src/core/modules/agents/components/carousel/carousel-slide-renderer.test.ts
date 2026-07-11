import { buildCarouselSlideSrcDoc } from "./carousel-slide-renderer";

describe("buildCarouselSlideSrcDoc", () => {
  it("hoists @import rules before other CSS so Google Fonts load in the editor iframe", () => {
    const srcDoc = buildCarouselSlideSrcDoc({
      id: "slide_1",
      order: 1,
      htmlContent: '<div class="slide"><h1>Title</h1></div>',
      cssContent:
        '@import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap");.slide h1{font-family:"Bebas Neue",sans-serif;}',
    });

    const importIndex = srcDoc.indexOf('@import url("https://fonts.googleapis.com/css2?family=Bebas+Neue');
    const resetIndex = srcDoc.indexOf("*{margin:0");

    expect(importIndex).toBeGreaterThan(-1);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(importIndex).toBeLessThan(resetIndex);
  });
});
