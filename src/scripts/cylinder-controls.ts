import { createHeroLayoutControls, heroLayoutGroups, type HeroSliderConfig } from './hero-layout-controls';

type RingControls = {
  scale: number;
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  speed: number;
  backfaceVisible: boolean;
};

export type CylinderControlState = {
  canvas: { topOffsetPx: number; heightOffsetPx: number; widthOffsetPx: number; x: number; opacity: number };
  title: RingControls;
  logos: RingControls & { heightCompression: number };
  camera: { fov: number; z: number; x: number; y: number; pitch: number; yaw: number; roll: number };
  fog: { enabled: boolean; near: number; far: number };
};

type RingGroup = 'title' | 'logos';
type SliderKey = 'scale' | 'x' | 'y' | 'z' | 'pitch' | 'yaw' | 'speed';
type SliderConfig = {
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
};

const eventName = 'jules:cylinder-controls';
const mobileLayoutQuery = '(max-width: 767px)';
// Separate from the retired v8 panel, which stored canvas heights and positions.
const storagePrefix = 'jules:ring-controls:v3';
const sliderConfigs: SliderConfig[] = [
  { key: 'scale', label: 'Size', min: 0.2, max: 1.5, step: 0.01 },
  { key: 'x', label: 'X position', min: -5, max: 5, step: 0.01 },
  { key: 'y', label: 'Y position', min: -6, max: 6, step: 0.01 },
  { key: 'z', label: 'Z position', min: -8, max: 8, step: 0.01 },
  { key: 'pitch', label: 'Tilt', min: -1.05, max: 1.05, step: 0.01 },
  { key: 'yaw', label: 'Rotation', min: -Math.PI, max: Math.PI, step: 0.01 },
  { key: 'speed', label: 'Speed', min: -2, max: 2, step: 0.05 },
];

let activeCleanup: (() => void) | undefined;

const cloneState = (state: CylinderControlState): CylinderControlState => ({
  canvas: { ...state.canvas },
  title: { ...state.title },
  logos: { ...state.logos },
  camera: { ...state.camera },
  fog: { ...state.fog },
});

// Match the scene defaults without changing any anchor or canvas dimensions.
const getDefaultState = (mobile: boolean): CylinderControlState => ({
  canvas: { topOffsetPx: 0, heightOffsetPx: 0, widthOffsetPx: 0, x: 0, opacity: 1 },
  title: {
    scale: mobile ? 1.5 : 1, x: 0, y: 0, z: 0, pitch: Math.PI / 15,
    yaw: -Math.PI / 10, speed: 1, backfaceVisible: false,
  },
  logos: {
    scale: 1, x: 0, y: 0, z: 0, pitch: -17 * Math.PI / 180,
    yaw: 0, speed: 1, backfaceVisible: false, heightCompression: 1.32,
  },
  camera: { fov: 42, z: 25, x: 0, y: 0, pitch: 0, yaw: 0, roll: 0 },
  fog: { enabled: true, near: 20, far: 33 },
});

const adjustableValues = (state: CylinderControlState) => {
  const pick = (group: RingControls) => ({
    scale: group.scale,
    x: group.x,
    y: group.y,
    z: group.z,
    pitch: group.pitch,
    yaw: group.yaw,
    speed: group.speed,
    backfaceVisible: group.backfaceVisible,
  });
  return { title: pick(state.title), logos: pick(state.logos) };
};

const readStoredState = (mobile: boolean): CylinderControlState => {
  const state = getDefaultState(mobile);
  try {
    const raw = localStorage.getItem(`${storagePrefix}:${mobile ? 'mobile' : 'desktop'}`);
    if (!raw) return state;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    for (const group of ['title', 'logos'] as const) {
      const saved = stored[group];
      if (!saved || typeof saved !== 'object') continue;
      const values = saved as Record<string, unknown>;
      for (const config of sliderConfigs) {
        const value = values[config.key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          state[group][config.key] = Math.min(config.max, Math.max(config.min, value));
        }
      }
    }
  } catch {
    // Private browsing or an invalid saved value should leave the site at its defaults.
  }
  return state;
};

