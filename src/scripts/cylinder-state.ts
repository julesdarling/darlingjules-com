type CylinderState = 'pending' | 'ready' | 'fallback';

export const setCylinderState = (root: HTMLElement, state: CylinderState) => {
  const ready = state === 'ready';
  root.classList.toggle('is-cylinder-scene-ready', ready);
  root.querySelector('.agency-cylinder-hero')?.classList.toggle('is-cylinder-ready', ready);
  root.querySelector('.agency-cylinder-hero')?.classList.toggle('is-cylinder-fallback', state === 'fallback');
  root.querySelector('.agency-pattern-logo-band')?.classList.toggle('is-logo-cylinder-ready', ready);
  // Release the prepaint gate only after both rings have their final classes.
  root.dataset.cylinderState = state;
};
