import { toBlob } from "html-to-image";
import JSZip from "jszip";

export type PostDownloadFormat = "html" | "png";

type DownloadSlidesOptions = {
  indices: number[];
  slides: string[];
  format: PostDownloadFormat;
  width: number;
  height: number;
  fileNamePrefix?: string;
};

const triggerBlobDownload = (fileName: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

const mountRenderFrame = (
  html: string,
  width: number,
  height: number,
): Promise<HTMLIFrameElement> =>
  new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.width = String(width);
    iframe.height = String(height);
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.border = "none";
    iframe.sandbox = "allow-same-origin";
    iframe.srcdoc = html;
    iframe.onload = () => resolve(iframe);
    iframe.onerror = () => reject(new Error("Failed to render slide preview"));
    document.body.appendChild(iframe);
  });

const unmountRenderFrame = (iframe: HTMLIFrameElement) => {
  iframe.remove();
};

const waitForFrameAssets = async (iframe: HTMLIFrameElement) => {
  const doc = iframe.contentDocument;
  if (!doc) return;

  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }
};

const renderSlideToPng = async (
  html: string,
  width: number,
  height: number,
): Promise<Blob> => {
  const iframe = await mountRenderFrame(html, width, height);
  try {
    await waitForFrameAssets(iframe);
    const target =
      iframe.contentDocument?.documentElement ??
      iframe.contentDocument?.body;
    if (!target) {
      throw new Error("Slide render target not found");
    }

    const blob = await toBlob(target, {
      width,
      height,
      pixelRatio: 1,
      cacheBust: true,
    });

    if (!blob) {
      throw new Error("Failed to export slide as PNG");
    }

    return blob;
  } finally {
    unmountRenderFrame(iframe);
  }
};

const buildSlideFileName = (
  prefix: string,
  index: number,
  format: PostDownloadFormat,
) => {
  const extension = format === "html" ? "html" : "png";
  return `${prefix}-slide-${index + 1}.${extension}`;
};

export const downloadPostSlides = async ({
  indices,
  slides,
  format,
  width,
  height,
  fileNamePrefix = "post",
}: DownloadSlidesOptions) => {
  const uniqueIndices = [...new Set(indices)].filter(
    (index) => index >= 0 && index < slides.length,
  );

  if (uniqueIndices.length === 0) return;

  if (uniqueIndices.length === 1) {
    const index = uniqueIndices[0];
    const html = slides[index];
    if (!html) return;

    if (format === "html") {
      triggerBlobDownload(
        buildSlideFileName(fileNamePrefix, index, "html"),
        new Blob([html], { type: "text/html;charset=utf-8" }),
      );
      return;
    }

    const pngBlob = await renderSlideToPng(html, width, height);
    triggerBlobDownload(
      buildSlideFileName(fileNamePrefix, index, "png"),
      pngBlob,
    );
    return;
  }

  const zip = new JSZip();

  for (const index of uniqueIndices) {
    const html = slides[index];
    if (!html) continue;

    if (format === "html") {
      zip.file(buildSlideFileName(fileNamePrefix, index, "html"), html);
      continue;
    }

    const pngBlob = await renderSlideToPng(html, width, height);
    zip.file(
      buildSlideFileName(fileNamePrefix, index, "png"),
      pngBlob,
    );
  }

  const archive = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(`${fileNamePrefix}-slides.zip`, archive);
};
