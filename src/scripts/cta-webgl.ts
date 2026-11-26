const ctaSelector = '.ctalink, .mainline.inver.rightsidecontact.contact';
const ambientCtaSelector = '.ctalink:not(.personal-secondary-cta), .mainline.inver.rightsidecontact.contact';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;

  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_purple;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 i = floor(point);
    vec2 f = fract(point);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(point);
      point *= 2.02;
      amplitude *= 0.52;
    }

    return value;
  }

  void main() {
    vec2 uv = v_uv;
    vec2 aspect = vec2(max(u_resolution.x / max(u_resolution.y, 1.0), 1.0), 1.0);
    vec2 field = uv * aspect;
    float time = u_time * 0.001;
    float pointerGlow = smoothstep(0.62, 0.0, distance(uv, u_pointer));
    float satin = sin((uv.x * 16.0) - (uv.y * 5.2) + time * 2.1) * 0.5 + 0.5;
    float fineNoise = noise(field * 18.0 + vec2(time * 0.9, -time * 0.44));
    float ribbon = smoothstep(0.16, 1.0, satin * 0.35 + fineNoise * 0.18 + pointerGlow * 0.35);

    vec2 glitterGridA = uv * u_resolution.xy / 7.0 + vec2(time * 1.6, -time * 0.8);
    vec2 glitterCellA = floor(glitterGridA);
    vec2 glitterLocalA = fract(glitterGridA) - 0.5;
    float glitterSeedA = hash(glitterCellA);
    float glitterPickA = step(0.66, glitterSeedA);
    float glitterTwinkleA = pow(sin(time * 14.0 + glitterSeedA * 28.0) * 0.5 + 0.5, 7.0);
    float glitterDotA = smoothstep(0.32, 0.0, length(glitterLocalA));
    float glitterSquareA = smoothstep(0.24, 0.0, max(abs(glitterLocalA.x), abs(glitterLocalA.y)));
    float glitterCrossA =
      smoothstep(0.04, 0.0, abs(glitterLocalA.x)) +
      smoothstep(0.04, 0.0, abs(glitterLocalA.y));
    float glitterA = glitterPickA * glitterTwinkleA * max(glitterSquareA * 0.72, glitterDotA * clamp(glitterCrossA, 0.0, 1.0));

    vec2 glitterGridB = uv * u_resolution.xy / 10.5 - vec2(time * 0.8, time * 1.1);
    vec2 glitterCellB = floor(glitterGridB);
    vec2 glitterLocalB = fract(glitterGridB) - 0.5;
    float glitterSeedB = hash(glitterCellB + 19.7);
    float glitterPickB = step(0.76, glitterSeedB);
    float glitterTwinkleB = pow(sin(time * 10.0 + glitterSeedB * 31.0) * 0.5 + 0.5, 5.0);
    float glitterStarB =
      smoothstep(0.25, 0.0, abs(glitterLocalB.x + glitterLocalB.y)) *
      smoothstep(0.25, 0.0, abs(glitterLocalB.x - glitterLocalB.y));
    float glitterB = glitterPickB * glitterTwinkleB * glitterStarB;

    float sugar =
      smoothstep(0.88, 0.99, noise(uv * u_resolution.xy * 0.82 + vec2(time * 7.4, -time * 6.2))) * 0.42;

    vec3 base = mix(vec3(0.88, 0.02, 0.43), vec3(0.32, 0.07, 0.63), u_purple);
    vec3 bright = mix(vec3(1.0, 0.18, 0.58), vec3(0.56, 0.19, 0.92), u_purple);
    vec3 candy = mix(vec3(1.0, 0.48, 0.76), vec3(0.76, 0.52, 1.0), u_purple);
    vec3 glitter = mix(vec3(1.0, 0.88, 0.98), vec3(0.94, 0.88, 1.0), u_purple);
    vec3 color = mix(base, bright, ribbon);
    color = mix(color, candy, pointerGlow * 0.28);
    color = mix(color, glitter, clamp(glitterA * 0.98 + glitterB * 0.9 + sugar * 0.28, 0.0, 1.0));
    color += mix(vec3(0.11, 0.018, 0.08), vec3(0.07, 0.025, 0.12), u_purple) * (glitterA + glitterB);
    color += (fineNoise - 0.5) * 0.018;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const compileShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);

  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
};

const ensureCtaLabel = (cta: HTMLElement) => {
  if (cta.querySelector(':scope > .cta-label')) {
    return;
  }

  const label = document.createElement('span');
  label.className = 'cta-label';

  while (cta.firstChild) {
    label.append(cta.firstChild);
  }

  cta.append(label);
};

