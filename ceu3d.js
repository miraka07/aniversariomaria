// Cena 3D: o Sistema Solar até 08/11/2005. Lê o progresso da rolagem em window.CEU.p (0..1).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TEX = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/';
const canvas = document.getElementById('orrery3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040f);
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 3000);
camera.position.set(0, 60, 80);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.35);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- luz e estrelas ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.06));
const sunLight = new THREE.PointLight(0xfff1dc, 3.2, 0, 0);
scene.add(sunLight);

const starGeo = new THREE.BufferGeometry();
const sp = new Float32Array(5000 * 3);
for (let i = 0; i < 5000; i++) {
  const v = new THREE.Vector3().randomDirection().multiplyScalar(500 + Math.random() * 600);
  sp.set([v.x, v.y, v.z], i * 3);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.85 })));

/* ---------- texturas procedurais (Marte, Vênus, Júpiter, Mercúrio) ---------- */
function procTex(draw) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  draw(c.getContext('2d'), 512, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const blotches = (base, spots) => (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = spots[i % spots.length]; g.globalAlpha = Math.random() * 0.35;
    g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, Math.random() * 40 + 4, Math.random() * 16 + 2, 0, 0, 6.28); g.fill();
  }
  g.globalAlpha = 1;
};
const bands = (cols) => (g, w, h) => {
  for (let y = 0; y < h; y++) { g.fillStyle = cols[Math.floor((Math.sin(y * 0.09) + Math.sin(y * 0.031) + 2) / 4 * cols.length) % cols.length]; g.fillRect(0, y, w, 1); }
  g.fillStyle = 'rgba(190,90,60,.7)'; g.beginPath(); g.ellipse(w * 0.62, h * 0.62, 22, 11, 0, 0, 6.28); g.fill();
};

/* ---------- planetas: elementos orbitais médios J2000 ---------- */
const DEG = Math.PI / 180;
const P = [
  { n: 'Mercúrio', L0: 252.251, dn: 4.0923344, w: 77.456, e: .2056, r: 11, s: .45, tex: procTex(blotches('#8d8682', ['#6f6863', '#a9a29d'])) },
  { n: 'Vênus',    L0: 181.980, dn: 1.6021302, w: 131.564, e: .0068, r: 16, s: .9, tex: procTex(blotches('#e6c98f', ['#f3dfb5', '#c9a66b'])) },
  { n: 'Terra',    L0: 100.464, dn: 0.9856474, w: 102.937, e: .0167, r: 22, s: 1 },
  { n: 'Marte',    L0: 355.453, dn: 0.5240208, w: 336.060, e: .0934, r: 30, s: .62, tex: procTex(blotches('#b5502f', ['#8a3a22', '#d07a52', '#6e2c1a'])) },
  { n: 'Júpiter',  L0: 34.404,  dn: 0.0830853, w: 14.331,  e: .0484, r: 46, s: 2.8, tex: procTex(bands(['#d8c3a5', '#b48a64', '#efe1c8', '#a8754e', '#e2cfb2'])) },
];
const lon = (p, d) => { const L = p.L0 + p.dn * d, M = (L - p.w) * DEG; return (L + 2 * p.e * Math.sin(M) / DEG) * DEG; };
const DAY0 = -0.5, DAYB = (Date.UTC(2005, 10, 8, 12) - Date.UTC(2000, 0, 1, 12)) / 864e5;
console.assert(Math.abs(((lon(P[2], DAYB) - lon(P[3], DAYB)) / DEG + 540) % 360 - 180) < 5, 'Terra e Marte deveriam estar alinhados');

const loader = new THREE.TextureLoader();
const srgb = t => (t.colorSpace = THREE.SRGBColorSpace, t);

P.forEach(p => {
  const mat = p.n === 'Terra'
    ? new THREE.MeshStandardMaterial({ map: srgb(loader.load(TEX + 'earth_atmos_2048.jpg')), roughness: .8, metalness: 0 })
    : new THREE.MeshStandardMaterial({ map: p.tex, roughness: 1, metalness: 0, emissive: new THREE.Color(0x000000) });
  p.mesh = new THREE.Mesh(new THREE.SphereGeometry(p.s, 64, 32), mat);
  scene.add(p.mesh);
  const pts = Array.from({ length: 256 }, (_, i) => { const a = i / 256 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * p.r, 0, -Math.sin(a) * p.r); });
  p.ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .12 }));
  scene.add(p.ring);
});
const earth = P[2].mesh, mars = P[3].mesh, venus = P[1];

