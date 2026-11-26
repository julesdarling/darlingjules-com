import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const initPortraitRoles = () => {
  const rotator = document.querySelector<HTMLElement>('#about-jules .portrait-role-rotator');
  const words = rotator ? [...rotator.querySelectorAll<HTMLElement>('.portrait-role-word')] : [];
  if (!rotator || words.length < 2) return () => {};

  const media = gsap.matchMedia();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.set(words, { autoAlpha: 0, yPercent: 24 });
    gsap.set(words[0], { autoAlpha: 1, yPercent: 0 });

    const timeline = gsap.timeline({ paused: true, repeat: -1 });
    words.forEach((word, index) => {
      const nextWord = words[(index + 1) % words.length];

      timeline
        .to(
          word,
          {
            autoAlpha: 0,
            yPercent: -24,
            duration: 0.22,
            ease: 'power2.in',
          },
          '+=2.6',
        )
        .fromTo(
          nextWord,
          { autoAlpha: 0, yPercent: 24 },
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: 0.38,
            ease: 'power3.out',
            immediateRender: false,
          },
        );
    });

    let isVisible = false;
    const reconcile = () => {
      if (isVisible && !document.hidden) timeline.play();
      else timeline.pause();
    };
    const updateVisibility = (trigger: ScrollTrigger) => {
      isVisible = trigger.isActive;
      reconcile();
    };
    const trigger = ScrollTrigger.create({
      trigger: rotator,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: updateVisibility,
      onRefresh: updateVisibility,
    });

    document.addEventListener('visibilitychange', reconcile);
    updateVisibility(trigger);

    return () => {
      document.removeEventListener('visibilitychange', reconcile);
      trigger.kill();
      timeline.kill();
    };
  });

  // matchMedia owns the animation context and restores the original CSS styles.
  return () => media.revert();
};
