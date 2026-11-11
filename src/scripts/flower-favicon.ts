import frames from '../data/flower-favicon-frames.json';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let timer: number | undefined;
let frame = 0;

const stop = () => {
  window.clearInterval(timer);
  timer = undefined;
  frame = 0;
  const icon = document.querySelector<HTMLLinkElement>('[data-flower-favicon]');
  if (icon?.dataset.staticIcon) icon.href = icon.dataset.staticIcon;
};

const sync = () => {
  stop();
  const icon = document.querySelector<HTMLLinkElement>('[data-flower-favicon]');
  if (!icon || document.hidden || reducedMotion.matches) return;

  timer = window.setInterval(() => {
    frame = (frame + 1) % frames.length;
    icon.href = frames[frame];
  }, 220);
};

document.addEventListener('astro:page-load', sync);
document.addEventListener('astro:before-swap', stop);
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', sync);
window.addEventListener('pagehide', stop);
window.addEventListener('pageshow', sync);
sync();
