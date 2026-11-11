import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initCtaWebglButtons } from './cta-webgl';
import { initHeadlineReveals, initHeroIntro, prepareHeadlineChars, splitHeadline } from './hero-intro';
import { initPortraitGlow } from './portrait-glow';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionContext: gsap.Context | undefined;
let cleanupListeners: Array<() => void> = [];
let currentPageKey = '';

const cleanupMotion = () => {
  cleanupListeners.forEach((cleanup) => cleanup());
  cleanupListeners = [];
  motionContext?.revert();
  motionContext = undefined;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
};

const addHoverTween = (element: HTMLElement, enterVars: gsap.TweenVars, leaveVars: gsap.TweenVars) => {
  const onEnter = () => gsap.to(element, enterVars);
  const onLeave = () => gsap.to(element, leaveVars);

  element.addEventListener('mouseenter', onEnter);
  element.addEventListener('mouseleave', onLeave);
  cleanupListeners.push(() => {
    element.removeEventListener('mouseenter', onEnter);
    element.removeEventListener('mouseleave', onLeave);
  });
};

const initStickyNavVisibility = () => {
  const nav = document.querySelector<HTMLElement>('.nav');

  if (!nav) {
    return () => {};
  }

  let lastScrollY = Math.max(window.scrollY, 0);
  let ticking = false;
  let pendingFrame = 0;

  const showNav = () => nav.classList.remove('nav--hidden');
  const hideNav = () => nav.classList.add('nav--hidden');

  const update = () => {
    const currentScrollY = Math.max(window.scrollY, 0);
    const delta = currentScrollY - lastScrollY;
    nav.classList.toggle('nav--scrolled', currentScrollY > 0);
    const shouldShow = reduceMotion.matches || currentScrollY <= 12 || delta < -4;
    const shouldHide = delta > 6 && currentScrollY > nav.offsetHeight;

    if (shouldShow) {
      showNav();
    } else if (shouldHide) {
      hideNav();
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    pendingFrame = requestAnimationFrame(update);
  };

  nav.classList.remove('nav--hidden');
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  nav.addEventListener('focusin', showNav);

  return () => {
    cancelAnimationFrame(pendingFrame);
    window.removeEventListener('scroll', onScroll);
    nav.removeEventListener('focusin', showNav);
    nav.classList.remove('nav--hidden', 'nav--scrolled');
  };
};

const initNavHoverGlow = () => {
  const nav = document.querySelector<HTMLElement>('.nav');
  const glow = nav?.querySelector<HTMLElement>('.nav-hover-glow');

  if (!nav || !glow || reduceMotion.matches) {
    return () => {};
  }

  const targets = [...nav.querySelectorAll<HTMLElement>('.logo, .navlink, .nav-cta')];

  if (!targets.length) {
    return () => {};
  }

  gsap.set(glow, { xPercent: -50, opacity: 0, scale: 0.92, scaleX: 1 });

  const xTo = gsap.quickTo(glow, 'x', { duration: 0.46, ease: 'power3.out' });
  const opacityTo = gsap.quickTo(glow, 'opacity', { duration: 0.24, ease: 'power2.out' });
  const scaleTo = gsap.quickTo(glow, 'scale', { duration: 0.32, ease: 'power3.out' });
  const scaleXTo = gsap.quickTo(glow, 'scaleX', { duration: 0.46, ease: 'power3.out' });
  let activeTarget: HTMLElement | null = null;

  const moveGlowTo = (target: HTMLElement, event?: PointerEvent) => {
    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetCenter = targetRect.left - navRect.left + targetRect.width / 2;
    const pointerX = event ? event.clientX - navRect.left : targetCenter;
    const mixedX = targetCenter * 0.72 + pointerX * 0.28;
    const scaleX = Math.min(1.34, Math.max(0.86, targetRect.width / 86));

    xTo(mixedX);
    opacityTo(1);
    scaleTo(1);
    scaleXTo(scaleX);
  };

  const hideGlow = () => {
    activeTarget = null;
    opacityTo(0);
    scaleTo(0.94);
    scaleXTo(0.92);
  };

  const onPointerEnter = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement;
    activeTarget = target;
    moveGlowTo(target, event);
  };

  const onPointerMove = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement;

    if (activeTarget === target) {
      moveGlowTo(target, event);
    }
  };

  const onFocus = (event: FocusEvent) => {
    const target = event.currentTarget as HTMLElement;
    activeTarget = target;
    moveGlowTo(target);
  };

  const onNavLeave = () => {
    if (!nav.matches(':focus-within')) {
      hideGlow();
    }
  };

  const onFocusOut = () => {
    requestAnimationFrame(() => {
      if (!nav.matches(':focus-within')) {
        hideGlow();
      }
    });
  };

  const onResize = () => {
    if (activeTarget) {
      moveGlowTo(activeTarget);
    }
  };

  targets.forEach((target) => {
    target.addEventListener('pointerenter', onPointerEnter);
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('focus', onFocus);
    target.addEventListener('blur', onFocusOut);
  });
  nav.addEventListener('pointerleave', onNavLeave);
  window.addEventListener('resize', onResize);

  return () => {
    targets.forEach((target) => {
      target.removeEventListener('pointerenter', onPointerEnter);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('focus', onFocus);
      target.removeEventListener('blur', onFocusOut);
    });
    nav.removeEventListener('pointerleave', onNavLeave);
    window.removeEventListener('resize', onResize);
    gsap.killTweensOf(glow);
    gsap.set(glow, { clearProps: 'transform,opacity' });
  };
};

