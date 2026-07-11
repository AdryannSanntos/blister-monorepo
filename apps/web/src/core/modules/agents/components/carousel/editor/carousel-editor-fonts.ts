export type CarouselEditorFont = {
  family: string;
  category: "system" | "google";
  /** Google Fonts css2 query string (without base URL or display=swap). */
  googleQuery?: string;
  cssFallback: string;
};

const system = (family: string, cssFallback: string): CarouselEditorFont => ({
  family,
  category: "system",
  cssFallback,
});

const google = (
  family: string,
  googleQuery: string,
  cssFallback = "sans-serif",
): CarouselEditorFont => ({
  family,
  category: "google",
  googleQuery,
  cssFallback,
});

export const CAROUSEL_EDITOR_FONTS: CarouselEditorFont[] = [
  system("Arial", "Arial, Helvetica, sans-serif"),
  system("Georgia", "Georgia, serif"),
  system("Verdana", "Verdana, Geneva, sans-serif"),
  system("Times New Roman", '"Times New Roman", Times, serif'),
  system("Courier New", '"Courier New", Courier, monospace'),
  system("Trebuchet MS", '"Trebuchet MS", Helvetica, sans-serif'),

  google("Inter", "family=Inter:ital,wght@0,100..900;1,100..900"),
  google("Roboto", "family=Roboto:ital,wght@0,100..900;1,100..900"),
  google("Open Sans", "family=Open+Sans:ital,wght@0,300..800;1,300..800"),
  google("Lato", "family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900"),
  google("Montserrat", "family=Montserrat:ital,wght@0,100..900;1,100..900"),
  google("Oswald", "family=Oswald:wght@200..700"),
  google("Raleway", "family=Raleway:ital,wght@0,100..900;1,100..900"),
  google("Poppins", "family=Poppins:ital,wght@0,100..900;1,100..900"),
  google("Nunito", "family=Nunito:ital,wght@0,200..1000;1,200..1000"),
  google("Source Sans 3", "family=Source+Sans+3:ital,wght@0,200..900;1,200..900"),
  google("Playfair Display", "family=Playfair+Display:ital,wght@0,400..900;1,400..900", "serif"),
  google(
    "Merriweather",
    "family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900",
    "serif",
  ),
  google("DM Sans", "family=DM+Sans:ital,wght@0,100..1000;1,100..1000"),
  google("Space Grotesk", "family=Space+Grotesk:wght@300..700"),
  google("Bebas Neue", "family=Bebas+Neue"),
  google("Anton", "family=Anton"),
  google("Permanent Marker", "family=Permanent+Marker", "cursive"),
  google("Pacifico", "family=Pacifico", "cursive"),
  google("Dancing Script", "family=Dancing+Script:wght@400..700", "cursive"),
  google("Lobster", "family=Lobster", "cursive"),
  google("Righteous", "family=Righteous"),
  google("Archivo Black", "family=Archivo+Black"),
  google("Barlow", "family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900"),
  google("Figtree", "family=Figtree:ital,wght@0,300..900;1,300..900"),
  google("Plus Jakarta Sans", "family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800"),
  google("Outfit", "family=Outfit:wght@100..900"),
  google("Sora", "family=Sora:wght@100..800"),
  google("Manrope", "family=Manrope:wght@200..800"),
  google("Libre Baskerville", "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400;1,700", "serif"),
  google("EB Garamond", "family=EB+Garamond:ital,wght@0,400..800;1,400..800", "serif"),
  google("Cormorant Garamond", "family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700", "serif"),
  google("IBM Plex Sans", "family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700"),
  google("Fraunces", "family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900", "serif"),
  google("Archivo", "family=Archivo:ital,wght@0,100..900;1,100..900"),
];

const FONT_BY_FAMILY = new Map(
  CAROUSEL_EDITOR_FONTS.map((font) => [font.family.toLowerCase(), font]),
);

export const CAROUSEL_EDITOR_FONT_FAMILIES = CAROUSEL_EDITOR_FONTS.map((font) => font.family);

export const resolveCarouselEditorFont = (fontName: string): CarouselEditorFont | undefined => {
  const trimmed = fontName.trim();
  if (!trimmed) return undefined;

  const direct = FONT_BY_FAMILY.get(trimmed.toLowerCase());
  if (direct) return direct;

  const unquoted = trimmed.replace(/^['"]|['"]$/g, "");
  return FONT_BY_FAMILY.get(unquoted.toLowerCase());
};

export const buildGoogleFontStylesheetUrl = (font: CarouselEditorFont): string | null => {
  if (font.category !== "google" || !font.googleQuery) return null;
  return `https://fonts.googleapis.com/css2?${font.googleQuery}&display=swap`;
};

export const formatFontFamilyCss = (fontName: string): string => {
  const resolved = resolveCarouselEditorFont(fontName);
  if (resolved) {
    if (resolved.cssFallback.includes(",")) {
      return resolved.cssFallback;
    }

    const quotedFamily = resolved.family.includes(" ")
      ? `"${resolved.family}"`
      : resolved.family;
    return `${quotedFamily}, ${resolved.cssFallback}`;
  }

  const cleaned = fontName.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned) return "Arial, sans-serif";

  const quoted = cleaned.includes(" ") ? `"${cleaned}"` : cleaned;
  return `${quoted}, sans-serif`;
};

const injectStylesheet = (doc: Document, href: string, marker: string) => {
  if (doc.querySelector(`link[data-carousel-font="${marker}"]`)) return;

  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-carousel-font", marker);
  doc.head.appendChild(link);
};

export const injectFontIntoDoc = (doc: Document, fontName: string) => {
  const font = resolveCarouselEditorFont(fontName);
  if (!font || font.category !== "google") return;

  const href = buildGoogleFontStylesheetUrl(font);
  if (!href) return;

  injectStylesheet(doc, href, font.family);
};

export const injectFontIntoPage = (fontName: string) => {
  injectFontIntoDoc(document, fontName);
};

export const applyFontFamilyToElement = (element: HTMLElement, fontName: string) => {
  element.style.fontFamily = formatFontFamilyCss(fontName);
};

export const extractFontFamilyName = (value: string | null | undefined): string => {
  if (!value) return "Arial";

  const first = value
    .split(",")[0]
    ?.trim()
    .replace(/^['"]|['"]$/g, "");

  return first || "Arial";
};

const FONT_FAMILY_PATTERN =
  /font-family\s*:\s*([^;}"']+(?:["'][^"']+["'][^;}"']*)*)/gi;

export const collectFontFamiliesFromCss = (css: string): string[] => {
  const families = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = FONT_FAMILY_PATTERN.exec(css)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    families.add(extractFontFamilyName(raw));
  }

  return [...families];
};

export const collectFontFamiliesFromHtml = (html: string): string[] => {
  const families = new Set<string>();
  const inlineStylePattern = /font-family\s*:\s*([^;"]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = inlineStylePattern.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    families.add(extractFontFamilyName(raw));
  }

  return [...families];
};

export const preloadCarouselEditorFonts = (
  doc: Document,
  fontNames: Iterable<string>,
) => {
  for (const fontName of fontNames) {
    injectFontIntoDoc(doc, fontName);
  }
};
