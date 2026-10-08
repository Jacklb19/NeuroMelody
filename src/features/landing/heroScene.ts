import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { HERO_SCENE } from './config';

/** Colours of the scene, read from the CSS tokens by the caller (ADR-25). */
export interface HeroPalette {
  readonly core: string;
  readonly glow: string;
  readonly pulse: string;
  readonly staff: string;
  readonly note: string;
}

/** What the scene needs each frame: the beat phase and where the pointer is. */
export interface HeroFrame {
  readonly timeS: number;
  /** 0 at the beat, approaching 1 before the next one. */
  readonly beatPhase: number;
  /** Pointer position in [-1, 1] on each axis; 0 when unknown. */
  readonly pointerX: number;
  readonly pointerY: number;
}

export interface HeroScene {
  render(frame: HeroFrame): void;
  resize(widthCss: number, heightCss: number, pixelRatio: number): void;
  dispose(): void;
}

/**
 * Points of a sphere, evenly spread with the golden-angle spiral. Each point
 * gets a random weight that varies how much it moves, so the surface ripples
 * instead of swelling like a balloon.
 */
function spherePoints(count: number): { positions: Float32Array; weights: Float32Array } {
  const positions = new Float32Array(count * 3);
  const weights = new Float32Array(count);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const radius = Math.sqrt(1 - y * y);
    const angle = i * goldenAngle;
    positions.set([Math.cos(angle) * radius, y, Math.sin(angle) * radius], i * 3);
    // Deterministic pseudo-random weight, so every visit draws the same sphere.
    weights[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
  }
  return { positions, weights };
}

/*
 * The heartbeat is a double bump (the two heart sounds) driven by the beat
 * phase; a slow travelling wave keeps the surface alive between beats.
 */
