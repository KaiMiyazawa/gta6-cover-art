// Neon Vice Cover Studio: wires the editor. Photos come from the device or the
// bundled samples; each panel holds one photo, cropped and positioned by dragging
// it on the preview. The cover renders live on canvas and exports as a PNG.
//
// `?demo=1` loads the bundled sample photos and a finished cover, for screenshots
// (add `&size=1080x1350` or `&layout=six` to vary it). `window.__shotReady` is
// set once the demo scene has painted; `window.__coverStudio` exposes the
// export used by automated checks.

import { drawCover, renderCover, SIZES } from './cover.js';
import { LAYOUTS, panelRects, panelCount } from './layouts.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subcaptionInput = document.getElementById('subcaption');
const captionPosInput = document.getElementById('captionPos');
const gradeInput = document.getElementById('grade');
const panelInfo = document.getElementById('panelInfo');
const panelPhotoSelect = document.getElementById('panelPhoto');
const panelZoomInput = document.getElementById('panelZoom');

const SAMPLES = [
  { file: 'demo.jpg', name: 'Boulevard sunset' },
  { file: 'boulevard.jpg', name: 'Boulevard' },
  { file: 'pier.jpg', name: 'Pier' },
];

const state = {
  size: '1080x1080',
  layout: 'hero',
  caption: 'NEON NIGHTS',
  subcaption: 'VICE CITY',
  captionPos: 'bottom',
  grade: 0.75,
  panels: Array.from({ length: 6 }, () => ({ photo: -1, zoom: 1, ox: 0, oy: 0 })),
};

/** Every loaded photo: { img, name }. Panel.photo is an index into this list. */
const photos = [];
let selectedPanel = 0;
let drag = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function render() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, photos.map((p) => p.img), state);
}

function refreshPanelControls() {
  const count = panelCount(state.layout);
  panelInfo.textContent = `Panel ${selectedPanel + 1} of ${count} — drag its photo on the preview, or use the controls.`;
  panelPhotoSelect.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = '— empty —';
  panelPhotoSelect.appendChild(empty);
  photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name;
    panelPhotoSelect.appendChild(opt);
  });
  const panel = state.panels[selectedPanel];
  panelPhotoSelect.value = String(panel.photo);
  panelZoomInput.value = String(panel.zoom);
}

function buildButtons(container, entries, current, onPick) {
  container.innerHTML = '';
  for (const [id, label] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (id === current) b.classList.add('active');
    b.addEventListener('click', () => {
      onPick(id);
      buildButtons(container, entries, id, onPick);
    });
    container.appendChild(b);
  }
}

function buildLayoutButtons() {
  buildButtons(
    document.getElementById('layouts'),
    Object.entries(LAYOUTS).map(([id, l]) => [id, l.label]),
    state.layout,
    (id) => { state.layout = id; selectedPanel = 0; refreshPanelControls(); render(); },
  );
}

function buildSizeButtons() {
  buildButtons(
    document.getElementById('sizes'),
    Object.keys(SIZES).map((id) => [id, id.replace('x', ' × ')]),
    state.size,
    (id) => { state.size = id; render(); },
  );
}

function buildSamples() {
  const box = document.getElementById('samples');
  box.innerHTML = '';
  SAMPLES.forEach((s, i) => {
    const img = document.createElement('img');
    img.src = `samples/${s.file}`;
    img.alt = s.name;
    img.title = `${s.name} — click to put it in the selected panel`;
    img.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      state.panels[selectedPanel].zoom = 1;
      state.panels[selectedPanel].ox = 0;
      state.panels[selectedPanel].oy = 0;
      document.querySelectorAll('.samples img').forEach((el) => el.classList.remove('selected'));
      img.classList.add('selected');
      refreshPanelControls();
      render();
    });
    box.appendChild(img);
  });
}

async function addPhotoFile(file) {
  const img = await loadImage(URL.createObjectURL(file));
  photos.push({ img, name: file.name });
  const empty = state.panels.findIndex((p) => p.photo === -1);
  const target = empty === -1 ? selectedPanel : empty;
  state.panels[target].photo = photos.length - 1;
  selectedPanel = target;
  refreshPanelControls();
  render();
}