// nuvens + atmosfera da Terra
const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 32), new THREE.MeshStandardMaterial({ map: srgb(loader.load(TEX + 'earth_clouds_1024.png')), transparent: true, opacity: .8, depthWrite: false }));
earth.add(clouds);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 32), new THREE.ShaderMaterial({
  transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(0.35,0.6,1.0,1.0)*f*1.4; }',
}));
earth.add(atmo);

// Lua
const moon = new THREE.Mesh(new THREE.SphereGeometry(.27, 48, 24), new THREE.MeshStandardMaterial({ map: srgb(loader.load(TEX + 'moon_1024.jpg')), roughness: 1 }));
scene.add(moon);

// Sol
const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 64, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .72, .35).multiplyScalar(1.5) }));
scene.add(sun);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,200,120,1)', 'rgba(255,120,60,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .7 }));
halo.scale.set(14, 14, 1); scene.add(halo);
function radialTex(a, b) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

// brilho de Marte na oposição
const marsGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,90,60,1)', 'rgba(255,40,40,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
marsGlow.scale.set(6, 6, 1); scene.add(marsGlow);

// linha Sol–Terra–Marte
const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xff3355, dashSize: .8, gapSize: .6, transparent: true, opacity: 0 }));
scene.add(beam);

// Venus Express: sonda + rastro
const probe = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,255,255,1)', 'rgba(255,80,120,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
probe.scale.set(1.4, 1.4, 1); scene.add(probe);
const TRAIL = 120;
const trail = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3)), new THREE.LineBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0 }));
scene.add(trail);

// marcador: Guarapari-ES (lat -20.67, lon -40.50), onde ela nasceu, preso à Terra
function latLon(lat, lng, r) {
  const phi = (90 - lat) * DEG, th = (lng + 180) * DEG;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}
