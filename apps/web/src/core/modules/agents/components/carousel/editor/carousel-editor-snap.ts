export type SnapGuide = { axis: "x" | "y"; position: number };
export type SnapResult = { x: number; y: number; guides: SnapGuide[] };

const SNAP_THRESHOLD = 6;

export function snapTranslate(
  // current top-left of the element being dragged (in iframe 1080×1350 space)
  elLeft: number,
  elTop: number,
  elWidth: number,
  elHeight: number,
  // rects of all OTHER elements (in iframe space)
  otherRects: { left: number; top: number; width: number; height: number }[],
  canvasW: number,
  canvasH: number,
  threshold = SNAP_THRESHOLD,
): SnapResult {
  const guides: SnapGuide[] = [];

  // Snap candidates for X axis: element's left, center, right
  const elCX = elLeft + elWidth / 2;
  const elRight = elLeft + elWidth;

  // Snap candidates for Y axis: element's top, center, bottom
  const elCY = elTop + elHeight / 2;
  const elBottom = elTop + elHeight;

  // Canvas snap points (x)
  const xAnchors = [0, canvasW / 2, canvasW];
  // Canvas snap points (y)
  const yAnchors = [0, canvasH / 2, canvasH];

  // Add other element snap points
  for (const r of otherRects) {
    xAnchors.push(r.left, r.left + r.width / 2, r.left + r.width);
    yAnchors.push(r.top, r.top + r.height / 2, r.top + r.height);
  }

  let snapX = elLeft;
  let snapY = elTop;

  // Find closest X snap
  let bestDX = threshold;
  for (const ax of xAnchors) {
    // snap left edge
    let d = Math.abs(elLeft - ax);
    if (d < bestDX) {
      bestDX = d;
      snapX = ax;
    }
    // snap center
    d = Math.abs(elCX - ax);
    if (d < bestDX) {
      bestDX = d;
      snapX = ax - elWidth / 2;
    }
    // snap right edge
    d = Math.abs(elRight - ax);
    if (d < bestDX) {
      bestDX = d;
      snapX = ax - elWidth;
    }
  }
  if (bestDX < threshold) guides.push({ axis: "x", position: snapX + elWidth / 2 });

  // Find closest Y snap
  let bestDY = threshold;
  for (const ay of yAnchors) {
    let d = Math.abs(elTop - ay);
    if (d < bestDY) {
      bestDY = d;
      snapY = ay;
    }
    d = Math.abs(elCY - ay);
    if (d < bestDY) {
      bestDY = d;
      snapY = ay - elHeight / 2;
    }
    d = Math.abs(elBottom - ay);
    if (d < bestDY) {
      bestDY = d;
      snapY = ay - elHeight;
    }
  }
  if (bestDY < threshold) guides.push({ axis: "y", position: snapY + elHeight / 2 });

  return { x: snapX, y: snapY, guides };
}