const testimonialGridSelector = '.aboutintro.hp.herohp.lowerdown.testimonials + .grid';
const testimonialHeadingSelector = '.aboutintro.hp.herohp.lowerdown.testimonials';
const isTestimonialCard = (element: HTMLElement) => element.matches(`${testimonialGridSelector} .paragraph-5`);
const marketAttentionSelector = '.homecontainer .aboutintro.hp.herohp.lowerdown:not(.testimonials)';

const initMarketAttentionInteraction = () => {
  const section = document.querySelector<HTMLElement>(marketAttentionSelector);
  if (!section || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return () => {};
  }

  const eyesSvg = section.querySelector<SVGSVGElement>('.attention-eyes');
  const pupils = gsap.utils.toArray<SVGElement>('.attention-pupil', section);
  if (!pupils.length) {
    return () => {};
  }

  const eyeGeometry = pupils.map((pupil) =>
    pupil.classList.contains('attention-pupil--right')
      ? { eyeX: 103.403, eyeY: 48, pupilX: 126.09, pupilY: 47.7612 }
      : { eyeX: 31.7607, eyeY: 48, pupilX: 54.4478, pupilY: 47.7612 },
  );

  gsap.set(pupils, { x: 0, y: 0 });

  const xSetters = pupils.map((pupil) => gsap.quickTo(pupil, 'x', { duration: 0.24, ease: 'power3.out' }));
  const ySetters = pupils.map((pupil) => gsap.quickTo(pupil, 'y', { duration: 0.24, ease: 'power3.out' }));

  const butterfly = document.createElement('div');
  butterfly.className = 'attention-butterfly-cursor';
  butterfly.setAttribute('aria-hidden', 'true');

  const butterflyShadow = document.createElement('div');
  butterflyShadow.className = 'attention-butterfly-cursor-shadow';
  butterflyShadow.setAttribute('aria-hidden', 'true');

  const butterflyShadowScaler = document.createElement('div');
  butterflyShadowScaler.className = 'attention-butterfly-cursor-shadow__scale';

  const butterflyShadowInner = document.createElement('div');
  butterflyShadowInner.className = 'attention-butterfly-cursor-shadow__inner';

  const butterflyScaler = document.createElement('div');
  butterflyScaler.className = 'attention-butterfly-cursor__scale';

  const butterflyInner = document.createElement('div');
  butterflyInner.className = 'attention-butterfly-cursor__inner';

  const leftWing = document.createElement('img');
  leftWing.className = 'attention-butterfly-cursor__wing attention-butterfly-cursor__wing--left';
  leftWing.src = '/assets/butterfly/left-wing.png';
  leftWing.alt = '';
  leftWing.decoding = 'async';

  const rightWing = document.createElement('img');
  rightWing.className = 'attention-butterfly-cursor__wing attention-butterfly-cursor__wing--right';
  rightWing.src = '/assets/butterfly/right-wing.png';
  rightWing.alt = '';
  rightWing.decoding = 'async';

  const body = document.createElement('img');
  body.className = 'attention-butterfly-cursor__body';
  body.src = '/assets/butterfly/body.png';
  body.alt = '';
  body.decoding = 'async';

  const shadowLeftWing = document.createElement('img');
  shadowLeftWing.className =
    'attention-butterfly-cursor__wing attention-butterfly-cursor__wing--left attention-butterfly-cursor-shadow__piece';
  shadowLeftWing.src = '/assets/butterfly/left-wing.png';
  shadowLeftWing.alt = '';
  shadowLeftWing.decoding = 'async';

  const shadowRightWing = document.createElement('img');
  shadowRightWing.className =
    'attention-butterfly-cursor__wing attention-butterfly-cursor__wing--right attention-butterfly-cursor-shadow__piece';
  shadowRightWing.src = '/assets/butterfly/right-wing.png';
  shadowRightWing.alt = '';
  shadowRightWing.decoding = 'async';

  const shadowBody = document.createElement('img');
  shadowBody.className = 'attention-butterfly-cursor__body attention-butterfly-cursor-shadow__piece';
  shadowBody.src = '/assets/butterfly/body.png';
  shadowBody.alt = '';
  shadowBody.decoding = 'async';

  butterflyInner.append(leftWing, rightWing, body);
  butterflyShadowInner.append(shadowLeftWing, shadowRightWing, shadowBody);
  butterflyShadowScaler.append(butterflyShadowInner);
  butterflyShadow.append(butterflyShadowScaler);
  butterflyScaler.append(butterflyInner);
  butterfly.append(butterflyScaler);
  document.body.append(butterflyShadow, butterfly);

  gsap.set(butterfly, { autoAlpha: 0, xPercent: -50, yPercent: -50, rotation: 0 });
  gsap.set(butterflyScaler, { scale: 0.58, transformOrigin: '50% 50%' });
  gsap.set(butterflyShadow, { autoAlpha: 0, xPercent: -50, yPercent: -50, rotation: 0 });
  gsap.set(butterflyShadowScaler, { scale: 0.3, transformOrigin: '50% 50%' });
  gsap.set(butterflyShadowInner, { transformOrigin: '50% 58%' });
  gsap.set([leftWing, shadowLeftWing], { rotationY: -18, rotationZ: -3, transformOrigin: '100% 55%' });
  gsap.set([rightWing, shadowRightWing], { rotationY: 18, rotationZ: 3, transformOrigin: '0% 55%' });

  const xTo = gsap.quickTo(butterfly, 'x', { duration: 0.18, ease: 'power3.out' });
  const yTo = gsap.quickTo(butterfly, 'y', { duration: 0.18, ease: 'power3.out' });
  const rotationTo = gsap.quickTo(butterfly, 'rotation', { duration: 0.28, ease: 'power3.out' });
  const shadowXTo = gsap.quickTo(butterflyShadow, 'x', { duration: 0.22, ease: 'power3.out' });
  const shadowYTo = gsap.quickTo(butterflyShadow, 'y', { duration: 0.22, ease: 'power3.out' });
  const shadowRotationTo = gsap.quickTo(butterflyShadow, 'rotation', { duration: 0.34, ease: 'power3.out' });
  let butterflyVisible = false;
  let hasPointerPosition = false;
  let pointerIsInsideBand = false;
  let currentScale = 0.96;
  let currentShadowScale = 0.58;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerTime = performance.now();

  const wingHalfBeat = 0.34;
  const wingFlap = gsap
    .timeline({ paused: true, repeat: -1, defaults: { duration: wingHalfBeat, ease: 'sine.inOut' } })
    .to([leftWing, shadowLeftWing], { rotationY: 52, rotationZ: -9 }, 0)
    .to([rightWing, shadowRightWing], { rotationY: -52, rotationZ: 9 }, 0)
    .to(butterflyShadowInner, { scaleX: 1.14, scaleY: 0.92, x: 5, opacity: 0.78 }, 0)
    .to([leftWing, shadowLeftWing], { rotationY: -18, rotationZ: -3 }, wingHalfBeat)
    .to([rightWing, shadowRightWing], { rotationY: 18, rotationZ: 3 }, wingHalfBeat)
    .to(butterflyShadowInner, { scaleX: 0.98, scaleY: 1.04, x: 0, opacity: 1 }, wingHalfBeat);

  const flightBob = gsap.to(butterflyInner, {
    y: -5,
    duration: 0.74,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    paused: true,
  });

  const showButterfly = () => {
    if (butterflyVisible) {
      return;
    }

    butterflyVisible = true;
    document.body.classList.add('is-attention-butterfly-cursor');
    wingFlap.play();
    flightBob.play();
    gsap.fromTo(
      butterfly,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.18, ease: 'power2.out', overwrite: 'auto' },
    );
    gsap.fromTo(
      butterflyScaler,
      { scale: 0.38 },
      { scale: currentScale, duration: 0.28, ease: 'power4.out', overwrite: 'auto' },
    );
    gsap.fromTo(
      butterflyShadow,
      { autoAlpha: 0 },
      { autoAlpha: 0.34, duration: 0.3, ease: 'power3.out', overwrite: 'auto' },
    );
    gsap.fromTo(
      butterflyShadowScaler,
      { scale: 0.22 },
      { scale: currentShadowScale, duration: 0.32, ease: 'power3.out', overwrite: 'auto' },
    );
  };

  const hideButterfly = () => {
    hasPointerPosition = false;

    if (!butterflyVisible) {
      return;
    }

    butterflyVisible = false;
    gsap.to(butterfly, {
      autoAlpha: 0,
      duration: 0.22,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: () => {
        if (!butterflyVisible) {
          document.body.classList.remove('is-attention-butterfly-cursor');
          wingFlap.pause();
          flightBob.pause();
        }
      },
    });
    gsap.to(butterflyScaler, { scale: 0.34, duration: 0.22, ease: 'power3.in', overwrite: 'auto' });
    gsap.to(butterflyShadow, {
      autoAlpha: 0,
      duration: 0.22,
      ease: 'power2.in',
      overwrite: 'auto',
    });
    gsap.to(butterflyShadowScaler, { scale: 0.18, duration: 0.22, ease: 'power3.in', overwrite: 'auto' });
  };

  const snapButterflyToPointer = (event: PointerEvent, now: number) => {
    const shadowX = event.clientX + 72;
    const shadowY = event.clientY + 30;

    hasPointerPosition = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = now;
    currentScale = 0.96;
    currentShadowScale = 0.58;

    gsap.set(butterfly, { x: event.clientX, y: event.clientY, rotation: 0 });
    gsap.set(butterflyShadow, { x: shadowX, y: shadowY, rotation: 0 });
    gsap.set(butterflyScaler, { scale: currentScale });
    gsap.set(butterflyShadowScaler, { scale: currentShadowScale });

    xTo(event.clientX, event.clientX);
    yTo(event.clientY, event.clientY);
    rotationTo(0, 0);
    shadowXTo(shadowX, shadowX);
    shadowYTo(shadowY, shadowY);
    shadowRotationTo(0, 0);
  };

  const updateButterfly = (event: PointerEvent, forceSpawnAtPointer = false) => {
    const now = performance.now();
    const shouldSpawnAtPointer = forceSpawnAtPointer || !hasPointerPosition || !butterflyVisible;

    if (shouldSpawnAtPointer) {
      snapButterflyToPointer(event, now);
      return;
    }

    const elapsed = Math.max(16, now - lastPointerTime);
    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    const velocityX = (deltaX / elapsed) * 16.67;
    const velocityY = (deltaY / elapsed) * 16.67;
    const speed = Math.hypot(velocityX, velocityY);
    const movement = Math.max(speed, Math.hypot(deltaX, deltaY));
    const rotation = gsap.utils.clamp(-58, 58, velocityX * 0.32);
    currentScale = gsap.utils.clamp(0.94, 1.42, 0.96 + movement * 0.012);
    currentShadowScale = gsap.utils.clamp(0.5, 1.18, 0.58 + movement * 0.008);

    xTo(event.clientX);
    yTo(event.clientY);
    rotationTo(rotation);
    shadowXTo(event.clientX + 72);
    shadowYTo(event.clientY + 30);
    shadowRotationTo(rotation * 0.34);
    gsap.to(butterflyScaler, {
      scale: currentScale,
      duration: 0.24,
      ease: 'power3.out',
      overwrite: 'auto',
    });
    gsap.to(butterflyShadow, {
      opacity: gsap.utils.clamp(0.2, 0.38, 0.26 + movement * 0.0015),
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(butterflyShadowScaler, {
      scale: currentShadowScale,
      duration: 0.26,
      ease: 'power3.out',
      overwrite: 'auto',
    });

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = now;
  };

  const expandedSectionRect = () => {
    const rect = section.getBoundingClientRect();
    const verticalOutset = Math.min(Math.max(rect.height * 0.12, 36), window.innerHeight * 0.1);
    return {
      top: rect.top - verticalOutset,
      right: window.innerWidth,
      bottom: rect.bottom + verticalOutset,
      left: 0,
    };
  };

  const isInsideInteractionBand = (event: PointerEvent) => {
    const rect = expandedSectionRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };

  const updateEyes = (event: PointerEvent) => {
    if (!eyesSvg) {
      return;
    }

    const svgRect = eyesSvg.getBoundingClientRect();

    pupils.forEach((_, index) => {
      const geometry = eyeGeometry[index];
      const centerX = svgRect.left + (geometry.eyeX / 136) * svgRect.width;
      const centerY = svgRect.top + (geometry.eyeY / 96) * svgRect.height;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(1, Math.hypot(deltaX, deltaY) / Math.max(window.innerWidth * 0.26, 280));
      const targetPupilX = geometry.eyeX + Math.cos(angle) * 22.75 * distance;
      const targetPupilY = geometry.eyeY + Math.sin(angle) * 9.25 * distance;
      const svgScaleX = svgRect.width / 136;
      const svgScaleY = svgRect.height / 96;

      xSetters[index]((targetPupilX - geometry.pupilX) * svgScaleX);
      ySetters[index]((targetPupilY - geometry.pupilY) * svgScaleY);
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    updateEyes(event);
    const isInsideBand = isInsideInteractionBand(event);

    if (isInsideBand) {
      updateButterfly(event, !pointerIsInsideBand);
      showButterfly();
    } else {
      hideButterfly();
    }

    pointerIsInsideBand = isInsideBand;
  };

  const onWindowBlur = () => {
    pointerIsInsideBand = false;
    hideButterfly();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('blur', onWindowBlur);

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('blur', onWindowBlur);
    document.body.classList.remove('is-attention-butterfly-cursor');
    wingFlap.kill();
    flightBob.kill();
    gsap.killTweensOf([
      butterfly,
      butterflyShadow,
      butterflyScaler,
      butterflyShadowScaler,
      butterflyInner,
      butterflyShadowInner,
      leftWing,
      rightWing,
      shadowLeftWing,
      shadowRightWing,
    ]);
    butterfly.remove();
    butterflyShadow.remove();
    gsap.killTweensOf(pupils);
    gsap.set(pupils, { clearProps: 'transform' });
  };
};

const initTestimonialHeartParticles = (grid: HTMLElement) => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return;
  }

  const heading = document.querySelector<HTMLElement>(testimonialHeadingSelector);
  const activeHearts = new Set<HTMLElement>();
  const activeTweens = new Set<gsap.core.Animation>();
  const heartTweens = new Map<HTMLElement, gsap.core.Animation>();
  const heartSprites = ['/assets/hearts/heart01.png', '/assets/hearts/heart02.png', '/assets/hearts/heart03.png'];
  let lastEmit = 0;

  heartSprites.forEach((src) => {
    const image = new Image();
    image.src = src;
  });

  const getExpandedBandRect = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    const marginTop = Number.parseFloat(styles.marginTop) || 0;
    const marginBottom = Number.parseFloat(styles.marginBottom) || 0;

    return {
      top: rect.top - marginTop,
      bottom: rect.bottom + marginBottom,
    };
  };

  const isInsideTestimonialBand = (event: PointerEvent) => {
    const rects = [heading, grid]
      .filter((element): element is HTMLElement => Boolean(element))
      .map(getExpandedBandRect);
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return event.clientY >= top && event.clientY <= bottom;
  };

  const removeHeart = (heart: HTMLElement, tween?: gsap.core.Animation) => {
    const trackedTween = tween ?? heartTweens.get(heart);
    trackedTween?.kill();
    if (trackedTween) {
      activeTweens.delete(trackedTween);
      heartTweens.delete(heart);
    }
    activeHearts.delete(heart);
    heart.remove();
  };

  const emitHeart = (event: PointerEvent) => {
    const now = performance.now();

    if (now - lastEmit < 42) {
      return;
    }

    lastEmit = now;

    if (activeHearts.size > 28) {
      const oldestHeart = activeHearts.values().next().value;
      if (oldestHeart) removeHeart(oldestHeart);
    }

    const heart = document.createElement('img');
    heart.className = 'testimonial-heart-particle';
    heart.setAttribute('aria-hidden', 'true');
    heart.alt = '';
    heart.decoding = 'async';
    heart.src = gsap.utils.random(heartSprites);
    document.body.append(heart);
    activeHearts.add(heart);

    const driftX = gsap.utils.random(-82, 82);
    const driftY = gsap.utils.random(-132, -58);
    const startScale = gsap.utils.random(0.62, 0.88);
    const endScale = gsap.utils.random(1.8, 2.7);
    const rotation = gsap.utils.random(-28, 28);

    const duration = gsap.utils.random(1.08, 1.44);
    const tween = gsap.timeline({ onComplete: () => removeHeart(heart, tween) });

    tween.fromTo(
      heart,
      {
        x: event.clientX - 8,
        y: event.clientY - 10,
        scale: startScale,
        rotation,
        autoAlpha: 0.96,
        filter: 'blur(0px)',
      },
      {
        x: event.clientX + driftX,
        y: event.clientY + driftY,
        scale: endScale,
        rotation: rotation + gsap.utils.random(-24, 24),
        duration,
        ease: 'power3.out',
      },
      0,
    );

    tween.to(
      heart,
      {
        filter: 'blur(4.8px)',
        duration: duration * 0.5,
        ease: 'power2.in',
      },
      duration * 0.36,
    );

    tween.to(
      heart,
      {
        autoAlpha: 0,
        duration: duration * 0.66,
        ease: 'power2.in',
      },
      duration * 0.28,
    );

    activeTweens.add(tween);
    heartTweens.set(heart, tween);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (isInsideTestimonialBand(event)) {
      emitHeart(event);
    }
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });

  cleanupListeners.push(() => {
    window.removeEventListener('pointermove', onPointerMove);
    activeTweens.forEach((tween) => tween.kill());
    activeTweens.clear();
    heartTweens.clear();
    activeHearts.forEach((heart) => heart.remove());
    activeHearts.clear();
  });
};

