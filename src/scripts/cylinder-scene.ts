import * as THREE from 'three';

type LogoSpec = {
  src: string;
  width: number;
  height: number;
  y?: number;
};

type LoadedLogo = {
  image: HTMLImageElement;
  spec: LogoSpec;
  url: string;
};

type CylinderControlGroup = {
  heightPx?: number;
  scale?: number;
  x?: number;
  y?: number;
  pitch?: number;
  yaw?: number;
  speed?: number;
  backfaceVisible?: boolean;
};

type LogoCylinderControlGroup = CylinderControlGroup & {
  bandHeightPx?: number;
  heightCompression?: number;
};

type CameraControlGroup = {
  fov?: number;
  z?: number;
  x?: number;
  y?: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
};

type CanvasControlGroup = {
  topOffsetPx?: number;
  heightOffsetPx?: number;
  widthOffsetPx?: number;
  x?: number;
  opacity?: number;
};

type FogControlGroup = {
  enabled?: boolean;
  near?: number;
  far?: number;
};

type CylinderControls = {
  canvas?: CanvasControlGroup;
  title?: CylinderControlGroup;
  logos?: LogoCylinderControlGroup;
  camera?: CameraControlGroup;
  fog?: FogControlGroup;
};

type DragTarget = 'title' | 'logos';

const controlsEventName = 'jules:cylinder-controls';

const titleInk = 'rgba(17, 16, 15, 0.96)';
const titleFontFamily = '"Instrument Serif", Georgia, serif';
const titleFontSize = 330;
const titleTextureWidth = 4096;
const titleTextureHeight = 768;
const titleRadius = 5.5;
const titleCylinderHeight = 1.35;
const titleRadialSegments = 256;
const titleHorizontalScale = 0.72;
const titleTextWidthRatio = 0.82;
const titleTextureRepeatX = 3;
const titleRotationSpeed = 0.075;
const titleBasePitch = -0.11;

const logoInk = 'rgba(92, 89, 84, 0.96)';
const logoTextureWidth = 8192;
const logoTextureHeight = 320;
const logoRadius = 6.4;
const logoCylinderHeight = 1.35;
const logoRadialSegments = 320;
const logoBasePitch = 0.34;
const fogColor = new THREE.Color(0xfaf9f6);
const sceneDesignWidth = 1600;
const sceneDesignHeight = 900;
const mobileLayoutQuery = '(max-width: 1023px)';
const dragRotationScale = 0.008;
const dragVelocityDamping = 0.925;

const defaultCylinderControls = {
  scale: 1,
  x: 0,
  y: 0,
  pitch: 0,
  yaw: 0,
  speed: 1,
  backfaceVisible: true,
};

const defaultTitleControls = {
  ...defaultCylinderControls,
  scale: 0.76,
  y: 1.69,
  pitch: 0.23,
  backfaceVisible: true,
};

const mobileTitleControls = {
  ...defaultTitleControls,
  y: 0,
};

const defaultLogoControls = {
  ...defaultCylinderControls,
  heightCompression: 1.32,
  scale: 0.59,
  y: 0.35,
  pitch: -0.29,
};

const mobileLogoControls = {
  ...defaultLogoControls,
  y: 0,
};

const defaultCameraControls = {
  fov: 42,
  z: 25,
  x: 0,
  y: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
};

const defaultCanvasControls = {
  topOffsetPx: -70,
  heightOffsetPx: -2,
  widthOffsetPx: 0,
  x: 0,
  opacity: 1,
};

const defaultFogControls = {
  enabled: true,
  near: 20,
  far: 33,
};

const isMobileLayout = () => window.matchMedia(mobileLayoutQuery).matches;

const getStageTopBleed = () => {
  if (window.innerWidth <= 767) {
    return 92;
  }

  if (window.innerWidth <= 1280) {
    return 150;
  }

  if (window.innerWidth <= 1600) {
    return 110;
  }

  return 0;
};

