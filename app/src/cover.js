// Renders the multi-panel cover: each panel shows one of the user's photos (or a
// sunset placeholder when empty), framed by white gutters, then a neon-sunset grade
// unifies the whole cover, and the caption is lettered across it in bold capitals.
//
// State shape (see main.js):
//   state = { size, layout, caption, subcaption, captionPos, grade,
//             panels: [{ photo, zoom, ox, oy }, ...] }
//   photos = [HTMLImageElement, ...] — panel.photo is an index into photos, or -1.

import { panelRects, panelCount } from './layouts.js';

/** The three post sizes the app exports, [width, height] in pixels. */
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** Draws one photo into a panel rect, cover-fitting it with zoom and pan offsets.
 *  `ox`/`oy` are fractions of the rect's width/height, `zoom` is 1..3. */
export function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + ox * rect.w;
  const cy = rect.y + rect.h / 2 + oy * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

/** A sunset placeholder for a panel with no photo yet: gradient sky and a sun. */
function drawPlaceholder(ctx, rect) {
  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  sky.addColorStop(0, '#3b1150');
  sky.addColorStop(0.55, '#c22a6e');
  sky.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 214, 102, 0.92)';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w * 0.5, rect.y + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `700 ${Math.max(13, Math.min(rect.w, rect.h) * 0.07)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.72);
}

/** The neon-sunset grade over the whole cover: warm wash, pink-to-orange
 *  sweep and a vignette. `grade` is 0..1. */
function applySunsetGrade(ctx, w, h, grade) {
  if (grade <= 0) return;
  ctx.save();
  const sweep = ctx.createLinearGradient(0, 0, 0, h);
  sweep.addColorStop(0, 'rgba(255, 94, 138, 0)');
  sweep.addColorStop(0.55, `rgba(255, 122, 61, ${(0.1 * grade).toFixed(3)})`);
  sweep.addColorStop(1, `rgba(160, 30, 110, ${(0.3 * grade).toFixed(3)})`);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, w, h);
  const warm = ctx.createLinearGradient(0, 0, w, h);
  warm.addColorStop(0, `rgba(255, 170, 60, ${(0.1 * grade).toFixed(3)})`);
  warm.addColorStop(1, `rgba(255, 60, 140, ${(0.13 * grade).toFixed(3)})`);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const vignette = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vignette.addColorStop(0, 'rgba(10, 4, 24, 0)');
  vignette.addColorStop(1, `rgba(10, 4, 24, ${(0.34 * grade).toFixed(3)})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The caption: huge bold capitals with a dark outline, slightly tilted, plus a
 *  small letter-spaced sub-caption. Drawn at the top or the foot of the cover. */
function drawCaption(ctx, w, h, state) {
  const text = (state.caption ?? '').trim().toUpperCase();
  const sub = (state.subcaption ?? '').trim().toUpperCase();
  if (!text && !sub) return;
  const bottom = state.captionPos !== 'top';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = w / 2;
  const tilt = -0.018;
  if (text) {
    let size = h * 0.105;
    const font = (px) => `900 ${px}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
    ctx.font = font(size);
    try { ctx.letterSpacing = '1px'; } catch { /* older canvas: no letter spacing */ }
    while (size > 14 && ctx.measureText(text).width > w * 0.92) {
      size -= 2;
      ctx.font = font(size);
    }
    const y = bottom ? h - h * 0.055 : h * 0.115;
    ctx.translate(cx, y);
    ctx.rotate(tilt);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = '#14061f';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.03;
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
  }
  if (sub) {
    let size = h * 0.032;
    const font = (px) => `800 ${px}px "Helvetica Neue", Arial, sans-serif`;
    ctx.font = font(size);
    try { ctx.letterSpacing = `${Math.max(2, h * 0.006)}px`; } catch { /* no letter spacing */ }
    while (size > 10 && ctx.measureText(sub).width > w * 0.8) {
      size -= 1;
      ctx.font = font(size);
    }
    // At the foot the sub-caption sits above the caption; at the top it sits below it.
    const subY = bottom
      ? h - h * 0.055 - h * 0.105 - h * 0.012
      : h * 0.115 + h * 0.032 + h * 0.014;
    ctx.translate(cx, subY);
    ctx.rotate(tilt);
    ctx.lineWidth = Math.max(2, size * 0.18);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14061f';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = size * 0.2;
    ctx.strokeText(sub, 0, 0);
    ctx.fillText(sub, 0, 0);
  }
  ctx.restore();
}

/** Draws the full cover onto `canvas` at its own pixel size. */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#12061f';
  ctx.fillRect(0, 0, w, h);
  const gutter = Math.max(4, Math.round(w * 0.007));
  const rects = panelRects(state.layout, w, h);
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const r = rects[i];
    // White frame: the gutter shows through as the panel border.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const inner = { x: r.x + gutter, y: r.y + gutter, w: r.w - gutter * 2, h: r.h - gutter * 2 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip();
    const panel = state.panels[i];
    const img = panel && panel.photo >= 0 && photos[panel.photo] ? photos[panel.photo] : null;
    if (img) {
      drawPhotoInto(ctx, img, inner, panel.zoom || 1, panel.ox || 0, panel.oy || 0);
      const tint = ctx.createLinearGradient(0, inner.y, 0, inner.y + inner.h);
      tint.addColorStop(0, 'rgba(255, 120, 80, 0)');
      tint.addColorStop(1, `rgba(190, 40, 120, ${(0.16 * state.grade).toFixed(3)})`);
      ctx.fillStyle = tint;
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
    } else {
      drawPlaceholder(ctx, inner);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(10, 5, 20, 0.55)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
  }
  applySunsetGrade(ctx, w, h, state.grade ?? 0.75);
  drawCaption(ctx, w, h, state);
}

/** Renders the cover at a post size into a fresh canvas and returns it. */
export function renderCover(photos, state, sizeId) {
  const [w, h] = SIZES[sizeId] ?? SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, photos, { ...state, size: sizeId });
  return canvas;
}
