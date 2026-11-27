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
  z?: number;
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
const titleFontFamily = '"Xanh Mono", monospace';
const titleFontSize = 288.75;
const titleTextureWidth = 8192;
const titleTextureHeight = 768;
const titleRadius = 5.5;
const titleCylinderHeight = 1.35;
const titleRadialSegments = 256;
const titleTextWidthRatio = 0.82;
const titleTextureRepeatX = 4;
// Compensate for UV repetition so adding labels does not squeeze their glyphs.
const titleHorizontalScale = titleCylinderHeight * titleTextureWidth * titleTextureRepeatX
  / (titleTextureHeight * Math.PI * 2 * titleRadius);
const titleRotationSpeed = 0.075;
const titleBasePitch = -0.11;
const titleLabelCount = 2 * titleTextureRepeatX;
const flowerFrameDuration = 0.14;
const flowerSizeVariants = [0.85, 1.12, 0.95] as const;

const logoInk = 'rgba(92, 89, 84, 0.96)';
const logoTextureWidth = 8192;
const logoTextureHeight = 320;
const logoRadius = 6.4;
const logoCylinderHeight = 1.35;
const logoRadialSegments = 320;
const logoBasePitch = 0.34;
const fogColor = new THREE.Color(0xfaf9f6);
const dragRotationScale = 0.008;
const dragVelocityDamping = 0.925;

const defaultCylinderControls = {
  scale: 1,
  x: 0,
  y: 0,
  z: 0,
  pitch: 0,
  yaw: 0,
  speed: 1,
  backfaceVisible: false,
};

const defaultTitleControls = {
  ...defaultCylinderControls,
  pitch: Math.PI / 15,
  yaw: -Math.PI / 10,
  backfaceVisible: false,
};

const defaultLogoControls = {
  ...defaultCylinderControls,
  heightCompression: 1.32,
  pitch: -17 * Math.PI / 180,
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
  topOffsetPx: 0,
  heightOffsetPx: 0,
  widthOffsetPx: 0,
  x: 0,
  opacity: 1,
};