const marker = new THREE.Mesh(new THREE.SphereGeometry(.025, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .1, .25).multiplyScalar(4) }));
marker.position.copy(latLon(-20.67, -40.50, 1.005));
earth.add(marker);
const MARKER_ANG = Math.atan2(-marker.position.z, marker.position.x);
const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,40,80,1)', 'rgba(255,40,80,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
pulse.position.copy(latLon(-20.67, -40.50, 1.03)); earth.add(pulse);
const placeEl = document.getElementById('placeLabel'), projV = new THREE.Vector3();

/* ---------- coreografia da câmera ---------- */
const clamp01 = v => Math.max(0, Math.min(1, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const camPos = new THREE.Vector3(0, 60, 80), camLook = new THREE.Vector3();
const tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
let smooth = 0;
const fmt = d => { const dt = new Date(Date.UTC(2000, 0, 1, 12) + d * 864e5); return [dt.getUTCDate(), dt.getUTCMonth() + 1].map(v => String(v).padStart(2, '0')).join('·') + '·' + dt.getUTCFullYear(); };
const dateEl = document.getElementById('ceuDate'), labelEl = document.getElementById('ceuLabel');
const flash = document.getElementById('ceuFlash');

// curva da Venus Express (calculada uma vez na data do lançamento)
const posAt = (p, d) => { const a = lon(p, d); return new THREE.Vector3(Math.cos(a) * p.r, 0, -Math.sin(a) * p.r); };
const ePos = posAt(P[2], DAYB), vArr = posAt(venus, DAYB + 154);
const veCurve = new THREE.QuadraticBezierCurve3(ePos, ePos.clone().add(vArr).multiplyScalar(.5).add(new THREE.Vector3(0, 6, 0)).multiplyScalar(1.15), vArr);

let visible = false;
new IntersectionObserver(es => visible = es[0].isIntersecting).observe(canvas);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  resize();
  const t = clock.getElapsedTime();
  smooth += ((window.CEU?.p || 0) - smooth) * .08;
  if (window.CEU?.snap) smooth = window.CEU.p; // só para testes
  const p = smooth;

  // tempo corre de 2000 até 08/11/2005
  const day = DAY0 + (DAYB - DAY0) * ease(seg(p, .02, .36));
  dateEl.textContent = fmt(day);
  labelEl.textContent = p < .36 ? 'voltando no tempo' : 'terça-feira';
  P.forEach(pl => { const a = lon(pl, day); pl.mesh.position.set(Math.cos(a) * pl.r, 0, -Math.sin(a) * pl.r); pl.mesh.rotation.y = t * .15; });
  clouds.rotation.y = t * .012;
  halo.material.opacity = .4 + Math.sin(t * 1.3) * .06;
  const E = earth.position, M = mars.position;
  // antes do mergulho, a Terra gira até Guarapari ficar de frente para o Sol (lado iluminado)
  const want = Math.atan2(E.z, -E.x) - MARKER_ANG; // ângulo do Sol visto da Terra menos o ângulo do marcador
  const spin = t * .08, k0 = ease(seg(p, .8, .88));
  earth.rotation.y = spin + (((want - spin) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * k0;

  // Lua em quarto crescente: 90° a leste do Sol, visto da Terra
  const sunDir = tmp.copy(E).negate().normalize();
  const moonDir = tmp2.copy(sunDir).applyAxisAngle(UP, Math.PI / 2);
  moon.position.copy(E).addScaledVector(moonDir, 2.4);

  // Marte em oposição
  const aMoon = seg(p, .54, .58) * (1 - seg(p, .7, .74));
  P.forEach(pl => pl.ring.material.opacity = .12 * (1 - aMoon));
  const aMars = seg(p, .36, .42) * (1 - seg(p, .54, .58));
  beam.material.opacity = aMars * .9;
  beam.geometry.setFromPoints([new THREE.Vector3(), M.clone()]); beam.computeLineDistances();
  marsGlow.position.copy(M); marsGlow.material.opacity = aMars * (.75 + Math.sin(t * 3) * .2);
  mars.material.emissive.setRGB(.5 * aMars, .12 * aMars, .05 * aMars);

  // Venus Express
  const aVe = seg(p, .72, .76) * (1 - seg(p, .86, .9)), k = seg(p, .74, .86);
  probe.material.opacity = aVe; trail.material.opacity = aVe * .8;
  probe.position.copy(veCurve.getPoint(k));
  const tp = trail.geometry.attributes.position;
  for (let i = 0; i < TRAIL; i++) { const q = veCurve.getPoint(k * i / (TRAIL - 1)); tp.setXYZ(i, q.x, q.y, q.z); }
  tp.needsUpdate = true;

  // mergulho na Terra: Guarapari pulsa
  const aDive = seg(p, .86, .96);
  pulse.material.opacity = aDive * (.7 + Math.sin(t * 4) * .3);
  const ps = .25 + aDive * .25 + Math.sin(t * 4) * .05; pulse.scale.set(ps, ps, 1);
  flash.style.opacity = seg(p, .93, 1);

  // alvos da câmera por fase
  if (p < .36) {
    const a = t * .03;
    tPos.set(Math.sin(a) * 75, 52 - p * 30, Math.cos(a) * 75); tLook.set(0, 0, 0);
  } else if (p < .56) { // de lado, enquadrando Sol–Terra–Marte
    const side = tmp.copy(M).normalize().cross(UP).normalize();
    tPos.copy(M).multiplyScalar(.55).addScaledVector(side, 26).add(new THREE.Vector3(0, 9, 0));
    tLook.copy(M).multiplyScalar(.6);
  } else if (p < .72) { // da Terra, olhando a Lua
    tPos.copy(E).addScaledVector(moonDir, 1.45).add(new THREE.Vector3(0, .12, 0));
    tLook.copy(moon.position);
  } else if (p < .86) { // de cima, vendo a sonda ir para Vênus
    tPos.copy(E).add(vArr).multiplyScalar(.5).add(new THREE.Vector3(0, 30, 10)); tLook.copy(E).add(vArr).multiplyScalar(.5);
  } else { // descendo até Guarapari
    const mw = marker.getWorldPosition(new THREE.Vector3());
    const dir = mw.sub(E).normalize();
    tPos.copy(E).addScaledVector(dir, 6 - ease(aDive) * 4.6); tLook.copy(E);
  }
  const damp = window.CEU?.snap ? 1 : p > .86 ? .12 : .045;
  camPos.lerp(tPos, damp); camLook.lerp(tLook, damp);
  camera.position.copy(camPos);
  // vista do hemisfério sul na cena da Lua: câmera de ponta-cabeça deixa o lado iluminado à esquerda
  camera.up.set(0, p >= .56 && p < .72 ? -1 : 1, 0);
  camera.lookAt(camLook);
  // nome da cidade preso ao marcador na tela
  marker.getWorldPosition(projV).project(camera);
  placeEl.style.opacity = seg(p, .88, .93) * (1 - seg(p, .955, .98));
  placeEl.style.transform = 'translate(' + ((projV.x + 1) / 2 * canvas.clientWidth) + 'px,' + ((1 - projV.y) / 2 * canvas.clientHeight) + 'px)';
  composer.render();
}
frame();
