/* =============================================
   McLaren Artura Spider — Zappar Instant AR
   Markerless world tracking with hotspots.
   Works on iOS Safari via Zappar SLAM.
   ============================================= */

import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Config ───────────────────────────────────

const MODEL_URL = '/models/2025_mclaren_artura_spider.glb';

// ── Hotspot Config (positions as % of bounding box) ──
// x: -1 (left) to +1 (right)
// y: 0 (ground) to 1 (top)
// z: -1 (rear) to +1 (front)
const HOTSPOT_CONFIG = [
    { id: 'doors', title: 'Dihedral Doors', desc: "McLaren's signature dihedral doors rotate upward and outward, providing dramatic entrance and optimal entry/exit in tight spaces. Carbon fibre construction keeps weight minimal.", pct: { x: -0.55, y: 0.55, z: 0.15 } },
    { id: 'engine', title: '4.0L Twin-Turbo V8', desc: 'The heart of the Artura Spider: a 4.0-litre twin-turbocharged V8 producing 585PS, paired with an E-motor for combined output of 700PS. 0-60mph in 3.0 seconds.', pct: { x: 0, y: 0.5, z: -0.65 } },
    { id: 'aero', title: 'Active Aerodynamics', desc: 'Active rear wing and underbody aerodynamics generate up to 260kg of downforce. The airbrake function deploys automatically during high-speed braking.', pct: { x: 0, y: 0.85, z: -0.85 } },
    { id: 'interior', title: 'Driver-Focused Cockpit', desc: 'The minimalist cockpit wraps around the driver with a high-mounted infotainment display, configurable digital instrument cluster, and hand-stitched Alcantara throughout.', pct: { x: 0.15, y: 0.95, z: 0.05 } },
    { id: 'wheels', title: 'Lightweight Forged Wheels', desc: '10-spoke super-lightweight forged alloy wheels designed for reduced unsprung mass. Front: 19-inch, Rear: 20-inch with Pirelli P Zero Corsa tyres.', pct: { x: 0.55, y: 0.2, z: 0.4 } },
    { id: 'headlights', title: 'Adaptive LED Headlights', desc: "Slim full-LED adaptive headlights with McLaren's signature daytime running light blade. Cornering lights illuminate the apex as you turn.", pct: { x: -0.35, y: 0.4, z: 0.85 } },
];

// ── DOM ──────────────────────────────────────

const container = document.getElementById('zappar-container') as HTMLElement;
const scanPrompt = document.getElementById('scan-prompt') as HTMLElement;
const hotspotLayer = document.getElementById('hotspot-layer') as HTMLElement;
const panelEl = document.getElementById('info-panel') as HTMLElement;
const panelTitle = document.getElementById('panel-title') as HTMLElement;
const panelDesc = document.getElementById('panel-desc') as HTMLElement;

// ── Three.js + Zappar Setup ──────────────────

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Connect Zappar pipeline to the WebGL context (MUST happen before camera.start)
ZapparThree.glContextSet(renderer.getContext());

// Zappar camera (handles device camera + tracking)
const camera = new ZapparThree.Camera();

// Request camera permissions
ZapparThree.permissionRequestUI().then((granted: boolean) => {
    if (granted) {
        camera.start();
    } else {
        ZapparThree.permissionDeniedUI();
    }
});

// Scene
const scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(2, 3, 2);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-2, 1, -1);
scene.add(fillLight);

// ── Instant World Tracker ────────────────────

const instantTracker = new ZapparThree.InstantWorldTracker();
const trackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);
scene.add(trackerGroup);

// ── Model Loading ────────────────────────────

let model: THREE.Group | null = null;
let placed = false;
let modelBox: THREE.Box3 | null = null;
let modelSize: THREE.Vector3 | null = null;

// Real-world McLaren Artura Spider length = 4.534m
const REAL_CAR_LENGTH = 4.534;