const defaultFogControls = {
  enabled: true,
  near: 20,
  far: 33,
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
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  return {
    canvas: {
      ...defaultCanvasControls,
      ...(source?.canvas ?? {}),
    },
    title: {
      ...defaultTitleControls,
      scale: mobile ? 1.5 : 1,
      ...(source?.title ?? {}),
    },
    logos: {
      ...defaultLogoControls,
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

const createTitleTexture = (labels: readonly string[]) => {
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

  const slotWidth = canvas.width / labels.length;
  let paintHeight = 0;
  let paintCenterY = 0;
  labels.forEach((label, index) => {
    const measuredWidth = measure.measureText(label).width;
    const targetTextWidth = slotWidth * titleTextWidthRatio;
    const fittedFontSize = titleFontSize * Math.min(1, targetTextWidth / (measuredWidth * titleHorizontalScale));

    context.save();
    context.font = `400 ${fittedFontSize}px ${titleFontFamily}`;
    const metrics = context.measureText(label);
    paintHeight = Math.max(paintHeight, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
    paintCenterY += canvas.height * 0.54 + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2;
    context.translate(slotWidth * (index + 0.5), canvas.height * 0.54);
    context.scale(titleHorizontalScale, 1);
    context.fillText(label, 0, 0);
    context.restore();
  });

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

  return {
    texture,
    flowerSize: paintHeight / canvas.height * titleCylinderHeight * 0.88,
    flowerY: (0.5 - paintCenterY / labels.length / canvas.height) * titleCylinderHeight,
  };
};

const createFlowerTextures = async () => {
  const response = await fetch('/assets/brand/hand-drawn-flower.svg');
  if (!response.ok) throw new Error('Unable to load the ring flowers.');

  const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const frames = Array.from(svg.querySelectorAll('.flower-frame'));
  if (!frames.length) throw new Error('Missing ring flower frames.');

  return frames.map((frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to draw the ring flowers.');
    context.scale(canvas.width / 100, canvas.height / 100);
    context.fillStyle = '#fff';
    context.strokeStyle = '#11100f';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    frame.querySelectorAll('path').forEach((path) => {
      const outline = new Path2D(path.getAttribute('d') ?? '');
      context.lineWidth = Number(path.getAttribute('stroke-width') ?? 6.5);
      context.fill(outline);
      context.stroke(outline);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  });
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
  relativeScale = 1,
  overscan = 1,
  paintHeightRatio = 1,
  paintCenterY = 0,
) => {
  const mesh = group.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (!mesh) return;

  const vertices = mesh.geometry.getAttribute('position');
  const normals = mesh.geometry.getAttribute('normal');
  const baseScale = group.scale.clone();
  const basePosition = group.position.clone();
  const targetX = (anchorRect.left + anchorRect.width / 2 - stageRect.left) / stageRect.width * 2 - 1;
  const targetY = 1 - (anchorRect.top + anchorRect.height / 2 - stageRect.top) / stageRect.height * 2;
  const projectedBounds = () => {
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box2();

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    // Fit the painted, front-facing band rather than the transparent texture margins
    // or the hidden back half of the cylinder.
    for (let index = 0; index < vertices.count; index += 8) {
      const point = new THREE.Vector3()
        .fromBufferAttribute(vertices, index);
      point.y = point.y * paintHeightRatio + paintCenterY;
      point.applyMatrix4(mesh.matrixWorld);
      const normal = new THREE.Vector3().fromBufferAttribute(normals, index).applyMatrix3(normalMatrix);
      if (normal.dot(camera.position.clone().sub(point)) <= 0) continue;
      point.project(camera);
      bounds.expandByPoint(new THREE.Vector2(point.x, point.y));
    }

    return bounds;
  };

  const place = (scale: number) => {
    group.scale.copy(baseScale).multiplyScalar(scale);
    group.position.copy(basePosition);

    // Solve the projected center at its actual depth. A flat-plane correction
    // overshoots when a large cylinder's front surface approaches the camera.
    for (let pass = 0; pass < 3; pass += 1) {
      const center = projectedBounds().getCenter(new THREE.Vector2());
      const epsilon = 0.01;
      group.position.x += epsilon;
      const shiftedX = projectedBounds().getCenter(new THREE.Vector2()).sub(center).divideScalar(epsilon);
      group.position.x -= epsilon;
      group.position.y += epsilon;
      const shiftedY = projectedBounds().getCenter(new THREE.Vector2()).sub(center).divideScalar(epsilon);
      group.position.y -= epsilon;
      const determinant = shiftedX.x * shiftedY.y - shiftedY.x * shiftedX.y;
      if (Math.abs(determinant) < 1e-8) break;
      const dx = targetX - center.x;
      const dy = targetY - center.y;
      group.position.x += (dx * shiftedY.y - shiftedY.x * dy) / determinant;
      group.position.y += (shiftedX.x * dy - dx * shiftedX.y) / determinant;
    }

    return projectedBounds().getSize(new THREE.Vector2());
  };

  let lower = 0;
  mesh.geometry.computeBoundingSphere();
  const radius = (mesh.geometry.boundingSphere?.radius ?? 1) * Math.max(baseScale.x, baseScale.y, baseScale.z);
  // Bound enlargement before the front surface can cross the camera.
  let upper = Math.min(4, Math.max(0.01, (camera.position.z - basePosition.z) * 0.8 / radius));
  for (let pass = 0; pass < 14; pass += 1) {
    const scale = (lower + upper) / 2;
    const size = place(scale);
    if (
      size.x <= anchorRect.width / stageRect.width * 2 * 0.94 * overscan * relativeScale &&
      size.y <= anchorRect.height / stageRect.height * 2 * 0.94 * relativeScale
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
  const text = titleAnchor?.dataset.cylinderHeadline?.trim() || 'Design Director';
  const alternateText = titleAnchor?.dataset.cylinderAlternate?.trim() || 'San Francisco';
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
    const [logoResult, flowerResult] = await Promise.allSettled([
      createLogoTexture(),
      createFlowerTextures(),
      document.fonts?.load?.(`400 ${titleFontSize}px "Xanh Mono"`) ?? Promise.resolve(),
      document.fonts?.ready ?? Promise.resolve(),
    ]);
    const logoTexture = logoResult.status === 'fulfilled' ? logoResult.value : undefined;
    const flowerTextures = flowerResult.status === 'fulfilled' ? flowerResult.value : [];
    if (disposed || !logoTexture || !flowerTextures.length) {
      logoTexture?.dispose();
      flowerTextures.forEach((texture) => texture.dispose());
      if (!disposed) hero.classList.add('is-cylinder-fallback');
      return;
    }
    textures.push(logoTexture, ...flowerTextures);
    const titleArtwork = createTitleTexture([text, alternateText]);
    if (!titleArtwork) {
      hero.classList.add('is-cylinder-fallback');
      return;
    }
    const { texture: titleTexture, flowerSize, flowerY } = titleArtwork;
    textures.push(titleTexture);

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

    const flowerMaterials = flowerTextures.map((map) => new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      alphaTest: 0.02,
      side: THREE.FrontSide,
      fog: true,
      depthWrite: false,
    }));
    const ringFlowers = Array.from({ length: titleLabelCount }, (_, index) => {
      const angle = index * Math.PI * 2 / titleLabelCount;
      const radius = titleRadius + 0.002;
      const size = flowerSize * flowerSizeVariants[index % flowerSizeVariants.length];
      const arc = size / radius;
      const center = new THREE.Vector3(radius * Math.sin(angle), flowerY, radius * Math.cos(angle));
      const geometry = new THREE.CylinderGeometry(radius, radius, size, 12, 1, true, angle - arc / 2, arc);
      geometry.translate(-center.x, 0, -center.z);
      const flower = new THREE.Mesh(geometry, flowerMaterials[index % flowerMaterials.length]);
      flower.position.copy(center);
      flower.renderOrder = 2;
      titleCylinder.add(flower);
      geometries.push(geometry);
      return flower;
    });
    materials.push(...flowerMaterials);
    let flowerControls = { scale: 1, speed: 1, opacity: 1 };

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
      side: THREE.FrontSide,
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
    const automaticRotation = { title: 0, logos: 0 };
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
      const rootStyle = getComputedStyle(root);
      const flowerValue = (key: string) => {
        const value = Number.parseFloat(rootStyle.getPropertyValue(`--hero-ring-flower-${key}`));
        return Number.isFinite(value) ? value : 1;
      };
      flowerControls = {
        scale: THREE.MathUtils.clamp(flowerValue('scale'), 0.25, 2),
        speed: THREE.MathUtils.clamp(flowerValue('speed'), 0, 3),
        opacity: THREE.MathUtils.clamp(flowerValue('opacity'), 0, 1),
      };
      ringFlowers.forEach((flower) => flower.scale.setScalar(flowerControls.scale));
      flowerMaterials.forEach((material) => {
        material.opacity = flowerControls.opacity;
        setBackfaceVisibility(material, controls.title.backfaceVisible);
      });
      const rootRect = root.getBoundingClientRect();
      const titleRect = titleAnchor.getBoundingClientRect();
      const logoRect = logoAnchor.getBoundingClientRect();
      const stageTop = Math.max(0, titleRect.top - rootRect.top);
      stage.style.top = `${stageTop + controls.canvas.topOffsetPx}px`;
      stage.style.height = `${Math.max(1, logoRect.bottom - rootRect.top - stageTop + controls.canvas.heightOffsetPx)}px`;
      stage.style.setProperty('--cylinder-stage-width-extra', `${Math.round(controls.canvas.widthOffsetPx)}px`);
      stage.style.setProperty('--cylinder-stage-x', `${Math.round(controls.canvas.x)}px`);
      stage.style.setProperty('--cylinder-stage-opacity', `${controls.canvas.opacity}`);

      const stageRect = stage.getBoundingClientRect();
      const width = Math.max(1, Math.round(stageRect.width));
      const height = Math.max(1, Math.round(stageRect.height));
      const renderWidth = width;
      const frameRect = new DOMRect(stageRect.left, stageRect.top, renderWidth, height);
      const ratio = renderWidth / height;

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
      setBackfaceVisibility(titleMaterial, controls.title.backfaceVisible);
      titleGroup.scale.setScalar(1);
      titleGroup.position.set(titlePoint.x, titlePoint.y, controls.title.z);
      titleGroup.rotation.x = titleBasePitch + controls.title.pitch;
      const titleOverscan = Number.parseFloat(getComputedStyle(titleAnchor).getPropertyValue('--ring-overscan')) || 1;
      fitGroupToAnchor(titleGroup, titleRect, frameRect, camera, controls.title.scale, titleOverscan, 0.38, -titleCylinderHeight * 0.04);
      titleGroup.position.x += controls.title.x;
      titleGroup.position.y += controls.title.y;

      const logoPoint = getScenePoint(logoRect, frameRect, camera);
      setBackfaceVisibility(logoMaterial, controls.logos.backfaceVisible);
      logoGroup.scale.set(1, controls.logos.heightCompression, 1);
      logoGroup.position.set(logoPoint.x, logoPoint.y, controls.logos.z);
      logoGroup.rotation.x = logoBasePitch + controls.logos.pitch;
      const logoOverscan = Number.parseFloat(getComputedStyle(logoAnchor).getPropertyValue('--ring-overscan')) || 1;
      fitGroupToAnchor(logoGroup, logoRect, frameRect, camera, controls.logos.scale, logoOverscan, 0.45, -logoCylinderHeight * 0.01);
      logoGroup.position.x += controls.logos.x;
      logoGroup.position.y += controls.logos.y;
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
    let flowerElapsed = 0;
    const animate = () => {
      if (disposed || !renderer) {
        return;
      }

      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const frameDelta = Math.min(0.05, Math.max(0.001, (now - previousFrameTime) / 1000));
      previousFrameTime = now;
      flowerElapsed += frameDelta * flowerControls.speed;
      const flowerFrame = Math.floor(flowerElapsed / flowerFrameDuration);
      ringFlowers.forEach((flower, index) => {
        flower.material = flowerMaterials[(flowerFrame + index) % flowerMaterials.length];
      });

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

      automaticRotation.title -= frameDelta * titleRotationSpeed * controls.title.speed;
      automaticRotation.logos -= frameDelta * 0.075 * controls.logos.speed;
      titleCylinder.rotation.y = controls.title.yaw + automaticRotation.title + spinOffset.title;
      titleGroup.rotation.x = titleBasePitch + controls.title.pitch + Math.sin(elapsed * 0.28) * 0.006;

      logoGroup.rotation.x = logoBasePitch + controls.logos.pitch + Math.sin(elapsed * 0.24) * 0.01;
      logoGroup.rotation.y = -0.18 + controls.logos.yaw + automaticRotation.logos + spinOffset.logos;

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
  };

  void start();

  return cleanup;
};
