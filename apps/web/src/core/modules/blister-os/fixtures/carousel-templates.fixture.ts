export type CarouselTemplateFixture = {
  id: string;
  name: string;
  description: string;
  thumbnailColor: string;
};

export const CAROUSEL_TEMPLATES_FIXTURE: CarouselTemplateFixture[] = [
  {
    id: "editorial-performance",
    name: "Editorial Performance",
    description:
      "Capas dramáticas, slides editoriais claros, acento laranja e barra de progresso fixa",
    thumbnailColor: "#ff4a0a",
  },
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    description: "Layout minimalista com tipografia bold",
    thumbnailColor: "#0a0a0a",
  },
  {
    id: "content-machine",
    name: "Content Machine",
    description:
      "Editorial com header triplo, serif/sans e card de destaque — cor da marca configurável",
    thumbnailColor: "#050510",
  },
];
