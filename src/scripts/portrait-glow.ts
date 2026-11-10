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
  uniform float u_time;

  float hash(vec2 cell) {
    return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  }

  float ellipseDistance(vec2 point, vec2 radii) {
    float k0 = length(point / radii);
    float k1 = length(point / (radii * radii));
    return k0 * (k0 - 1.0) / max(k1, 0.0001);
  }

  void main() {
    vec2 point = (v_uv - 0.5) * u_size;
    float outside = max(ellipseDistance(point, u_radii + 3.0), 0.0);

    vec3 blush = vec3(1.0, 0.72, 0.80);
    vec3 lightPink = vec3(1.0, 0.91, 0.94);
    float whiteRim = 1.0 - smoothstep(0.0, 32.0, outside);
    vec3 color = mix(blush, lightPink, smoothstep(32.0, 96.0, outside));
    color = mix(color, vec3(1.0), whiteRim);
    float alpha = (0.46 + 0.26 * whiteRim) * exp(-pow(outside / 58.0, 1.6));

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
    vec3 premultiplied = color * alpha * (1.0 - sparkleAlpha) + sparkleColor * sparkleAlpha;
    alpha += sparkleAlpha * (1.0 - alpha);

    // Keep the fixed pink halo and glints outside the photograph.
    vec2 photoPoint = point / u_radii;
    float photoRadius = length(photoPoint);
    float photoEdge = 1.25 / min(u_radii.x, u_radii.y);
    float outsidePhoto = smoothstep(1.0 - photoEdge * 0.6, 1.0 + photoEdge * 0.6, photoRadius);
    premultiplied *= outsidePhoto;
    alpha *= outsidePhoto;

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
  const sparkleTime = gl.getUniformLocation(program, 'u_time');
  if (position < 0 || !size || !radii || !sparkleTime) {
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
  let animationFrame = 0;
  let measureFrame = 0;
  let previousPaint = 0;

  const pause = () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousPaint = 0;
  };

  const render = (time: number) => {
    animationFrame = 0;
    if (destroyed || !visible || document.hidden) return;

    const frameInterval = 1000 / 15;
    if (previousPaint && time - previousPaint < frameInterval) {
      animationFrame = requestAnimationFrame(render);
      return;
    }
    previousPaint = previousPaint ? time - ((time - previousPaint) % frameInterval) : time;

    gl.uniform1f(sparkleTime, time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!portrait.classList.contains('is-portrait-glow-ready')) {
      if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) {
        destroy();
        return;
      }
      portrait.classList.add('is-portrait-glow-ready');
    }

    animationFrame = requestAnimationFrame(render);
  };

  const requestRender = () => {
    if (!destroyed && visible && !document.hidden && !animationFrame) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const measure = () => {
    measureFrame = 0;
    if (destroyed) return;
    bounds = portrait.getBoundingClientRect();
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
    }
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.uniform2f(size, width, height);
    gl.uniform2f(radii, bounds.width / 2, bounds.height / 2);
    if (!visible) pause();
    requestRender();
  };

  const requestMeasure = () => {
    if (!destroyed && !measureFrame) measureFrame = requestAnimationFrame(measure);
  };
  const onVisibilityChange = () => {
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
    window.removeEventListener('scroll', requestMeasure, true);
    window.removeEventListener('resize', requestMeasure);
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
  window.addEventListener('scroll', requestMeasure, { passive: true, capture: true });
  window.addEventListener('resize', requestMeasure, { passive: true });
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
