const vertexSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  varying vec2 v_uv;
  uniform vec2 u_size;
  uniform vec2 u_radii;
  uniform vec2 u_blob;
  uniform float u_strength;
  uniform float u_time;

  float hash(vec2 cell) {
    return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  }

  float ellipseDistance(vec2 point, vec2 radii) {
    float k0 = length(point / radii);
    float k1 = length(point / (radii * radii));
    return k0 * (k0 - 1.0) / max(k1, 0.0001);
  }

  float smoothUnion(float a, float b, float softness) {
    float blend = clamp(0.5 + 0.5 * (b - a) / softness, 0.0, 1.0);
    return mix(b, a, blend) - softness * blend * (1.0 - blend);
  }

  void main() {
    vec2 point = (v_uv - 0.5) * u_size;
    vec2 pull = u_blob * u_strength * 0.025;
    float oval = ellipseDistance(point - pull, u_radii + 3.0);
    float blobDistance = length(point - u_blob);
    float blob = blobDistance - 74.0;
    float field = mix(oval, smoothUnion(oval, blob, 200.0), u_strength);
    float outside = max(field, 0.0);

    vec3 blush = vec3(1.0, 0.72, 0.80);
    vec3 lightPink = vec3(1.0, 0.91, 0.94);
    vec3 color = mix(blush, lightPink, smoothstep(0.0, 82.0, outside));
    float whiteCore = (1.0 - smoothstep(38.0, 140.0, blobDistance)) *
      smoothstep(0.015, 0.16, u_strength);
    color = mix(color, vec3(1.0), whiteCore);
    float alpha = 0.46 * exp(-pow(outside / 58.0, 1.6));
    float bloom = 0.22 * exp(-pow(max(blobDistance - 74.0, 0.0) / 82.0, 1.6)) *
      smoothstep(0.0, 0.35, u_strength);
    alpha += bloom * (1.0 - alpha);

    vec2 cell = floor(point / 34.0);
    float seed = hash(cell + 19.7);
    vec2 center = (cell + 0.2 + 0.6 * vec2(hash(cell), hash(cell + 7.3))) * 34.0;
    vec2 glintPoint = abs(point - center);
    float core = exp(-dot(glintPoint, glintPoint) / 1.25);
    float arms = max(
      exp(-glintPoint.x / 0.38 - glintPoint.y / 3.4),
      exp(-glintPoint.y / 0.38 - glintPoint.x / 3.4)
    );
    float twinkle = 0.38 + 0.62 * pow(0.5 + 0.5 * sin(u_time * 1.1 + seed * 6.283), 3.0);
    float haloMask = smoothstep(3.0, 18.0, outside) * (1.0 - smoothstep(80.0, 155.0, outside));
    float sparkle = max(core, arms * 0.85) * step(0.68, seed) * haloMask * twinkle;
    float sparkleAlpha = sparkle * 0.78;
    vec3 sparkleColor = mix(vec3(1.0, 0.63, 0.77), vec3(1.0, 0.98, 0.99), core);
    sparkleColor = mix(sparkleColor, vec3(1.0), whiteCore);
    vec3 premultiplied = color * alpha * (1.0 - sparkleAlpha) + sparkleColor * sparkleAlpha;
    alpha += sparkleAlpha * (1.0 - alpha);

    // Keep the colored halo and glints off the photograph, including at rest.
    vec2 photoPoint = point / u_radii;
    float photoRadius = length(photoPoint);
    float photoEdge = 1.25 / min(u_radii.x, u_radii.y);
    float outsidePhoto = smoothstep(1.0 - photoEdge * 0.6, 1.0 + photoEdge * 0.6, photoRadius);
    float insidePhoto = 1.0 - smoothstep(1.0 - photoEdge, 1.0, photoRadius);
    premultiplied *= outsidePhoto;
    alpha *= outsidePhoto;

    // A shallow glossy dome catches the same eased light that pulls the halo.
    vec3 normal = normalize(vec3(photoPoint, sqrt(max(0.0, 1.0 - dot(photoPoint, photoPoint)))));
    vec3 lightDirection = normalize(vec3(u_blob / u_radii, 0.22));
    vec3 halfway = normalize(lightDirection + vec3(0.0, 0.0, 1.0));
    float diffuse = pow(max(dot(normal, lightDirection), 0.0), 3.0);
    float specular = pow(max(dot(normal, halfway), 0.0), 48.0);
    float shineAlpha = (0.08 * diffuse + 0.26 * specular) * u_strength * insidePhoto;
    premultiplied = vec3(shineAlpha) + premultiplied * (1.0 - shineAlpha);
    alpha = shineAlpha + alpha * (1.0 - shineAlpha);

    float edge = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));
    float edgeFade = smoothstep(0.0, 0.05, edge);

    gl_FragColor = vec4(premultiplied * edgeFade, alpha * edgeFade);
  }