const logos: LogoSpec[] = [
  { src: '/assets/logos/agency-home/nike.svg', width: 300, height: 118, y: 0.52 },
  { src: '/assets/logos/agency-home/apple.svg', width: 104, height: 104, y: 0.51 },
  { src: '/assets/logos/agency-home/google.svg', width: 360, height: 122, y: 0.51 },
  { src: '/assets/logos/agency-home/notebooklm.svg', width: 112, height: 112, y: 0.51 },
  { src: '/assets/logos/agency-home/ibm.svg', width: 184, height: 96, y: 0.52 },
  { src: '/assets/logos/agency-home/beats-by-dre.svg', width: 104, height: 104, y: 0.51 },
  { src: '/assets/logos/agency-home/chase-bank.svg', width: 100, height: 100, y: 0.51 },
  { src: '/assets/logos/agency-home/citi-bank.svg', width: 158, height: 82, y: 0.51 },
  { src: '/assets/logos/agency-home/fender.svg', width: 238, height: 94, y: 0.51 },
  { src: '/assets/logos/agency-home/airbnb.svg', width: 100, height: 100, y: 0.51 },
  { src: '/assets/logos/agency-home/microsoft.svg', width: 98, height: 98, y: 0.51 },
  { src: '/assets/logos/agency-home/square.svg', width: 92, height: 92, y: 0.51 },
  { src: '/assets/logos/agency-home/linkedin.svg', width: 92, height: 92, y: 0.51 },
  { src: '/assets/logos/agency-home/wish.svg', width: 126, height: 98, y: 0.51 },
  { src: '/assets/logos/agency-home/liveramp.svg', width: 298, height: 86, y: 0.51 },
  { src: '/assets/logos/agency-home/adult-swim.svg', width: 318, height: 72, y: 0.51 },
];

const hasWebgl = () => {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
};

const getControlState = (detail?: CylinderControls) => {
  const source = detail ?? window.__julesCylinderControls;
  const titleDefaults = isMobileLayout() ? mobileTitleControls : defaultTitleControls;
  const logoDefaults = isMobileLayout() ? mobileLogoControls : defaultLogoControls;

  return {
    canvas: {
      ...defaultCanvasControls,
      ...(source?.canvas ?? {}),
    },
    title: {
      ...titleDefaults,
      ...(source?.title ?? {}),
    },
    logos: {
      ...logoDefaults,
      ...(source?.logos ?? {}),
    },
    camera: {
      ...defaultCameraControls,
      ...(source?.camera ?? {}),
    },
    fog: {
      ...defaultFogControls,
      ...(source?.fog ?? {}),
    },
  };
};

const makeMeasureContext = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.font = `400 ${titleFontSize}px ${titleFontFamily}`;
  return context;
};