document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      await addPhotoFile(file);
    } catch (err) {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
  e.target.value = '';
});
captionInput.addEventListener('input', () => { state.caption = captionInput.value; render(); });
subcaptionInput.addEventListener('input', () => { state.subcaption = subcaptionInput.value; render(); });
captionPosInput.addEventListener('change', () => { state.captionPos = captionPosInput.value; render(); });
gradeInput.addEventListener('input', () => { state.grade = Number(gradeInput.value); render(); });
panelPhotoSelect.addEventListener('change', () => {
  state.panels[selectedPanel].photo = Number(panelPhotoSelect.value);
  render();
});
panelZoomInput.addEventListener('input', () => {
  state.panels[selectedPanel].zoom = Number(panelZoomInput.value);
  render();
});
document.getElementById('centerPanel').addEventListener('click', () => {
  const p = state.panels[selectedPanel];
  p.ox = 0;
  p.oy = 0;
  render();
});
document.getElementById('clearPanel').addEventListener('click', () => {
  const p = state.panels[selectedPanel];
  p.photo = -1;
  p.zoom = 1;
  p.ox = 0;
  p.oy = 0;
  refreshPanelControls();
  render();
});

function pointToPanel(event) {
  const box = canvas.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * canvas.width;
  const y = ((event.clientY - box.top) / box.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const index = rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  return { index, x, y };
}

canvas.addEventListener('pointerdown', (event) => {
  const hit = pointToPanel(event);
  if (hit.index === -1) return;
  selectedPanel = hit.index;
  refreshPanelControls();
  canvas.setPointerCapture(event.pointerId);
  drag = { x: hit.x, y: hit.y, panel: state.panels[hit.index] };
  render();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const hit = pointToPanel(event);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const r = rects[selectedPanel];
  drag.panel.ox = Math.max(-0.5, Math.min(0.5, drag.panel.ox + (hit.x - drag.x) / r.w));
  drag.panel.oy = Math.max(-0.5, Math.min(0.5, drag.panel.oy + (hit.y - drag.y) / r.h));
  drag.x = hit.x;
  drag.y = hit.y;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const hit = pointToPanel(event);
  if (hit.index === -1) return;
  selectedPanel = hit.index;
  const panel = state.panels[hit.index];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
  refreshPanelControls();
  render();
}, { passive: false });

document.getElementById('export').addEventListener('click', () => {
  const out = renderCover(photos.map((p) => p.img), state, state.size);
  out.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — please try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${state.size}.png`;
    a.click();
    statusEl.textContent = `Saved neon-vice-cover-${state.size}.png`;
  }, 'image/png');
});

/** Demo mode: a finished cover from the bundled samples, for screenshots. */
async function runDemo(query) {
  const size = query.get('size');
  if (size && SIZES[size]) state.size = size;
  const layout = query.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  captionInput.value = query.get('caption') ?? 'NEON NIGHTS';
  subcaptionInput.value = query.get('subcaption') ?? 'VICE CITY';
  state.caption = captionInput.value;
  state.subcaption = subcaptionInput.value;
  for (const s of SAMPLES) {
    const img = await loadImage(`samples/${s.file}`);
    photos.push({ img, name: s.name });
  }
  // Hero layout: the sunset portrait leads, the boulevard and pier fill the foot,
  // and a zoomed crop of the portrait closes the row.
  state.panels[0] = { photo: 0, zoom: 1.05, ox: 0, oy: 0.02 };
  state.panels[1] = { photo: 1, zoom: 1.15, ox: 0, oy: 0 };
  state.panels[2] = { photo: 2, zoom: 1.1, ox: 0, oy: -0.05 };
  state.panels[3] = { photo: 0, zoom: 1.7, ox: -0.12, oy: -0.08 };
  state.panels[4] = { photo: 1, zoom: 1.4, ox: 0.08, oy: 0 };
  state.panels[5] = { photo: 2, zoom: 1.4, ox: -0.06, oy: 0.05 };
  buildLayoutButtons();
  buildSizeButtons();
  refreshPanelControls();
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/** Test hook: export the current cover at any size as a PNG data URL. */
window.__coverStudio = {
  state,
  photoCount: () => photos.length,
  render,
  exportPNG: async (sizeId) => {
    const out = renderCover(photos.map((p) => p.img), state, sizeId);
    return out.toDataURL('image/png');
  },
};

buildSamples();
buildLayoutButtons();
buildSizeButtons();
refreshPanelControls();

const query = new URLSearchParams(location.search);
if (query.get('demo') === '1') {
  runDemo(query).catch((err) => { statusEl.textContent = `Demo failed: ${err.message}`; });
} else {
  render();
}
