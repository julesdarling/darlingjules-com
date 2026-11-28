export const initWritingWhale = () => {
  const whales = [...document.querySelectorAll<HTMLElement>('[data-writing-whale]')];
  if (!whales.length) return () => {};

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set<Element>();
  const update = () => {
    whales.forEach((whale) => {
      whale.classList.toggle('is-whale-playing', visible.has(whale) && !motion.matches && !document.hidden);
    });
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    update();
  });

  whales.forEach((whale) => observer.observe(whale));
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  return () => {
    observer.disconnect();
    motion.removeEventListener('change', update);
    document.removeEventListener('visibilitychange', update);
    whales.forEach((whale) => whale.classList.remove('is-whale-playing'));
  };
};
