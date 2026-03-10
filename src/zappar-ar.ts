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

const HOTSPOTS = [
    { id: 'doors', title: 'Dihedral Doors', desc: "McLaren's signature dihedral doors rotate upward and outward, providing dramatic entrance and optimal entry/exit in tight spaces. Carbon fibre construction keeps weight minimal.", offset: new THREE.Vector3(0.12, 0.09, 0.05) },
    { id: 'engine', title: '4.0L Twin-Turbo V8', desc: 'The heart of the Artura Spider: a 4.0-litre twin-turbocharged V8 producing 585PS, paired with an E-motor for combined output of 700PS. 0-60mph in 3.0 seconds.', offset: new THREE.Vector3(-0.05, 0.15, -0.08) },
    { id: 'aero', title: 'Active Aerodynamics', desc: 'Active rear wing and underbody aerodynamics generate up to 260kg of downforce. The airbrake function deploys automatically during high-speed braking.', offset: new THREE.Vector3(0, 0.05, 0.12) },
    { id: 'interior', title: 'Driver-Focused Cockpit', desc: 'The minimalist cockpit wraps around the driver with a high-mounted infotainment display, configurable digital instrument cluster, and hand-stitched Alcantara throughout.', offset: new THREE.Vector3(0, 0.12, 0) },
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

const loader = new GLTFLoader();
loader.load(MODEL_URL, (gltf) => {
    model = gltf.scene;

    // Center model horizontally and place on ground (1:1 real-world scale)
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const minY = box.min.y;

    // Center X/Z, shift Y so bottom sits on ground
    model.position.set(-center.x, -minY, -center.z);

    trackerGroup.add(model);

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
    data: typeof HOTSPOTS[0];
    el: HTMLButtonElement;
    anchor: THREE.Object3D;
}

const hotspotEls: HotspotEl[] = [];

function createHotspotButtons(): void {
    HOTSPOTS.forEach((hs) => {
        // 3D anchor point
        const anchor = new THREE.Object3D();
        anchor.position.copy(hs.offset);
        if (model) {
            const scale = model.scale.x;
            anchor.position.multiplyScalar(scale);
        }
        trackerGroup.add(anchor);

        // DOM button
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