const createTitleTexture = (text: string) => {
  const measure = makeMeasureContext();
  if (!measure) return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = titleTextureWidth;
  canvas.height = titleTextureHeight;

  const context = canvas.getContext('2d');
  if (!context) return undefined;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = titleInk;
  context.font = `400 ${titleFontSize}px ${titleFontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const measuredWidth = measure.measureText(text).width;
  const targetTextWidth = canvas.width * titleTextWidthRatio;
  const fittedHorizontalScale = Math.min(titleHorizontalScale, targetTextWidth / measuredWidth);

  context.save();
  context.translate(canvas.width * 0.5, canvas.height * 0.54);
  context.scale(fittedHorizontalScale, 1);
  context.fillText(text, 0, 0);
  context.restore();

  const edgeFade = context.createLinearGradient(0, 0, canvas.width, 0);
  edgeFade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edgeFade.addColorStop(0.08, 'rgba(0, 0, 0, 1)');
  edgeFade.addColorStop(0.92, 'rgba(0, 0, 0, 1)');
  edgeFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = edgeFade;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.x = titleTextureRepeatX;
  texture.needsUpdate = true;

  return texture;
};

const sanitizeSvg = (source: string) =>
  source
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

const waitForImageLoad = (image: HTMLImageElement) =>
  new Promise<void>((resolve, reject) => {
    const done = () => resolve();
    const fail = () => reject(new Error('Logo image failed to load.'));

    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', fail, { once: true });
  });

const loadLogo = async (spec: LogoSpec): Promise<LoadedLogo> => {
  const response = await fetch(spec.src);
  if (!response.ok) {
    throw new Error(`Unable to load logo: ${spec.src}`);
  }

  const svg = sanitizeSvg(await response.text());
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  image.decoding = 'async';
  image.src = url;

  if (image.decode) {
    await image.decode().catch(() => waitForImageLoad(image));
  } else {
    await waitForImageLoad(image);
  }

  return { image, spec, url };
};

const createTintedLogo = ({ image, spec }: LoadedLogo) => {
  const canvas = document.createElement('canvas');
  const padding = 16;
  canvas.width = Math.ceil(spec.width + padding * 2);
  canvas.height = Math.ceil(spec.height + padding * 2);

  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, padding, padding, spec.width, spec.height);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = logoInk;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-over';

  return canvas;
};

const createLogoTexture = async () => {
  const loadedLogos = await Promise.all(logos.map(loadLogo));
  const canvas = document.createElement('canvas');
  canvas.width = logoTextureWidth;
  canvas.height = logoTextureHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    loadedLogos.forEach(({ url }) => URL.revokeObjectURL(url));
    return undefined;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, canvas.width, canvas.height);
  const segment = canvas.width / loadedLogos.length;

  loadedLogos.forEach((logo, index) => {
    const tintedLogo = createTintedLogo(logo);
    if (!tintedLogo) {
      return;
    }

    const x = segment * (index + 0.5) - tintedLogo.width / 2;
    const y = canvas.height * (logo.spec.y ?? 0.5) - tintedLogo.height / 2;
    context.drawImage(tintedLogo, x, y);
  });

  loadedLogos.forEach(({ url }) => URL.revokeObjectURL(url));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
};

const getScenePoint = (
  targetRect: DOMRect,
  stageRect: DOMRect,
  camera: THREE.PerspectiveCamera,
) => {
  const cameraDepth = Math.max(1, Math.abs(camera.position.z));
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * cameraDepth;
  const visibleWidth = visibleHeight * camera.aspect;
  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;
  const x = ((centerX - stageRect.left) / stageRect.width - 0.5) * visibleWidth;
  const y = -(((centerY - stageRect.top) / stageRect.height - 0.5) * visibleHeight);

  return { x, y };
};

const fitGroupToAnchor = (
  group: THREE.Group,
  anchorRect: DOMRect,
  stageRect: DOMRect,
  camera: THREE.PerspectiveCamera,
) => {
  const mesh = group.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (!mesh) return;

  const vertices = mesh.geometry.getAttribute('position');
  const baseScale = group.scale.clone();
  const basePosition = group.position.clone();
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.abs(camera.position.z);
  const targetX = (anchorRect.left + anchorRect.width / 2 - stageRect.left) / stageRect.width * 2 - 1;
  const targetY = 1 - (anchorRect.top + anchorRect.height / 2 - stageRect.top) / stageRect.height * 2;
  const projectedBounds = () => {
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box2();

    // Sample the cylinder rims rather than a box, whose empty corners overestimate perspective bounds.
    for (let index = 0; index < vertices.count; index += 8) {
      const point = new THREE.Vector3()
        .fromBufferAttribute(vertices, index)
        .applyMatrix4(mesh.matrixWorld)
        .project(camera);
      bounds.expandByPoint(new THREE.Vector2(point.x, point.y));
    }

    return bounds;
  };

  const place = (scale: number) => {
    group.scale.copy(baseScale).multiplyScalar(scale);
    group.position.copy(basePosition);

    for (let pass = 0; pass < 2; pass += 1) {
      const center = projectedBounds().getCenter(new THREE.Vector2());
      group.position.x += (targetX - center.x) * visibleHeight * camera.aspect / 2;
      group.position.y += (targetY - center.y) * visibleHeight / 2;
    }

    return projectedBounds().getSize(new THREE.Vector2());
  };

  let lower = 0;
  let upper = 1;
  for (let pass = 0; pass < 10; pass += 1) {
    const scale = (lower + upper) / 2;
    const size = place(scale);
    if (
      size.x <= anchorRect.width / stageRect.width * 2 * 0.94 &&
      size.y <= anchorRect.height / stageRect.height * 2 * 0.9
    ) {
      lower = scale;
    } else {
      upper = scale;
    }
  }
  place(lower);
};

const setBackfaceVisibility = (material: THREE.Material, visible: boolean) => {
  const nextSide = visible ? THREE.DoubleSide : THREE.FrontSide;
  if (material.side === nextSide) return;

  material.side = nextSide;
  material.needsUpdate = true;
};

const applySceneFog = (scene: THREE.Scene, state: ReturnType<typeof getControlState>, materials: THREE.Material[]) => {
  if (!state.fog.enabled) {
    if (scene.fog) {
      scene.fog = null;
      materials.forEach((material) => {
        material.needsUpdate = true;
      });
    }
    return;
  }

  const near = Math.max(0.1, Math.min(state.fog.near, state.fog.far - 0.1));
  const far = Math.max(near + 0.1, state.fog.far);

  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.copy(fogColor);
    scene.fog.near = near;
    scene.fog.far = far;
  } else {
    scene.fog = new THREE.Fog(fogColor, near, far);
    materials.forEach((material) => {
      material.needsUpdate = true;
    });
  }
};

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      'a, button, input, textarea, select, label, summary, [role="button"], [role="link"], .cylinder-controls',
    ),
  );
};

const isPointInRect = (clientX: number, clientY: number, rect: DOMRect) =>
  clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

export const initCylinderScene = (root: HTMLElement) => {
  const stage = root.querySelector<HTMLElement>('.agency-cylinder-stage');
  const canvas = root.querySelector<HTMLCanvasElement>('.agency-cylinder-stage__canvas');
  const titleAnchor = root.querySelector<HTMLElement>('.agency-cylinder-headline');
  const logoAnchor = root.querySelector<HTMLElement>('.agency-logo-cylinder');
  const hero = root.querySelector<HTMLElement>('.agency-cylinder-hero');
  const band = root.querySelector<HTMLElement>('.agency-pattern-logo-band');
  const text = titleAnchor?.dataset.cylinderHeadline?.trim() || 'Senior Freelance Design Director';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!stage || !canvas || !titleAnchor || !logoAnchor || !hero || !band || reduceMotion.matches || !hasWebgl()) {
    hero?.classList.add('is-cylinder-fallback');
    return () => {};
  }

  let disposed = false;
  let animationFrame = 0;
  let renderer: THREE.WebGLRenderer | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let resizeListener: (() => void) | undefined;
  let controls = getControlState();
  let controlOverrides: CylinderControls | undefined;
  let controlListener: ((event: Event) => void) | undefined;
  let pointerCleanup: (() => void) | undefined;
  const textures: THREE.Texture[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const cleanup = () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    if (resizeListener) {
      window.removeEventListener('resize', resizeListener);
    }
    if (controlListener) {
      window.removeEventListener(controlsEventName, controlListener);
    }
    pointerCleanup?.();
    renderer?.dispose();
    textures.forEach((texture) => texture.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    root.classList.remove('is-cylinder-scene-ready');
    hero.classList.remove('is-cylinder-ready');
    band.classList.remove('is-logo-cylinder-ready');
  };

  const start = async () => {
    const logoTexturePromise = createLogoTexture();

    await Promise.allSettled([
      document.fonts?.load?.(`400 ${titleFontSize}px "Instrument Serif"`) ?? Promise.resolve(),
      document.fonts?.ready ?? Promise.resolve(),
    ]);

    if (disposed) {
      return;
    }

    const titleTexture = createTitleTexture(text);
    const logoTexture = await logoTexturePromise;

    if (disposed || !titleTexture || !logoTexture) {
      hero.classList.add('is-cylinder-fallback');
      return;
    }

    textures.push(titleTexture, logoTexture);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(defaultCameraControls.fov, 1, 0.1, 100);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const titleGroup = new THREE.Group();
    const titleGeometry = new THREE.CylinderGeometry(
      titleRadius,
      titleRadius,
      titleCylinderHeight,
      titleRadialSegments,
      1,
      true,
    );
    const titleMaterial = new THREE.MeshBasicMaterial({
      map: titleTexture,
      transparent: true,
      alphaTest: 0.02,
      side: THREE.FrontSide,
      fog: true,
      depthWrite: false,
    });
    const titleCylinder = new THREE.Mesh(titleGeometry, titleMaterial);
    titleCylinder.renderOrder = 1;
    titleGroup.add(titleCylinder);
    scene.add(titleGroup);

    const logoGroup = new THREE.Group();
    const logoGeometry = new THREE.CylinderGeometry(
      logoRadius,
      logoRadius,
      logoCylinderHeight,
      logoRadialSegments,
      1,
      true,
    );
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      alphaTest: 0.025,
      side: THREE.DoubleSide,
      fog: true,
      depthWrite: false,
    });
    const logoCylinder = new THREE.Mesh(logoGeometry, logoMaterial);
    logoCylinder.renderOrder = 2;
    logoGroup.add(logoCylinder);
    scene.add(logoGroup);

    geometries.push(titleGeometry, logoGeometry);
    materials.push(titleMaterial, logoMaterial);

    root.classList.add('is-cylinder-scene-ready');
    hero.classList.add('is-cylinder-ready');
    band.classList.add('is-logo-cylinder-ready');

    const spinOffset = {
      title: 0,
      logos: 0,
    };
    const spinVelocity = {
      title: 0,
      logos: 0,
    };
    let dragState:
      | {
          pointerId: number;
          target: DragTarget;
          startX: number;
          startY: number;
          lastX: number;
          lastTime: number;
          active: boolean;
        }
      | undefined;

    const chooseDragTarget = (clientY: number): DragTarget => {
      const titleRect = titleAnchor.getBoundingClientRect();
      const logoRect = logoAnchor.getBoundingClientRect();
      const midpoint = (titleRect.bottom + logoRect.top) * 0.5;

      return clientY > midpoint ? 'logos' : 'title';
    };

    const isInsideDragSurface = (clientX: number, clientY: number) =>
      isPointInRect(clientX, clientY, hero.getBoundingClientRect()) ||
      isPointInRect(clientX, clientY, band.getBoundingClientRect());

    const endDrag = () => {
      if (!dragState) return;

      try {
        root.releasePointerCapture(dragState.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }

      dragState = undefined;
      root.classList.remove('is-cylinder-dragging');
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        isInteractiveTarget(event.target) ||
        !isInsideDragSurface(event.clientX, event.clientY)
      ) {
        return;
      }

      dragState = {
        pointerId: event.pointerId,
        target: chooseDragTarget(event.clientY),
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastTime: performance.now(),
        active: false,
      };

      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        // Some embedded browsers do not allow capture on every pointer.
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      if (!isInsideDragSurface(event.clientX, event.clientY)) {
        endDrag();
        return;
      }

      const deltaX = event.clientX - dragState.lastX;
      const totalX = event.clientX - dragState.startX;
      const totalY = event.clientY - dragState.startY;
      const now = performance.now();
      const elapsed = Math.max(16, now - dragState.lastTime) / 1000;

      if (!dragState.active) {
        if (Math.abs(totalY) > 18 && Math.abs(totalY) > Math.abs(totalX) * 1.2) {
          endDrag();
          return;
        }

        if (Math.abs(totalX) < 4) {
          return;
        }

        dragState.active = true;
        root.classList.add('is-cylinder-dragging');
      }

      event.preventDefault();
      spinOffset[dragState.target] += deltaX * dragRotationScale;
      spinVelocity[dragState.target] = (deltaX * dragRotationScale) / elapsed;
      dragState.lastX = event.clientX;
      dragState.lastTime = now;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      endDrag();
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      spinVelocity[dragState.target] = 0;
      endDrag();
    };

    const onLostPointerCapture = (event: PointerEvent) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      dragState = undefined;
      root.classList.remove('is-cylinder-dragging');
    };

    const onPageScroll = () => {
      if (dragState) {
        spinVelocity[dragState.target] = 0;
        endDrag();
      }
    };

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove, { passive: false });
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerCancel);
    root.addEventListener('lostpointercapture', onLostPointerCapture);
    window.addEventListener('scroll', onPageScroll, { passive: true });
    pointerCleanup = () => {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerCancel);
      root.removeEventListener('lostpointercapture', onLostPointerCapture);
      window.removeEventListener('scroll', onPageScroll);
      root.classList.remove('is-cylinder-dragging');
    };

    const resize = () => {
      if (!renderer) {
        return;
      }

      controls = getControlState(controlOverrides);
      const mobile = isMobileLayout();
      const rootRect = root.getBoundingClientRect();
      const titleRect = titleAnchor.getBoundingClientRect();
      const logoRect = logoAnchor.getBoundingClientRect();
      const stageTop = Math.max(0, titleRect.top - rootRect.top - Math.min(24, titleRect.height * 0.05));
      if (mobile) {
        const top = Math.max(0, titleRect.top - rootRect.top - 12);
        stage.style.top = `${Math.round(top)}px`;
        stage.style.height = `${Math.ceil(logoRect.bottom - rootRect.top - top + 12)}px`;
        stage.style.minHeight = '0';
      } else {
        stage.style.top = `${Math.round(stageTop + controls.canvas.topOffsetPx - getStageTopBleed())}px`;
        stage.style.height = '100vh';
        stage.style.minHeight = '100dvh';
      }
      stage.style.setProperty('--cylinder-stage-width-extra', `${Math.round(controls.canvas.widthOffsetPx)}px`);
      stage.style.setProperty('--cylinder-stage-x', `${Math.round(controls.canvas.x)}px`);
      stage.style.setProperty('--cylinder-stage-opacity', `${controls.canvas.opacity}`);

      const stageRect = stage.getBoundingClientRect();
      const width = Math.max(1, Math.round(stageRect.width));
      const height = Math.max(1, Math.round(stageRect.height));
      const renderWidth = width;
      const frameRect = new DOMRect(stageRect.left, stageRect.top, renderWidth, height);
      const ratio = renderWidth / height;
      const layoutWidth = Math.min(window.innerWidth, sceneDesignWidth);
      const viewportScale = Math.min(1, sceneDesignHeight / height);

      renderer.setSize(width, height, false);
      renderer.setViewport(0, 0, renderWidth, height);
      camera.fov = controls.camera.fov;
      camera.aspect = ratio;
      camera.position.set(controls.camera.x, controls.camera.y, controls.camera.z);
      camera.rotation.set(controls.camera.pitch, controls.camera.yaw, controls.camera.roll);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      applySceneFog(scene, controls, materials);

      const titlePoint = getScenePoint(titleRect, frameRect, camera);
      const titleRatio = titleRect.width / Math.max(1, titleRect.height);
      const titleScale = titleRatio > 4.4 ? 2.25 : titleRatio < 3.25 ? 2.2 : 1.82;
      const titleWideScale = titleRatio > 4.4 ? 0.74 : titleRatio < 3.25 ? 0.86 : 0.79;
      const titleWideDrop = Math.min(1.35, Math.max(0, (layoutWidth - 1680) / 420));
      setBackfaceVisibility(titleMaterial, controls.title.backfaceVisible);
      titleGroup.scale.set(
        titleScale * titleWideScale * controls.title.scale * viewportScale,
        titleScale * controls.title.scale * viewportScale,
        titleScale * controls.title.scale * viewportScale,
      );
      titleGroup.position.x = titlePoint.x + controls.title.x;
      const titleOffsetY = mobile ? 0 : (titleRatio > 4.4 ? -0.28 : titleRatio < 3.25 ? -0.14 : -0.2) - titleWideDrop;
      titleGroup.position.y = titlePoint.y + titleOffsetY + controls.title.y;

      const logoPoint = getScenePoint(logoRect, frameRect, camera);
      const logoRatio = logoRect.width / Math.max(1, logoRect.height);
      const logoScale = logoRatio > 5.5 ? 2.34 : logoRatio < 3.4 ? 1.94 : 2.08;
      const logoWideScale = logoRatio > 5.5 ? 1.08 : logoRatio < 3.4 ? 1 : 1.03;
      setBackfaceVisibility(logoMaterial, controls.logos.backfaceVisible);
      logoGroup.scale.set(
        logoScale * logoWideScale * controls.logos.scale * viewportScale,
        logoScale * controls.logos.scale * controls.logos.heightCompression * viewportScale,
        logoScale * controls.logos.scale * viewportScale,
      );
      logoGroup.position.x = logoPoint.x + controls.logos.x;
      const logoOffsetY = mobile ? 0 : logoRatio > 5.5 ? 0.82 : logoRatio < 3.4 ? 0.44 : 0.62;
      logoGroup.position.y = logoPoint.y + logoOffsetY + controls.logos.y;

      if (mobile) {
        titleGroup.rotation.x = titleBasePitch + controls.title.pitch;
        logoGroup.rotation.x = logoBasePitch + controls.logos.pitch;
        fitGroupToAnchor(titleGroup, titleRect, frameRect, camera);
        fitGroupToAnchor(logoGroup, logoRect, frameRect, camera);
      }
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resizeObserver.observe(titleAnchor);
    resizeObserver.observe(logoAnchor);
    resizeObserver.observe(band);
    resizeListener = resize;
    window.addEventListener('resize', resizeListener);

    controlListener = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as CylinderControls) : undefined;
      controlOverrides = detail;
      resize();
    };
    window.addEventListener(controlsEventName, controlListener);
    resize();

    const startTime = performance.now();
    let previousFrameTime = startTime;
    const animate = () => {
      if (disposed || !renderer) {
        return;
      }

      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const frameDelta = Math.min(0.05, Math.max(0.001, (now - previousFrameTime) / 1000));
      previousFrameTime = now;

      (['title', 'logos'] as const).forEach((target) => {
        if (dragState?.active && dragState.target === target) {
          return;
        }

        spinOffset[target] += spinVelocity[target] * frameDelta;
        spinVelocity[target] *= Math.pow(dragVelocityDamping, frameDelta * 60);

        if (Math.abs(spinVelocity[target]) < 0.0005) {
          spinVelocity[target] = 0;
        }
      });

      titleCylinder.rotation.y = controls.title.yaw - elapsed * titleRotationSpeed * controls.title.speed + spinOffset.title;
      titleGroup.rotation.x = titleBasePitch + controls.title.pitch + Math.sin(elapsed * 0.28) * 0.006;

      logoGroup.rotation.x = logoBasePitch + controls.logos.pitch + Math.sin(elapsed * 0.24) * 0.01;
      logoGroup.rotation.y = -0.18 + controls.logos.yaw - elapsed * 0.075 * controls.logos.speed + spinOffset.logos;

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
  };

  void start();

  return cleanup;
};