const dispatchState = (state: CylinderControlState) => {
  window.__julesCylinderControls = cloneState(state);
  window.dispatchEvent(new CustomEvent<CylinderControlState>(eventName, { detail: cloneState(state) }));
};

const displayValue = (key: SliderKey, value: number) => {
  if (key === 'scale') return `${Math.round(value * 100)}%`;
  if (key === 'pitch' || key === 'yaw') return `${Math.round(value * 180 / Math.PI)}°`;
  if (key === 'x' || key === 'y' || key === 'z') return value.toFixed(2);
  return value === 0 ? 'Paused' : `${Number(value.toFixed(2))}×`;
};

export const initCylinderControls = () => {
  activeCleanup?.();
  const local = import.meta.env.DEV || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);
  const root = document.querySelector<HTMLElement>('.cylinder-home');
  if (!local || !root) return () => {};

  const breakpoint = window.matchMedia(mobileLayoutQuery);
  let mobile = breakpoint.matches;
  let state = readStoredState(mobile);
  const layoutControls = createHeroLayoutControls(root);
  layoutControls.load(mobile);
  let copyTimer: number | undefined;
  let disposed = false;
  const storageKey = () => `${storagePrefix}:${mobile ? 'mobile' : 'desktop'}`;

  const panel = document.createElement('aside');
  panel.className = 'cylinder-controls cylinder-controls--local is-collapsed';
  panel.setAttribute('aria-label', 'Hero controls');

  const header = document.createElement('div');
  header.className = 'cylinder-controls__top';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cylinder-controls__toggle';
  toggle.textContent = 'Hero controls';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'ring-controls-body');
  toggle.setAttribute('aria-label', 'Open hero controls');
  header.append(toggle);

  const body = document.createElement('div');
  body.id = 'ring-controls-body';
  body.className = 'cylinder-controls__body';
  body.hidden = true;

  const note = document.createElement('p');
  note.className = 'cylinder-controls__note';
  note.textContent = 'Changes stay in this browser, with separate desktop and mobile values. Positions and spacing are offsets from the original layout. Speed 0 pauses a ring or flower animation.';
  const groups = document.createElement('div');
  groups.className = 'cylinder-controls__groups';
  const status = document.createElement('p');
  status.className = 'cylinder-controls__status';
  status.setAttribute('role', 'status');

  const flush = () => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(adjustableValues(state)));
    } catch {
      // The live controls still work when storage is unavailable.
    }
    status.textContent = '';
    dispatchState(state);
  };

  const makeSlider = (group: RingGroup, config: SliderConfig) => {
    const row = document.createElement('label');
    row.className = 'cylinder-controls__row';
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `ring-control-${group}-${config.key}`;
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(state[group][config.key]);
    input.dataset.group = group;
    input.dataset.key = config.key;
    row.htmlFor = input.id;

    const label = document.createElement('span');
    label.textContent = config.label;
    label.className = 'cylinder-controls__label';
    const output = document.createElement('output');
    output.className = 'cylinder-controls__value';
    output.setAttribute('for', input.id);
    const updateOutput = () => {
      output.value = displayValue(config.key, state[group][config.key]);
      input.setAttribute('aria-valuetext', output.value);
    };
    updateOutput();

    input.addEventListener('input', () => {
      state[group][config.key] = Number(input.value);
      updateOutput();
      flush();
    });
    const rowHeader = document.createElement('span');
    rowHeader.className = 'cylinder-controls__row-header';
    rowHeader.append(label, output);
    row.append(rowHeader, input);
    return row;
  };

  const renderGroups = () => {
    const expanded = new Set(Array.from(groups.querySelectorAll<HTMLDetailsElement>('details[open]')).map((group) => group.dataset.controlGroup));
    const firstRender = !groups.childElementCount;
    groups.replaceChildren();
    const makeSection = (key: string, title: string) => {
      const section = document.createElement('details');
      section.className = 'cylinder-controls__section';
      section.dataset.controlGroup = key;
      section.open = expanded.has(key) || (firstRender && key === 'title');
      const summary = document.createElement('summary');
      summary.textContent = title;
      const content = document.createElement('div');
      content.className = 'cylinder-controls__group';
      section.append(summary, content);
      groups.append(section);
      return content;
    };
    for (const [groupName, title] of [['title', 'Design Director'], ['logos', 'Logo ring']] as const) {
      const group = makeSection(groupName, title);
      sliderConfigs.forEach((config) => group.append(makeSlider(groupName, config)));
    }
    for (const config of heroLayoutGroups) {
      const group = makeSection(config.key, config.label);
      config.sliders.forEach((slider) => group.append(makeLayoutSlider(config.key, slider)));
    }
  };

  const makeLayoutSlider = (group: string, config: HeroSliderConfig) => {
    const row = document.createElement('label');
    row.className = 'cylinder-controls__row';
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `hero-control-${group}-${config.key}`;
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(layoutControls.getValue(group, config.key));
    input.dataset.group = group;
    input.dataset.key = config.key;
    row.htmlFor = input.id;
    const label = document.createElement('span');
    label.className = 'cylinder-controls__label';
    label.textContent = config.label;
    const output = document.createElement('output');
    output.className = 'cylinder-controls__value';
    output.setAttribute('for', input.id);
    const updateOutput = () => {
      const value = layoutControls.getValue(group, config.key);
      output.value = config.unit === '%' ? `${Math.round(value * 100)}%`
        : config.unit === '×' && value === 0 ? 'Paused'
        : `${Number(value.toFixed(2))}${config.unit}`;
      input.setAttribute('aria-valuetext', output.value);
    };
    updateOutput();
    input.addEventListener('input', () => {
      layoutControls.setValue(group, config.key, Number(input.value));
      updateOutput();
      status.textContent = '';
      // Refit the WebGL rings when their layout anchors move.
      dispatchState(state);
    });
    const rowHeader = document.createElement('span');
    rowHeader.className = 'cylinder-controls__row-header';
    rowHeader.append(label, output);
    row.append(rowHeader, input);
    return row;
  };
  renderGroups();

  const footer = document.createElement('div');
  footer.className = 'cylinder-controls__footer';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'cylinder-controls__copy';
  copy.textContent = 'Copy values';
  copy.addEventListener('click', () => {
    const values = { viewport: mobile ? 'mobile' : 'desktop', ...adjustableValues(state), layout: layoutControls.getState() };
    void navigator.clipboard?.writeText(JSON.stringify(values, null, 2))
      ?.then(() => {
        if (disposed) return;
        status.textContent = 'Values copied.';
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(() => { status.textContent = ''; }, 2200);
      })
      .catch(() => {
        if (!disposed) status.textContent = 'Copy is unavailable in this browser.';
      });
    if (!navigator.clipboard?.writeText) status.textContent = 'Copy is unavailable in this browser.';
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'cylinder-controls__reset';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    try { localStorage.removeItem(storageKey()); } catch { /* Storage is optional. */ }
    state = getDefaultState(mobile);
    layoutControls.reset();
    renderGroups();
    dispatchState(state);
    status.textContent = 'Default values restored.';
  });
  footer.append(copy, reset);
  body.append(note, groups, footer, status);
  panel.append(header, body);
  document.body.append(panel);

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Close hero controls' : 'Open hero controls');
    panel.classList.toggle('is-collapsed', !expanded);
    body.hidden = !expanded;
  });

  const onBreakpointChange = () => {
    mobile = breakpoint.matches;
    state = readStoredState(mobile);
    layoutControls.load(mobile);
    renderGroups();
    dispatchState(state);
    status.textContent = `${mobile ? 'Mobile' : 'Desktop'} values loaded.`;
  };
  breakpoint.addEventListener('change', onBreakpointChange);
  let resizeFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (disposed) return;
      layoutControls.apply();
      dispatchState(state);
    });
  };
  window.addEventListener('resize', onResize);
  // Publish synchronously so a dynamically imported scene reads the right initial values.
  dispatchState(state);

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    breakpoint.removeEventListener('change', onBreakpointChange);
    window.removeEventListener('resize', onResize);
    cancelAnimationFrame(resizeFrame);
    layoutControls.cleanup();
    window.clearTimeout(copyTimer);
    panel.remove();
    delete window.__julesCylinderControls;
    if (activeCleanup === cleanup) activeCleanup = undefined;
  };
  activeCleanup = cleanup;
  return cleanup;
};
