type LayoutValues = Record<string, number>;
export type HeroLayoutState = Record<string, LayoutValues>;

export type HeroSliderConfig = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  unit: 'px' | '%' | '°' | '×';
};

const positionSliders: HeroSliderConfig[] = [
  { key: 'x', label: 'X position', min: -400, max: 400, step: 1, initial: 0, unit: 'px' },
  { key: 'y', label: 'Y position', min: -300, max: 300, step: 1, initial: 0, unit: 'px' },
];
const sizeSlider: HeroSliderConfig = { key: 'scale', label: 'Size', min: 0.25, max: 2.5, step: 0.01, initial: 1, unit: '%' };
const rotationSlider: HeroSliderConfig = { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, initial: 0, unit: '°' };

export const heroLayoutGroups: { key: string; label: string; sliders: HeroSliderConfig[] }[] = [
  {
    key: 'hero', label: 'Hero layout', sliders: [
      ...positionSliders,
      { key: 'width', label: 'Content width', min: 0.4, max: 1.4, step: 0.01, initial: 1, unit: '%' },
      { key: 'topSpace', label: 'Top spacing', min: -160, max: 300, step: 1, initial: 0, unit: 'px' },
      { key: 'bottomSpace', label: 'Bottom spacing', min: -160, max: 300, step: 1, initial: 0, unit: 'px' },
      { key: 'height', label: 'Minimum height', min: -300, max: 500, step: 1, initial: 0, unit: 'px' },
    ],
  },
  {
    key: 'flowers', label: 'Flowers', sliders: [
      ...positionSliders, sizeSlider, rotationSlider,
      { key: 'gap', label: 'Flower spacing', min: -20, max: 100, step: 1, initial: 0, unit: 'px' },
      { key: 'speed', label: 'Rocking speed', min: 0, max: 3, step: 0.05, initial: 1, unit: '×' },
      { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.01, initial: 1, unit: '%' },
    ],
  },
  ...[1, 2, 3].map((number) => ({
    key: `flower${number}`, label: `Flower ${number}`, sliders: [...positionSliders, sizeSlider, rotationSlider],
  })),
  {
    key: 'copy', label: 'Body copy', sliders: [
      ...positionSliders,
      { key: 'fontScale', label: 'Font size', min: 0.6, max: 1.8, step: 0.01, initial: 1, unit: '%' },
      { key: 'leading', label: 'Line spacing', min: 0.7, max: 1.8, step: 0.01, initial: 1, unit: '%' },
      { key: 'width', label: 'Text width', min: 0.4, max: 1.6, step: 0.01, initial: 1, unit: '%' },
      { key: 'spaceAbove', label: 'Extra space above copy', min: 0, max: 300, step: 1, initial: 0, unit: 'px' },
      { key: 'spaceBelow', label: 'Space below copy', min: -80, max: 200, step: 1, initial: 0, unit: 'px' },
    ],
  },
  {
    key: 'button', label: 'View Work button', sliders: [
      ...positionSliders, sizeSlider,
      { key: 'fontScale', label: 'Font size', min: 0.6, max: 1.8, step: 0.01, initial: 1, unit: '%' },
      { key: 'paddingX', label: 'Horizontal padding', min: 0.25, max: 3, step: 0.05, initial: 1, unit: '%' },
      { key: 'paddingY', label: 'Vertical padding', min: 0.25, max: 3, step: 0.05, initial: 1, unit: '%' },
      { key: 'spaceAbove', label: 'Space above button', min: -100, max: 250, step: 1, initial: 0, unit: 'px' },
    ],
  },
];

const storagePrefix = 'jules:hero-layout:v1';
const defaultState = (): HeroLayoutState => Object.fromEntries(heroLayoutGroups.map((group) => [
  group.key, Object.fromEntries(group.sliders.map((slider) => [slider.key, slider.initial])),
]));