const loader = new GLTFLoader();
loader.load(MODEL_URL, (gltf) => {
    model = gltf.scene;

    // Measure raw model size
    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const longestAxis = Math.max(rawSize.x, rawSize.y, rawSize.z);

    // Scale to real-world size (longest dimension = car length)
    const scaleFactor = REAL_CAR_LENGTH / longestAxis;
    model.scale.setScalar(scaleFactor);

    console.log('[AR] Raw model size:', rawSize.x.toFixed(4), 'x', rawSize.y.toFixed(4), 'x', rawSize.z.toFixed(4));
    console.log('[AR] Scale factor:', scaleFactor.toFixed(2));

    // Re-measure after scaling
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const minY = box.min.y;

    // Center X/Z, shift Y so bottom sits on ground
    model.position.set(-center.x, -minY, -center.z);

    trackerGroup.add(model);

    // Recompute box after position change for hotspot placement
    modelBox = new THREE.Box3().setFromObject(model);
    modelSize = modelBox.getSize(new THREE.Vector3());

    console.log('[AR] Final model size (m):', modelSize.x.toFixed(2), 'x', modelSize.y.toFixed(2), 'x', modelSize.z.toFixed(2));

    // Show placement prompt
    scanPrompt.textContent = 'TAP TO PLACE THE CAR';
    scanPrompt.classList.remove('hidden');
});

// ── Placement ────────────────────────────────

renderer.domElement.addEventListener('click', () => {
    if (placed || !model) return;
    placed = true;
    scanPrompt.classList.add('hidden');
    hotspotLayer.classList.remove('hidden');
    createHotspotButtons();
});

// ── Hotspot DOM Overlays ─────────────────────

interface HotspotEl {
    data: typeof HOTSPOT_CONFIG[0];
    el: HTMLButtonElement;
    anchor: THREE.Object3D;
}

const hotspotEls: HotspotEl[] = [];

function createHotspotButtons(): void {
    if (!modelBox || !modelSize) return;

    const cx = (modelBox.min.x + modelBox.max.x) / 2;
    const cy = modelBox.min.y; // ground
    const cz = (modelBox.min.z + modelBox.max.z) / 2;

    HOTSPOT_CONFIG.forEach((hs) => {
        // Compute world position from percentage offsets
        const anchor = new THREE.Object3D();
        anchor.position.set(
            cx + hs.pct.x * (modelSize!.x / 2), // x: left/right
            cy + hs.pct.y * modelSize!.y,         // y: ground to top
            cz + hs.pct.z * (modelSize!.z / 2),   // z: rear/front
        );
        trackerGroup.add(anchor);

        // DOM button — minimal white dot style (matching McLaren.com)
        const btn = document.createElement('button');
        btn.className = 'hs-btn';
        btn.innerHTML = `
            <div class="hs-ring">
                <div class="hs-ring-circle"></div>
                <div class="hs-dot"></div>
            </div>
            <span class="hs-label">${hs.title}</span>
        `;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPanel(hs.title, hs.desc);
        });
        hotspotLayer.appendChild(btn);

        hotspotEls.push({ data: hs, el: btn, anchor });
    });
}

function updateHotspotPositions(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    hotspotEls.forEach(({ el, anchor }) => {
        const pos = new THREE.Vector3();
        anchor.getWorldPosition(pos);
        pos.project(camera);

        const x = (pos.x * 0.5 + 0.5) * w;
        const y = (-pos.y * 0.5 + 0.5) * h;

        if (pos.z > 0 && pos.z < 1 && x > -50 && x < w + 50 && y > -50 && y < h + 50) {
            el.style.display = '';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        } else {
            el.style.display = 'none';
        }
    });
}

// ── Panel ────────────────────────────────────

function openPanel(title: string, desc: string): void {
    panelTitle.textContent = title;
    panelDesc.textContent = desc;
    panelEl.classList.add('active');
}

(window as any).closePanel = () => {
    panelEl.classList.remove('active');
};

// ── Resize ───────────────────────────────────

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render Loop ──────────────────────────────

function animate(): void {
    requestAnimationFrame(animate);

    camera.updateFrame(renderer);

    if (!placed) {
        // Before placement, anchor tracks in front of camera
        // Place car ~5m in front and slightly below eye level
        instantTracker.setAnchorPoseFromCameraOffset(0, -1.0, -5);
    }

    renderer.render(scene, camera);

    if (placed) {
        updateHotspotPositions();
    }
}

animate();