const initTestimonials = () => {
  const grid = document.querySelector<HTMLElement>(testimonialGridSelector);
  if (!grid) {
    return;
  }

  const cards = gsap.utils.toArray<HTMLElement>('.paragraph-5', grid);
  if (!cards.length) {
    return;
  }

  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', 'Client testimonials');
  gsap.set(cards, { transformOrigin: 'left center' });

  cards.forEach((card) => {
    card.setAttribute('role', 'listitem');

    const onEnter = () => {
      gsap.to(card, {
        y: -5,
        duration: 0.34,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    };
    const onLeave = () => {
      gsap.to(card, {
        y: 0,
        duration: 0.42,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);

    cleanupListeners.push(() => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mouseleave', onLeave);
    });
  });

  gsap.set(cards, { autoAlpha: 0, y: 18 });

  ScrollTrigger.batch(cards, {
    once: true,
    start: 'top 84%',
    onEnter: (batch) => {
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        clearProps: 'opacity,visibility,transform',
        duration: 0.62,
        ease: 'power3.out',
        stagger: 0.06,
      });
    },
  });

  initTestimonialHeartParticles(grid);
};

const initAssociatePortraitCloud = () => {
  const cloud = document.querySelector<HTMLElement>('#aboutmesection .associate-portrait-cloud');
  if (!cloud) {
    return;
  }

  const faces = gsap.utils.toArray<HTMLElement>('.associate-face', cloud);
  if (!faces.length) {
    return;
  }

  const orbitPlanes = [
    { rx: 0.49, ry: 0.16, rotation: -4, depth: 0.9, speed: 0.00013 },
    { rx: 0.48, ry: 0.17, rotation: -34, depth: 0.78, speed: -0.00011 },
    { rx: 0.46, ry: 0.155, rotation: 31, depth: 0.84, speed: 0.00015 },
  ];
  const faceOrbitIndexes = [1, 2, 0, 0, 2, 1, 0, 2, 1];
  const facePhases = [0.04, 0.61, 0.86, 0.17, 0.42, 0.78, 0.55, 0.3, 0.93];
  const faceSpeedMultipliers = [0.95, 1.08, 0.86, 1.16, 0.92, 1.04, 0.82, 1.12, 0.98];
  const tau = Math.PI * 2;
  let elapsed = 0;

  const getCloudWidth = () => Math.max(320, cloud.getBoundingClientRect().width);

  const writePositions = (time: number) => {
    const cloudWidth = getCloudWidth();

    for (let i = 0; i < faces.length; i += 1) {
      const plane = orbitPlanes[faceOrbitIndexes[i] % orbitPlanes.length];
      const angle = facePhases[i] * tau + time * plane.speed * faceSpeedMultipliers[i];
      const cosT = Math.cos(angle);
      const sinT = Math.sin(angle);
      const rx = cloudWidth * plane.rx;
      const ry = cloudWidth * plane.ry;
      const rotation = (plane.rotation * Math.PI) / 180;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);

      const orbitX = cosT * rx;
      const orbitY = sinT * ry;
      const x = orbitX * cosR - orbitY * sinR;
      const y = orbitX * sinR + orbitY * cosR;
      const depth = sinT * plane.depth;
      const depthProgress = (depth + 1) / 2;
      const scale = 0.76 + depthProgress * 0.48;
      const opacity = 0.48 + depthProgress * 0.52;

      const face = faces[i];
      const style = face.style;
      style.setProperty('--x', `${x}px`);
      style.setProperty('--y', `${y}px`);
      style.setProperty('--depth-scale', scale.toFixed(3));
      style.setProperty('--orbit-opacity', opacity.toFixed(3));
      style.zIndex = depth > -0.08 ? '6' : '1';
    }
  };

  writePositions(0);
  gsap.set(faces, { '--reveal-alpha': 0, '--reveal-scale': 0.35, '--float-y': '0px' });

  let tickerFn: ((time: number) => void) | undefined;
  const startTicker = () => {
    const startTime = performance.now();
    tickerFn = () => {
      elapsed = performance.now() - startTime;
      writePositions(elapsed);
    };
    gsap.ticker.add(tickerFn);
  };

  const onResize = () => writePositions(elapsed);
  window.addEventListener('resize', onResize);

  cleanupListeners.push(() => {
    window.removeEventListener('resize', onResize);

    if (tickerFn) {
      gsap.ticker.remove(tickerFn);
      tickerFn = undefined;
    }
  });

  ScrollTrigger.create({
    trigger: cloud,
    start: 'top 82%',
    once: true,
    onEnter: () => {
      startTicker();
      gsap.to(faces, {
        '--reveal-alpha': 1,
        '--reveal-scale': 1,
        duration: 0.9,
        ease: 'power4.out',
        stagger: { each: 0.07, from: 'random' },
      });
    },
  });
};

