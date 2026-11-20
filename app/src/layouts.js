// Panel layouts for the cover: each layout names its panels as fractions of the
// cover's width and height, [x, y, w, h]. The hero layout is the genre's iconic
// poster: one big panel on top, three small panels along the foot.

export const LAYOUTS = {
  hero: {
    label: 'Hero + 3',
    panels: 4,
    rects: () => [
      [0, 0, 1, 0.6],
      [0, 0.6, 1 / 3, 0.4],
      [1 / 3, 0.6, 1 / 3, 0.4],
      [2 / 3, 0.6, 1 / 3, 0.4],
    ],
  },
  six: {
    label: 'Six panels',
    panels: 6,
    rects: () => [
      [0, 0, 1 / 3, 0.5],
      [1 / 3, 0, 1 / 3, 0.5],
      [2 / 3, 0, 1 / 3, 0.5],
      [0, 0.5, 1 / 3, 0.5],
      [1 / 3, 0.5, 1 / 3, 0.5],
      [2 / 3, 0.5, 1 / 3, 0.5],
    ],
  },
  duo: {
    label: 'Duo',
    panels: 3,
    rects: () => [
      [0, 0, 0.58, 1],
      [0.58, 0, 0.42, 0.5],
      [0.58, 0.5, 0.42, 0.5],
    ],
  },
};

/** Pixel rectangles for a layout at a given cover size. */
export function panelRects(layoutId, width, height) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.hero;
  return layout.rects().map(([x, y, w, h]) => ({
    x: x * width,
    y: y * height,
    w: w * width,
    h: h * height,
  }));
}

/** How many panels a layout shows. */
export function panelCount(layoutId) {
  return (LAYOUTS[layoutId] ?? LAYOUTS.hero).panels;
}