export const createHeroLayoutControls = (root: HTMLElement) => {
  const hero = root.querySelector<HTMLElement>('.agency-cylinder-hero');
  const content = hero?.querySelector<HTMLElement>('.agency-pattern-copy');
  const flowers = hero?.querySelector<HTMLElement>('.hero-flowers');
  const individualFlowers = Array.from(flowers?.querySelectorAll<HTMLElement>('.flower-doodle') ?? []);
  const flowerImages = individualFlowers.map((flower) => flower.querySelector<HTMLElement>('img'));
  const copyContainer = hero?.querySelector<HTMLElement>('.flex-block-3');
  const copy = hero?.querySelector<HTMLElement>('.splitpara.jhppara');
  const actions = hero?.querySelector<HTMLElement>('.flex-block-7');
  const button = actions?.querySelector<HTMLElement>('.ctalink');
  const originalStyles = new Map<HTMLElement, Map<string, { value: string; priority: string }>>();
  let state = defaultState();
  let mobile = false;

  const storageKey = () => `${storagePrefix}:${mobile ? 'mobile' : 'desktop'}`;
  const set = (element: HTMLElement | null | undefined, property: string, value: string) => {
    if (!element) return;
    let properties = originalStyles.get(element);
    if (!properties) { properties = new Map(); originalStyles.set(element, properties); }
    if (!properties.has(property)) {
      properties.set(property, { value: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property) });
    }
    element.style.setProperty(property, value, 'important');
  };
  const restore = () => {
    originalStyles.forEach((properties, element) => properties.forEach((original, property) => {
      if (original.value) element.style.setProperty(property, original.value, original.priority);
      else element.style.removeProperty(property);
    }));
  };
  const css = (element: HTMLElement | null | undefined) => {
    if (!element) return undefined;
    const style = getComputedStyle(element);
    return {
      width: style.width, minHeight: style.minHeight, paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
      columnGap: style.columnGap, fontSize: style.fontSize, lineHeight: style.lineHeight,
      marginTop: style.marginTop, marginBottom: style.marginBottom, animationDuration: style.animationDuration,
    };
  };
  const px = (value: string | undefined) => Number.parseFloat(value ?? '') || 0;
  const apply = () => {
    // Read the current responsive CSS without our overrides. Default values leave
    // the original stylesheet in control, including after a viewport change.
    restore();
    const heroCSS = css(hero);
    const contentCSS = css(content);
    const flowerCSS = css(flowers);
    const copyCSS = css(copy);
    const actionsCSS = css(actions);
    const buttonCSS = css(button);
    const durations = flowerImages.map((image) => css(image)?.animationDuration);
    const { hero: layout, flowers: flower, copy: text, button: cta } = state;
    const move = (element: HTMLElement | null | undefined, values: LayoutValues) => {
      if (values.x || values.y) set(element, 'translate', `${values.x}px ${values.y}px`);
      if (values.scale !== undefined && values.scale !== 1) set(element, 'scale', String(values.scale));
      if (values.rotation) set(element, 'rotate', `${values.rotation}deg`);
    };
    move(content, layout);
    if (layout.width !== 1) {
      set(content, 'width', `${px(contentCSS?.width) * layout.width}px`);
      set(content, 'max-width', 'none');
    }
    if (layout.topSpace) set(hero, 'padding-top', `${Math.max(0, px(heroCSS?.paddingTop) + layout.topSpace)}px`);
    if (layout.bottomSpace) set(hero, 'padding-bottom', `${Math.max(0, px(heroCSS?.paddingBottom) + layout.bottomSpace)}px`);
    if (layout.height) set(hero, 'min-height', `${Math.max(0, px(heroCSS?.minHeight) + layout.height)}px`);
    move(flowers, flower);
    if (flower.gap) set(flowers, 'gap', `${Math.max(0, px(flowerCSS?.columnGap) + flower.gap)}px`);
    if (flower.opacity !== 1) set(flowers, 'opacity', String(flower.opacity));
    individualFlowers.forEach((element, index) => move(element, state[`flower${index + 1}`]));
    flowerImages.forEach((image, index) => {
      if (flower.speed === 0) set(image, 'animation-play-state', 'paused');
      else if (flower.speed !== 1) {
        const seconds = Number.parseFloat(durations[index] ?? '') || 1.8;
        set(image, 'animation-duration', `${seconds / flower.speed}s`);
      }
    });
    move(copy, text);
    if (text.fontScale !== 1) set(copy, 'font-size', `${px(copyCSS?.fontSize) * text.fontScale}px`);
    if (text.leading !== 1 || text.fontScale !== 1) set(copy, 'line-height', `${px(copyCSS?.lineHeight) * text.leading * text.fontScale}px`);
    if (text.width !== 1) {
      set(copy, 'width', `${px(copyCSS?.width) * text.width}px`);
      set(copy, 'max-width', 'none');
    }
    if (text.spaceAbove) set(copyContainer, 'padding-top', `${Math.max(0, text.spaceAbove)}px`);
    if (text.spaceBelow) set(copy, 'margin-bottom', `${px(copyCSS?.marginBottom) + text.spaceBelow}px`);
    move(button, cta);
    if (cta.fontScale !== 1) set(button, 'font-size', `${px(buttonCSS?.fontSize) * cta.fontScale}px`);
    if (cta.paddingX !== 1) {
      set(button, 'padding-left', `${px(buttonCSS?.paddingLeft) * cta.paddingX}px`);
      set(button, 'padding-right', `${px(buttonCSS?.paddingRight) * cta.paddingX}px`);
    }
    if (cta.paddingY !== 1) {
      set(button, 'padding-top', `${px(buttonCSS?.paddingTop) * cta.paddingY}px`);
      set(button, 'padding-bottom', `${px(buttonCSS?.paddingBottom) * cta.paddingY}px`);
    }
    if (cta.spaceAbove) set(actions, 'margin-top', `${px(actionsCSS?.marginTop) + cta.spaceAbove}px`);
  };
  const load = (isMobile: boolean) => {
    mobile = isMobile;
    state = defaultState();
    try {
      const raw = localStorage.getItem(storageKey());
      const stored = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      heroLayoutGroups.forEach((group) => {
        const values = stored[group.key];
        if (!values || typeof values !== 'object') return;
        group.sliders.forEach((slider) => {
          const value = (values as Record<string, unknown>)[slider.key];
          if (typeof value === 'number' && Number.isFinite(value)) state[group.key][slider.key] = Math.min(slider.max, Math.max(slider.min, value));
        });
      });
    } catch { /* Storage is optional. */ }
    apply();
  };
  return {
    load,
    apply,
    getState: () => structuredClone(state),
    getValue: (group: string, key: string) => state[group][key],
    setValue: (group: string, key: string, value: number) => {
      state[group][key] = value;
      try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch { /* Storage is optional. */ }
      apply();
    },
    reset: () => {
      try { localStorage.removeItem(storageKey()); } catch { /* Storage is optional. */ }
      state = defaultState();
      apply();
    },
    cleanup: restore,
  };
};
