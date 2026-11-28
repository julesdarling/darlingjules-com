import { WHALE_CELL_SIZE, WHALE_FRAMES } from '../data/writingWhaleFrames';

const FRAME_DURATION = 140;

const animateWhale = (whale: HTMLElement, motion: MediaQueryList) => {
  const sheet = whale.querySelector<HTMLImageElement>('.writing-whale__sheet');
  if (!sheet) return () => {};

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  canvas.className = 'writing-whale__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  whale.append(canvas);

  let buffers: HTMLCanvasElement[] = [];
  let visible = false;
  let disposed = false;
  let playing = false;
  let request = 0;
  let elapsed = 0;
  let previousTime: number | undefined;
  let currentFrame = -1;

  const draw = (index: number) => {
    if (!buffers[index] || currentFrame === index) return;
    // Copy a complete registered frame in one paint, including its margins.
    // No animated clipping, sheet translation, or clear-then-draw gap.
    context.globalCompositeOperation = 'copy';
    context.drawImage(buffers[index], 0, 0);
    currentFrame = index;
    canvas.dataset.frameIndex = String(index);
  };

  const tick = (now: number) => {
    if (!playing || disposed) return;
    if (previousTime !== undefined) elapsed += now - previousTime;
    previousTime = now;
    draw(Math.floor(elapsed / FRAME_DURATION) % buffers.length);
    request = window.requestAnimationFrame(tick);
  };

  const updatePlayback = () => {
    if (disposed) return;
    if (motion.matches) {
      elapsed = 0;
      draw(0);
    }
    const next = !!buffers.length && visible && !motion.matches && !document.hidden;
    whale.classList.toggle('is-whale-playing', next);
    if (next === playing) return;
    playing = next;
    previousTime = undefined;
    window.cancelAnimationFrame(request);
    if (playing) request = window.requestAnimationFrame(tick);
  };

  const prepareFrames = () => {
    if (disposed || !sheet.complete || !sheet.naturalWidth) return;
    const bounds = whale.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(bounds.width * ratio);
    const height = Math.round(bounds.height * ratio);
    if (!width || !height) return;
    if (buffers.length && canvas.width === width && canvas.height === height) return;

    const scale = width / WHALE_CELL_SIZE;
    const prepared: HTMLCanvasElement[] = [];
    for (const [sx, sy, sw, sh, dx, dy] of WHALE_FRAMES) {
      const frame = document.createElement('canvas');
      frame.width = width;
      frame.height = height;
      const frameContext = frame.getContext('2d');
      if (!frameContext) return;
      frameContext.imageSmoothingQuality = 'high';
      frameContext.drawImage(sheet, sx, sy, sw, sh, dx * scale, dy * scale, sw * scale, sh * scale);
      prepared.push(frame);
    }

    buffers = prepared;
    canvas.width = width;
    canvas.height = height;
    currentFrame = -1;
    draw(Math.floor(elapsed / FRAME_DURATION) % buffers.length);
    // Keep the static image visible until a complete first frame is painted.
    whale.classList.add('is-whale-ready');
    updatePlayback();
  };

  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    updatePlayback();
  });
  const resize = new ResizeObserver(prepareFrames);
  intersection.observe(whale);
  resize.observe(whale);
  sheet.addEventListener('load', prepareFrames);
  motion.addEventListener('change', updatePlayback);
  document.addEventListener('visibilitychange', updatePlayback);
  window.addEventListener('resize', prepareFrames);
  prepareFrames();

  return () => {
    disposed = true;
    playing = false;
    window.cancelAnimationFrame(request);
    intersection.disconnect();
    resize.disconnect();
    sheet.removeEventListener('load', prepareFrames);
    motion.removeEventListener('change', updatePlayback);
    document.removeEventListener('visibilitychange', updatePlayback);
    window.removeEventListener('resize', prepareFrames);
    buffers = [];
    canvas.remove();
    whale.classList.remove('is-whale-ready', 'is-whale-playing');
  };
};

export const initWritingWhale = () => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanup = [...document.querySelectorAll<HTMLElement>('[data-writing-whale]')]
    .map((whale) => animateWhale(whale, motion));
  return () => cleanup.forEach((dispose) => dispose());
};
