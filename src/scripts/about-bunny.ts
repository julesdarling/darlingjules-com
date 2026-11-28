const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
const sector = Math.PI / 4;

const trackBunny = (bunny: HTMLElement) => {
  const sheet = bunny.querySelector<HTMLElement>('.about-bunny__sheet');
  if (!sheet) return () => {};

  let visible = false;
  let frame = 0;
  let pose = 1;
  let pointer: { x: number; y: number } | undefined;

  const showPose = (next: number) => {
    if (pose === next) return;
    pose = next;
    bunny.dataset.bunnyDirection = directions[pose];
    sheet.style.transform = `translate(${-(pose % 4) * 25}%, ${-Math.floor(pose / 4) * 50}%)`;
  };

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pointer = undefined;
    showPose(1);
  };

  const render = () => {
    frame = 0;
    if (!visible || !pointer || document.hidden) return;
    const rect = bunny.getBoundingClientRect();
    const dx = pointer.x - (rect.left + rect.width / 2);
    const dy = pointer.y - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.16) {
      showPose(1);
      return;
    }

    const angle = Math.atan2(dy, dx);
    // A small overlap between sectors keeps her from twitching on boundaries.
    const currentAngle = (pose - 3) * sector;
    const difference = Math.atan2(Math.sin(angle - currentAngle), Math.cos(angle - currentAngle));
    if (Math.abs(difference) > sector / 2 + 0.1) {
      showPose((Math.round(angle / sector) + 11) % 8);
    }
  };

  const requestRender = () => {
    if (visible && pointer && !document.hidden && !frame) frame = requestAnimationFrame(render);
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    requestRender();
  };
  const visibility = () => { if (document.hidden) reset(); };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestRender();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
      showPose(1);
    }
  });

  observer.observe(bunny);
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  window.addEventListener('blur', reset);
  document.addEventListener('mouseleave', reset);
  document.addEventListener('visibilitychange', visibility);

  return () => {
    reset();
    observer.disconnect();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('scroll', requestRender);
    window.removeEventListener('resize', requestRender);
    window.removeEventListener('blur', reset);
    document.removeEventListener('mouseleave', reset);
    document.removeEventListener('visibilitychange', visibility);
    sheet.style.removeProperty('transform');
  };
};

export const initAboutBunny = () => {
  const bunnies = [...document.querySelectorAll<HTMLElement>('[data-about-bunny]')];
  if (!bunnies.length) return () => {};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let cleanups: Array<() => void> = [];
  const reconcile = () => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
    if (!motion.matches && pointer.matches) cleanups = bunnies.map(trackBunny);
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