`;

const compileShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = vertex && fragment ? gl.createProgram() : null;
  if (program && vertex && fragment) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  if (vertex) gl.deleteShader(vertex);
  if (fragment) gl.deleteShader(fragment);
  if (program && gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  if (program) gl.deleteProgram(program);
  return null;
};

const smoothstep = (start: number, end: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

const createPortraitGlow = (portrait: HTMLElement) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'portrait-glow-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  portrait.prepend(canvas);

  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) {
    canvas.remove();
    return null;
  }

  const program = createProgram(gl);
  const buffer = program ? gl.createBuffer() : null;
  if (!program || !buffer) {
    if (program) gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    return null;
  }

  const position = gl.getAttribLocation(program, 'a_position');
  const size = gl.getUniformLocation(program, 'u_size');
  const radii = gl.getUniformLocation(program, 'u_radii');
  const blob = gl.getUniformLocation(program, 'u_blob');
  const strength = gl.getUniformLocation(program, 'u_strength');
  const sparkleTime = gl.getUniformLocation(program, 'u_time');
  if (position < 0 || !size || !radii || !blob || !strength || !sparkleTime) {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  let bounds = portrait.getBoundingClientRect();
  let visible = false;
  let destroyed = false;
  let needsPaint = true;
  let animationFrame = 0;
  let measureFrame = 0;
  let previousTime = 0;
  let previousPaint = 0;
  let pointer: { x: number; y: number } | null = null;
  const current = { x: 0, y: 0, strength: 0 };
  const target = { x: 0, y: 0, strength: 0 };

  const pause = () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousTime = 0;
    previousPaint = 0;
  };

  const render = (time: number) => {
    animationFrame = 0;
    if (destroyed || !visible || document.hidden) return;

    const frameInterval = 1000 / 30;
    if (previousPaint && time - previousPaint < frameInterval) {
      animationFrame = requestAnimationFrame(render);
      return;
    }
    previousPaint = previousPaint ? time - ((time - previousPaint) % frameInterval) : time;

    const delta = previousTime ? Math.min(time - previousTime, 64) : 16;
    const ease = 1 - Math.exp(-delta / 105);
    previousTime = time;
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    current.strength += (target.strength - current.strength) * ease;

    const settled = Math.abs(current.x - target.x) < 0.08 &&
      Math.abs(current.y - target.y) < 0.08 && Math.abs(current.strength - target.strength) < 0.001;
    if (settled) Object.assign(current, target);

    gl.uniform2f(blob, current.x, current.y);
    gl.uniform1f(strength, current.strength);
    gl.uniform1f(sparkleTime, time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    needsPaint = false;

    if (!portrait.classList.contains('is-portrait-glow-ready')) {
      if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) {
        destroy();
        return;
      }
      portrait.classList.add('is-portrait-glow-ready');
    }

    if (!settled || current.strength > 0.001) animationFrame = requestAnimationFrame(render);
    else {
      previousTime = 0;
      previousPaint = 0;
    }
  };

  const requestRender = () => {
    if (!needsPaint && current.strength === 0 && target.strength === 0) return;
    if (!destroyed && visible && !document.hidden && !animationFrame) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const updateTarget = () => {
    if (!pointer || !bounds.width || !bounds.height) {
      target.strength = 0;
      requestRender();
      return;
    }

    const dx = pointer.x - bounds.left - bounds.width / 2;
    const dy = bounds.top + bounds.height / 2 - pointer.y;
    const distance = Math.hypot(dx, dy);
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;
    const normalized = Math.hypot(dx / rx, dy / ry);
    const outside = normalized > 0 ? Math.max(0, distance * (1 - 1 / normalized)) : 0;
    target.strength = (1 - smoothstep(0, 420, outside)) * smoothstep(0.18, 0.88, normalized);

    if (target.strength > 0 && distance > 0) {
      const edgeDistance = distance / normalized;
      const extension = Math.min(180, outside * 0.7 + 24);
      target.x = (dx / distance) * (edgeDistance + extension);
      target.y = (dy / distance) * (edgeDistance + extension);
    }
    requestRender();
  };

  const measure = () => {
    measureFrame = 0;
    if (destroyed) return;
    const previousWidth = bounds.width;
    const previousHeight = bounds.height;
    bounds = portrait.getBoundingClientRect();
    if (bounds.width !== previousWidth || bounds.height !== previousHeight) needsPaint = true;
    visible = bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 &&
      bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth;
    const width = Math.max(1, bounds.width * 2.6);
    const height = Math.max(1, bounds.height * 2.6);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25, 1000 / Math.max(width, height));
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      needsPaint = true;
    }
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.uniform2f(size, width, height);
    gl.uniform2f(radii, bounds.width / 2, bounds.height / 2);
    if (!visible) pause();
    updateTarget();
  };

  const requestMeasure = () => {
    if (!destroyed && !measureFrame) measureFrame = requestAnimationFrame(measure);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || destroyed) return;
    pointer = { x: event.clientX, y: event.clientY };
    updateTarget();
  };
  const reset = () => {
    pointer = null;
    target.strength = 0;
    requestRender();
  };
  const onVisibilityChange = () => {
    reset();
    if (document.hidden) pause();
    else requestMeasure();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    destroy();
  };

  const resizeObserver = new ResizeObserver(requestMeasure);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestMeasure();
    else pause();
  });

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    pause();
    cancelAnimationFrame(measureFrame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('scroll', requestMeasure, true);
    window.removeEventListener('resize', requestMeasure);
    window.removeEventListener('blur', reset);
    document.removeEventListener('pointerleave', reset);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    portrait.classList.remove('is-portrait-glow-ready');
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  };

  resizeObserver.observe(portrait);
  intersectionObserver.observe(portrait);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', requestMeasure, { passive: true, capture: true });
  window.addEventListener('resize', requestMeasure, { passive: true });
  window.addEventListener('blur', reset);
  document.addEventListener('pointerleave', reset);
  document.addEventListener('visibilitychange', onVisibilityChange);
  canvas.addEventListener('webglcontextlost', onContextLost);
  document.fonts.ready.then(requestMeasure);
  measure();
  return destroy;
};

export const initPortraitGlow = () => {
  const portraits = [...document.querySelectorAll<HTMLElement>('.personal-about-portrait')];
  if (!portraits.length) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let cleanups: Array<() => void> = [];
  const reconcile = () => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
    if (reducedMotion.matches || !finePointer.matches) return;
    portraits.forEach((portrait) => {
      const cleanup = createPortraitGlow(portrait);
      if (cleanup) cleanups.push(cleanup);
    });
  };

  reducedMotion.addEventListener('change', reconcile);
  finePointer.addEventListener('change', reconcile);
  reconcile();
  return () => {
    reducedMotion.removeEventListener('change', reconcile);
    finePointer.removeEventListener('change', reconcile);
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
  };
};