const initAgencyAnthem = () => {
  const section = document.querySelector<HTMLElement>('.agency-anthem-section');
  if (!section) {
    return;
  }

  const lines = gsap.utils.toArray<HTMLElement>('.agency-anthem-line', section);
  if (!lines.length) {
    return;
  }

  lines.forEach((line) => {
    const text = line.querySelector<HTMLElement>('.agency-anthem-line__base')?.textContent ?? line.textContent ?? '';
    line.textContent = text.trim();
  });

  if (reduceMotion.matches) {
    gsap.set(lines, { autoAlpha: 1, clearProps: 'transform,filter' });
    return;
  }

  lines.forEach((line, index) => {
    const chars = splitHeadline(line);
    if (!chars.length) return;

    gsap.set(line, { autoAlpha: 1 });
    prepareHeadlineChars(chars);

    gsap.to(chars, {
      autoAlpha: 1,
      yPercent: 0,
      rotationX: 0,
      filter: 'blur(0px)',
      ease: 'none',
      stagger: {
        amount: Math.min(1.08, Math.max(0.42, chars.length * 0.016)),
        from: 'start',
      },
      scrollTrigger: {
        trigger: line,
        start: 'top 145%',
        end: 'bottom 62%',
        scrub: 0.45,
        refreshPriority: -30 + index,
      },
    });
  });
};