const createRenderer = (cta: HTMLElement) => {
  ensureCtaLabel(cta);
  const ambient = cta.matches(ambientCtaSelector);

  const canvas = document.createElement('canvas');
  canvas.className = 'cta-noise-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  cta.prepend(canvas);

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    canvas.remove();
    return null;
  }

  const program = createProgram(gl);

  if (!program) {
    canvas.remove();
    return null;
  }

  const positionBuffer = gl.createBuffer();
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const pointerLocation = gl.getUniformLocation(program, 'u_pointer');
  const purpleLocation = gl.getUniformLocation(program, 'u_purple');
  const pointer = { x: 0.5, y: 0.5 };
  let animationFrame = 0;
  let running = false;
  let active = false;
  let visible = false;
  let destroyed = false;
  let previousTime = 0;
  let shaderTime = 0;
  let speed = ambient ? 0.18 : 1;
  let purpleBlend = 0;

  if (!positionBuffer || positionLocation < 0 || !timeLocation || !resolutionLocation || !pointerLocation || !purpleLocation) {
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);
    canvas.remove();
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const resize = () => {
    const rect = cta.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
  };

  const render = (time: number) => {
    animationFrame = 0;
    if (!running || destroyed) return;

    const transitioning = active || speed > 0.22 || purpleBlend > 0.02;
    const frameInterval = ambient && !transitioning ? 1000 / 30 : 1000 / 60;
    if (previousTime && time - previousTime < frameInterval - 0.5) {
      animationFrame = requestAnimationFrame(render);
      return;
    }

    const delta = previousTime ? Math.min(time - previousTime, 100) : 0;
    previousTime = time;
    const easing = 1 - Math.exp(-delta / 180);
    const targetSpeed = ambient && !active ? 0.18 : 1;
    speed += (targetSpeed - speed) * easing;
    purpleBlend += ((ambient && active ? 1 : 0) - purpleBlend) * easing;
    shaderTime += delta * speed;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(timeLocation, shaderTime);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform2f(pointerLocation, pointer.x, pointer.y);
    gl.uniform1f(purpleLocation, purpleBlend);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (running) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const setPointer = (event: PointerEvent | MouseEvent | FocusEvent) => {
    if (!('clientX' in event)) {
      pointer.x = 0.5;
      pointer.y = 0.5;
      return;
    }

    const rect = cta.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointer.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    pointer.y = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  };

  const pause = () => {
    running = false;
    previousTime = 0;

    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const reconcilePlayback = () => {
    const shouldRun = !destroyed && visible && !document.hidden && !prefersReducedMotion.matches && (ambient || active);
    if (!shouldRun) {
      pause();
    } else if (!running) {
      running = true;
      animationFrame = requestAnimationFrame(render);
    }
  };

  const setActive = (value: boolean, event?: PointerEvent | MouseEvent | FocusEvent) => {
    if (event) setPointer(event);
    active = value;
    cta.classList.toggle('cta-webgl-active', active);
    if (!active) {
      pointer.x = 0.5;
      pointer.y = 0.5;
    }
    reconcilePlayback();
  };

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    reconcilePlayback();
  });
  resizeObserver.observe(cta);
  intersectionObserver.observe(cta);
  document.addEventListener('visibilitychange', reconcilePlayback);
  prefersReducedMotion.addEventListener('change', reconcilePlayback);

  const destroy = () => {
    destroyed = true;
    pause();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', reconcilePlayback);
    prefersReducedMotion.removeEventListener('change', reconcilePlayback);
    gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);
    canvas.remove();
  };

  resize();

  return { destroy, resize, setPointer, setActive };
};

export const initCtaWebglButtons = () => {
  if (prefersReducedMotion.matches) {
    return () => {};
  }

  const ctas = [...document.querySelectorAll<HTMLElement>(ctaSelector)];

  if (!ctas.length) {
    return () => {};
  }

  const cleanupCallbacks: Array<() => void> = [];

  ctas.forEach((cta) => {
    const renderer = createRenderer(cta);

    if (!renderer) {
      return;
    }

    cta.classList.add('cta-webgl-ready');

    let hovered = cta.matches(':hover');
    let focused = cta.matches(':focus');
    const reconcileInteraction = (event?: PointerEvent | FocusEvent) => renderer.setActive(hovered || focused, event);
    const onPointerEnter = (event: PointerEvent) => {
      hovered = true;
      reconcileInteraction(event);
    };
    const onPointerMove = (event: PointerEvent) => renderer.setPointer(event);
    const onPointerLeave = () => {
      hovered = false;
      reconcileInteraction();
    };
    const onFocus = (event: FocusEvent) => {
      focused = true;
      reconcileInteraction(event);
    };
    const onBlur = () => {
      focused = false;
      reconcileInteraction();
    };
    const onResize = () => renderer.resize();

    cta.addEventListener('pointerenter', onPointerEnter);
    cta.addEventListener('pointermove', onPointerMove);
    cta.addEventListener('pointerleave', onPointerLeave);
    cta.addEventListener('focus', onFocus);
    cta.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    reconcileInteraction();

    cleanupCallbacks.push(() => {
      cta.removeEventListener('pointerenter', onPointerEnter);
      cta.removeEventListener('pointermove', onPointerMove);
      cta.removeEventListener('pointerleave', onPointerLeave);
      cta.removeEventListener('focus', onFocus);
      cta.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      cta.classList.remove('cta-webgl-ready', 'cta-webgl-active');
      renderer.destroy();
    });
  });

  return () => cleanupCallbacks.forEach((cleanup) => cleanup());
};