const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uBeat;
  uniform float uPointSize;
  uniform float uPixelRatio;
  attribute float aWeight;
  varying float vPulse;
  varying float vHeight;

  float heartbeat(float phase) {
    float first = exp(-pow((phase - 0.04) * 16.0, 2.0));
    float second = 0.55 * exp(-pow((phase - 0.2) * 16.0, 2.0));
    return first + second;
  }

  void main() {
    float pulse = heartbeat(uBeat);
    float wave = sin(position.y * 6.0 + uTime * 1.3 + aWeight * 6.2831) * 0.035;
    float lift = 1.0 + pulse * (0.06 + 0.1 * abs(aWeight)) + wave;
    vec3 displaced = position * lift;
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = uPointSize * uPixelRatio * (1.0 + pulse * 0.8) * (3.0 / -viewPosition.z);
    vPulse = pulse;
    vHeight = position.y;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uGlow;
  uniform vec3 uPulse;
  varying float vPulse;
  varying float vHeight;

  void main() {
    float distanceToCentre = length(gl_PointCoord - 0.5);
    if (distanceToCentre > 0.5) discard;
    float softness = smoothstep(0.5, 0.0, distanceToCentre);
    vec3 colour = mix(uCore, uGlow, vHeight * 0.5 + 0.5);
    colour = mix(colour, uPulse, vPulse * 0.7);
    gl_FragColor = vec4(colour, softness * (0.75 + vPulse * 0.25));
  }
`;

/**
 * The hero's 3D figure: a sphere of points that beats with a simulated heart,
 * circled by the five lines of a musical staff along which notes travel.
 * The page owns the clock; this module only draws what it is given.
 */
export function createHeroScene(canvas: HTMLCanvasElement, palette: HeroPalette): HeroScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(HERO_SCENE.fieldOfView, 1, 0.1, 50);
  camera.position.set(0, 0, HERO_SCENE.cameraDistance);

  const figure = new Group();
  scene.add(figure);

  const { positions, weights } = spherePoints(HERO_SCENE.particleCount);
  const sphereGeometry = new BufferGeometry();
  sphereGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  sphereGeometry.setAttribute('aWeight', new BufferAttribute(weights, 1));
  // Kept as typed objects so each frame updates them without looking them up.
  const sphereUniforms = {
    uTime: { value: 0 },
    uBeat: { value: 1 },
    uPointSize: { value: HERO_SCENE.pointSize },
    uPixelRatio: { value: 1 },
    uCore: { value: new Color(palette.core) },
    uGlow: { value: new Color(palette.glow) },
    uPulse: { value: new Color(palette.pulse) },
  };
  const sphereMaterial = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: sphereUniforms,
  });
  figure.add(new Points(sphereGeometry, sphereMaterial));

  // The staff: five parallel circles, tilted like a ring around the sphere.
  const staff = new Group();
  staff.rotation.set(-1.15, 0, 0.32);
  figure.add(staff);
  const staffMaterial = new LineBasicMaterial({ color: palette.staff, transparent: true, opacity: 0.7 });
  const staffGeometries: BufferGeometry[] = [];
  const middle = (HERO_SCENE.staffLines - 1) / 2;
  for (let line = 0; line < HERO_SCENE.staffLines; line++) {
    const vertices = new Float32Array(HERO_SCENE.staffSegments * 3);
    const radius = HERO_SCENE.staffRadius + (line - middle) * HERO_SCENE.staffGap;
    for (let s = 0; s < HERO_SCENE.staffSegments; s++) {
      const angle = (s / HERO_SCENE.staffSegments) * Math.PI * 2;
      vertices.set([Math.cos(angle) * radius, Math.sin(angle) * radius, 0], s * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    staffGeometries.push(geometry);
    staff.add(new LineLoop(geometry, staffMaterial));
  }

  // Notes: points on the staff lines that drift around it; the nearest one to the front flares on each beat.
  const notePositions = new Float32Array(HERO_SCENE.noteCount * 3);
  const notePositionAttribute = new BufferAttribute(notePositions, 3);
  const noteGeometry = new BufferGeometry();
  noteGeometry.setAttribute('position', notePositionAttribute);
  const noteUniforms = {
    uColour: { value: new Color(palette.note) },
    uSize: { value: HERO_SCENE.pointSize * 1.6 },
    uPixelRatio: { value: 1 },
    uBeat: { value: 1 },
  };
  const noteMaterial = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: noteUniforms,
    vertexShader: /* glsl */ `
      uniform float uSize;
      uniform float uPixelRatio;
      uniform float uBeat;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        float flare = exp(-pow(uBeat * 7.0, 2.0));
        gl_PointSize = uSize * uPixelRatio * (1.0 + flare) * (3.0 / -viewPosition.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColour;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uColour, smoothstep(0.5, 0.1, d));
      }
    `,
  });
  staff.add(new Points(noteGeometry, noteMaterial));

  const placeNotes = (timeS: number): void => {
    for (let n = 0; n < HERO_SCENE.noteCount; n++) {
      const line = n % HERO_SCENE.staffLines;
      const radius = HERO_SCENE.staffRadius + (line - middle) * HERO_SCENE.staffGap;
      // Each note has its own speed, so the staff reads like a slowly shifting melody.
      const angle = (n / HERO_SCENE.noteCount) * Math.PI * 2 + timeS * (0.12 + (n % 4) * 0.03);
      notePositions.set([Math.cos(angle) * radius, Math.sin(angle) * radius, 0], n * 3);
    }
    notePositionAttribute.needsUpdate = true;
  };

  return {
    render(frame) {
      sphereUniforms.uTime.value = frame.timeS;
      sphereUniforms.uBeat.value = frame.beatPhase;
      noteUniforms.uBeat.value = frame.beatPhase;
      figure.rotation.y = frame.timeS * HERO_SCENE.spinPerSecond * Math.PI * 2 + frame.pointerX * HERO_SCENE.pointerTilt;
      figure.rotation.x = frame.pointerY * HERO_SCENE.pointerTilt * 0.5;
      placeNotes(frame.timeS);
      renderer.render(scene, camera);
    },
    resize(widthCss, heightCss, pixelRatio) {
      const ratio = Math.min(pixelRatio, HERO_SCENE.maxPixelRatio);
      renderer.setPixelRatio(ratio);
      renderer.setSize(widthCss, heightCss, false);
      camera.aspect = heightCss > 0 ? widthCss / heightCss : 1;
      camera.updateProjectionMatrix();
      sphereUniforms.uPixelRatio.value = ratio;
      noteUniforms.uPixelRatio.value = ratio;
    },
    dispose() {
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      staffGeometries.forEach((geometry) => { geometry.dispose(); });
      staffMaterial.dispose();
      noteGeometry.dispose();
      noteMaterial.dispose();
      renderer.dispose();
    },
  };
}