const initCylinderScene = () => {
  const root = document.querySelector<HTMLElement>('.cylinder-home');
  if (!root) {
    return;
  }

  let cleanup: (() => void) | undefined;
  let cancelled = false;
  const hero = root.querySelector<HTMLElement>('.agency-cylinder-hero');

  import('./cylinder-scene')
    .then(({ initCylinderScene: initSharedCylinderScene }) => {
      if (cancelled) {
        return;
      }

      cleanup = initSharedCylinderScene(root);
    })
    .catch(() => {
      hero?.classList.add('is-cylinder-fallback');
    });

  cleanupListeners.push(() => {
    cancelled = true;
    cleanup?.();
  });
};

const initMotion = () => {
  const pageKey = `${window.location.pathname}${window.location.search}`;
  if (currentPageKey === pageKey && motionContext) {
    return;
  }

  currentPageKey = pageKey;
  cleanupMotion();
  cleanupListeners.push(initPortraitGlow());
  cleanupListeners.push(initStickyNavVisibility());

  if (reduceMotion.matches) {
    return;
  }

  motionContext = gsap.context(() => {
    gsap.fromTo(
      '#main-content',
      { autoAlpha: 0.92, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        clearProps: 'opacity,visibility,transform',
        duration: 0.38,
        ease: 'power3.out',
      },
    );

    const heroIntro = initHeroIntro();
    cleanupListeners.push(heroIntro.cleanup);
    const headlineReveals = initHeadlineReveals(heroIntro.animatedElements);
    cleanupListeners.push(headlineReveals.cleanup);

    const animatedTextElements = new Set([...heroIntro.animatedElements, ...headlineReveals.animatedElements]);

    const firstReadSelectors = [
      '.nav',
      '.copysection.projectcopy .subline.homesub',
      '.copysection.projectcopy .mainline.smallhomesection',
      '.copysection.projectcopy .splitpara',
      '.aboutintro.hp.herohp > *',
      '.homecontainer > *:first-child',
      '.heading-3.topheader',
      '.heading-4',
      '.projecttitle.headertitledesc.lefty.brand-leader.morework.pricing:not(.lowerdown)',
    ];

    const firstReadElements = gsap.utils
      .toArray<HTMLElement>(firstReadSelectors.join(', '))
      .filter((element) => !animatedTextElements.has(element));

    if (firstReadElements.length) {
      gsap.set(firstReadElements, { autoAlpha: 0, y: 14 });
      gsap.to(firstReadElements, {
        autoAlpha: 1,
        y: 0,
        clearProps: 'opacity,visibility,transform',
        delay: 0.04,
        duration: 0.72,
        ease: 'power3.out',
        stagger: 0.055,
      });
    }

    const immediateProjectCards = gsap.utils.toArray<HTMLElement>(
      '.agency-pattern-selected-grid .projectblocklink:nth-of-type(-n + 2)',
    );
    const isImmediateProjectElement = (element: HTMLElement) =>
      immediateProjectCards.some((card) => card === element || card.contains(element));

    const revealElements = gsap.utils
      .toArray<HTMLElement>(
        [
          '.projectblock',
          '.projectblocklink',
          '.smallproject',
          '.writingblocks',
          '.projectimg',
          '.projectimg-copy',
          '.projectimg-copy-copy',
          '.posttext > *',
          '.paragraph-4',
          '.paragraph-5',
          '.div-block-31',
        ].join(', '),
      )
      .filter(
        (element) =>
          !firstReadElements.includes(element) &&
          !animatedTextElements.has(element) &&
          !isTestimonialCard(element) &&
          !isImmediateProjectElement(element),
      );

    if (revealElements.length) {
      gsap.set(revealElements, { autoAlpha: 0, y: 22 });
      ScrollTrigger.batch(revealElements, {
        once: true,
        start: 'top 88%',
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            clearProps: 'opacity,visibility,transform',
            duration: 0.68,
            ease: 'power3.out',
            stagger: 0.045,
          });
        },
      });
    }

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const hoverCards = gsap.utils.toArray<HTMLElement>('.projectblocklink, .smallproject, .writingblocks');
      hoverCards.forEach((card) => {
        addHoverTween(
          card,
          { y: -5, duration: 0.32, ease: 'power3.out', overwrite: 'auto' },
          { y: 0, duration: 0.42, ease: 'power3.out', overwrite: 'auto' },
        );
      });

    }

    initTestimonials();
    initAssociatePortraitCloud();
    initAgencyAnthem();
    initCylinderScene();
    cleanupListeners.push(initMarketAttentionInteraction());
    cleanupListeners.push(initNavHoverGlow());
    cleanupListeners.push(initCtaWebglButtons());
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });
};

document.addEventListener('astro:before-swap', cleanupMotion);
document.addEventListener('astro:page-load', initMotion);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMotion, { once: true });
} else {
  initMotion();
}
