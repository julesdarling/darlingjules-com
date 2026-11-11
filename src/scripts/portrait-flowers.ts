const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const createFlowerParallax = (portrait: HTMLElement) => {
  const flowers = [...portrait.querySelectorAll<HTMLElement>('.portrait-flowers .flower-doodle')];
  const positions = flowers.map(() => ({ x: 0, y: 0, targetX: 0, targetY: 0 }));
  let visible = false;
  let frame = 0;
  let lastTime = 0;

  const render = (time: number) => {
    const ease = 1 - Math.exp(-Math.min(time - lastTime, 64) / 110);
    lastTime = time;
    let moving = false;
    flowers.forEach((flower, index) => {
      const point = positions[index];
      point.x += (point.targetX - point.x) * ease;
      point.y += (point.targetY - point.y) * ease;
      if (Math.abs(point.targetX - point.x) + Math.abs(point.targetY - point.y) > 0.05) moving = true;
      else { point.x = point.targetX; point.y = point.targetY; }
      flower.style.setProperty('--flower-x', `${point.x.toFixed(2)}px`);
      flower.style.setProperty('--flower-y', `${point.y.toFixed(2)}px`);
    });
    frame = moving ? requestAnimationFrame(render) : 0;
  };

  const animate = () => {
    if (frame) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(render);
  };

  const reset = () => {
    positions.forEach((point) => { point.targetX = 0; point.targetY = 0; });
    animate();
  };

  const move = (event: PointerEvent) => {
    if (!visible || document.hidden || event.pointerType === 'touch') return;
    const rect = portrait.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width * 0.85), -1, 1);
    const y = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height * 0.85), -1, 1);
    const reach = Math.min(84, rect.width * 0.22);
    const outward = Math.min(12, rect.width * 0.03);
    const targets = [
      { x: clamp(x * reach, -outward, reach), y: clamp(y * reach, -outward, reach), depth: x + y },
      { x: clamp(x * reach, -reach, outward), y: y * reach * 0.6, depth: -x + y - 0.25 },
      { x: clamp(-x * reach * 0.9, -outward, reach), y: clamp(-y * reach * 0.9, -reach, outward), depth: x - y },
    ];
    flowers.forEach((flower, index) => {
      const target = targets[index];
      if (!target) return;
      positions[index].targetX = target.x;
      positions[index].targetY = target.y;
      if (Math.abs(target.depth) > 0.15) flower.style.zIndex = target.depth > 0 ? '2' : '0';
    });
    animate();
  };

  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    positions.forEach((point, index) => {
      point.x = point.y = point.targetX = point.targetY = 0;
      flowers[index].style.removeProperty('--flower-x');
      flowers[index].style.removeProperty('--flower-y');
    });
  };
  const visibility = () => { if (document.hidden) pause(); };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) pause();
  });
  observer.observe(portrait);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset, { passive: true });
  document.addEventListener('mouseleave', reset);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    pause();
    observer.disconnect();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('blur', reset);
    window.removeEventListener('resize', reset);
    document.removeEventListener('mouseleave', reset);
    document.removeEventListener('visibilitychange', visibility);
    flowers.forEach((flower) => flower.style.removeProperty('z-index'));
  };
};

export const initPortraitFlowers = () => {
  const portraits = [...document.querySelectorAll<HTMLElement>('.personal-about-portrait')];
  if (!portraits.length) return () => {};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let cleanups: Array<() => void> = [];
  const reconcile = () => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
    if (!motion.matches && pointer.matches) cleanups = portraits.map(createFlowerParallax);
  };
  motion.addEventListener('change', reconcile);
  pointer.addEventListener('change', reconcile);
  reconcile();
  return () => {
    motion.removeEventListener('change', reconcile);
    pointer.removeEventListener('change', reconcile);
    cleanups.forEach((cleanup) => cleanup());
  };
};
