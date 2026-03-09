/* =============================================
   McLaren Artura Spider — Three.js Gyroscope AR
   Camera feed + compass-anchored 3D model with
   DOM hotspot overlays. Works on iOS Safari.
   ============================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { hotspots, type HotspotData } from './hotspots';
import { openPanel } from './panels';

// ── State ────────────────────────────────────

let arActive = false;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let model: THREE.Group | null = null;
let videoElement: HTMLVideoElement | null = null;
let arContainer: HTMLElement | null = null;
let stream: MediaStream | null = null;
let animationId: number | null = null;

// Device orientation
let initialAlpha: number | null = null;
let currentAlpha = 0;
let currentBeta = 90;

let smoothAlpha = 0;
let smoothBeta = 90;

// Hotspot DOM elements
const hotspotElements: Map<string, HTMLElement> = new Map();

// 3D hotspot positions (matching model-viewer positions)
const hotspot3DPositions: Record<string, THREE.Vector3> = {
    'hs-doors': new THREE.Vector3(0.12, 0.09, 0.05),
    'hs-engine': new THREE.Vector3(-0.05, 0.15, -0.08),
    'hs-aero': new THREE.Vector3(0, 0.05, 0.12),
    'hs-interior': new THREE.Vector3(0, 0.12, 0),
    'hs-wheels': new THREE.Vector3(0.1, 0.02, 0.08),
};

// ── Public API ───────────────────────────────

export function isCameraARSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export async function startCameraAR(modelUrl: string): Promise<void> {
    if (arActive) return;
    arActive = true;

    try {
        // Request iOS motion permission
        await requestOrientationPermission();

        // Get camera feed
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
        });

        // Build AR UI
        buildAROverlay();

        // Setup Three.js
        setupThreeJS();

        // Start camera video
        if (videoElement) {
            videoElement.srcObject = stream;
            await videoElement.play();
        }

        // Load 3D model
        loadModel(modelUrl);

        // Create hotspot overlays
        createHotspotOverlays();

        // Start orientation tracking
        startOrientationTracking();

        // Hide main viewer
        const vc = document.getElementById('viewer-container');
        if (vc) vc.style.display = 'none';

        // Start render loop
        animate();

    } catch (err) {
        console.error('AR failed:', err);
        arActive = false;
        alert('Could not start AR. Please allow camera and motion access.');
    }
}

export function stopCameraAR(): void {
    arActive = false;

    stopOrientationTracking();

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    if (renderer) {
        renderer.dispose();
        renderer = null;
    }

    if (arContainer?.parentNode) {
        arContainer.parentNode.removeChild(arContainer);
        arContainer = null;
    }

    hotspotElements.clear();
    model = null;
    scene = null;
    camera = null;
    videoElement = null;
    initialAlpha = null;

    const vc = document.getElementById('viewer-container');
    if (vc) vc.style.display = '';
}

// ── UI Construction ──────────────────────────

function buildAROverlay(): void {
    arContainer = document.createElement('div');
    arContainer.id = 'ar-overlay';
    arContainer.style.cssText = 'position:fixed;inset:0;z-index:100;overflow:hidden;background:#000;';

    // Camera video
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('autoplay', '');
    videoElement.muted = true;
    videoElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;';
    arContainer.appendChild(videoElement);

    // Three.js canvas container
    const canvasWrap = document.createElement('div');
    canvasWrap.id = 'ar-canvas-wrap';
    canvasWrap.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;';
    arContainer.appendChild(canvasWrap);

    // Hotspot layer
    const hsLayer = document.createElement('div');
    hsLayer.id = 'ar-hotspot-layer';
    hsLayer.style.cssText = 'position:absolute;inset:0;z-index:3;pointer-events:none;';
    arContainer.appendChild(hsLayer);

    // HUD
    const hud = document.createElement('div');
    hud.style.cssText = `
        position:absolute;top:0;left:0;right:0;z-index:10;
        display:flex;align-items:center;justify-content:space-between;
        padding:16px 20px;padding-top:max(16px,env(safe-area-inset-top));
        background:linear-gradient(180deg,rgba(0,0,0,0.6) 0%,transparent 100%);
    `;
    hud.innerHTML = `
        <div>
            <div style="font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;letter-spacing:6px;color:#fff;">McLAREN</div>
            <div style="font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:500;letter-spacing:3px;color:#FF8000;">ARTURA SPIDER · AR</div>
        </div>
    `;
    const exitBtn = document.createElement('button');
    exitBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';
    exitBtn.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(16,16,16,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);cursor:pointer;';
    exitBtn.addEventListener('click', stopCameraAR);
    hud.appendChild(exitBtn);
    arContainer.appendChild(hud);

    // Instruction
    const instr = document.createElement('div');
    instr.style.cssText = `
        position:absolute;bottom:40px;left:50%;transform:translateX(-50%);z-index:10;
        padding:10px 20px;background:rgba(16,16,16,0.85);
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid rgba(255,255,255,0.08);border-radius:999px;
        font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:500;
        letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.8);
    `;
    instr.textContent = 'Move phone to look around · Tap hotspots';
    arContainer.appendChild(instr);
    setTimeout(() => { instr.style.transition = 'opacity 1s'; instr.style.opacity = '0'; }, 4000);

    document.body.appendChild(arContainer);
}

// ── Three.js Setup ───────────────────────────

function setupThreeJS(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 100);
    camera.position.set(0, 0.1, 0.4);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const canvasWrap = document.getElementById('ar-canvas-wrap');
    if (canvasWrap) canvasWrap.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 1, -1);
    scene.add(fillLight);

    // Handle resize
    window.addEventListener('resize', onResize);
}

function onResize(): void {
    if (!camera || !renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

// ── Model Loading ────────────────────────────

function loadModel(url: string): void {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
        model = gltf.scene;

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.25 / maxDim;

        model.position.sub(center.multiplyScalar(scale));
        model.scale.setScalar(scale);
        model.position.y = 0; // Place on "ground"

        scene?.add(model);
    });
}

// ── Hotspot Overlays ─────────────────────────

function createHotspotOverlays(): void {
    const layer = document.getElementById('ar-hotspot-layer');
    if (!layer) return;

    hotspots.forEach((hs: HotspotData) => {
        const el = document.createElement('button');
        el.className = 'ar-hotspot-btn';
        el.style.cssText = `
            position:absolute;transform:translate(-50%,-50%);
            display:flex;flex-direction:column;align-items:center;gap:4px;
            pointer-events:auto;background:none;border:none;cursor:pointer;
            transition:opacity 0.3s;
        `;
        el.innerHTML = `
            <div style="position:relative;width:36px;height:36px;">
                <div style="position:absolute;inset:0;border:2px solid #FF8000;border-radius:50%;animation:arPulse 2s ease-in-out infinite;"></div>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#FF8000;border-radius:50%;box-shadow:0 0 16px rgba(255,128,0,0.6),0 0 6px #FF8000;"></div>
            </div>
            <span style="font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.9);background:rgba(16,16,16,0.8);padding:2px 6px;border-radius:4px;white-space:nowrap;">${hs.title.split(' ').slice(0, 2).join(' ')}</span>
        `;
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            openPanel(hs);
        });
        layer.appendChild(el);
        hotspotElements.set(hs.id, el);
    });

    // Inject pulse animation
    if (!document.getElementById('ar-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'ar-pulse-style';
        style.textContent = `@keyframes arPulse{0%{transform:scale(0.8);opacity:1}50%{transform:scale(1.3);opacity:0.3}100%{transform:scale(0.8);opacity:1}}`;
        document.head.appendChild(style);
    }
}

function updateHotspotPositions(): void {
    if (!camera || !renderer) return;

    const w = renderer.domElement.width / renderer.getPixelRatio();
    const h = renderer.domElement.height / renderer.getPixelRatio();

    hotspots.forEach((hs: HotspotData) => {
        const el = hotspotElements.get(hs.id);
        if (!el) return;

        const pos3D = hotspot3DPositions[hs.id];
        if (!pos3D) { el.style.display = 'none'; return; }

        // Transform hotspot position relative to model
        const worldPos = pos3D.clone();
        if (model) {
            worldPos.applyMatrix4(model.matrixWorld);
        }

        // Project to screen
        const projected = worldPos.clone().project(camera!);
        const x = (projected.x * 0.5 + 0.5) * w;
        const y = (-projected.y * 0.5 + 0.5) * h;

        // Check if in front of camera
        if (projected.z > 0 && projected.z < 1 && x > -50 && x < w + 50 && y > -50 && y < h + 50) {
            el.style.display = '';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        } else {
            el.style.display = 'none';
        }
    });
}

// ── Device Orientation ───────────────────────

let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

async function requestOrientationPermission(): Promise<boolean> {
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
        try {
            const r = await DOE.requestPermission();
            return r === 'granted';
        } catch { return false; }
    }
    return true;
}

function startOrientationTracking(): void {
    initialAlpha = null;

    orientationHandler = (e: DeviceOrientationEvent) => {
        currentAlpha = e.alpha ?? 0;
        currentBeta = e.beta ?? 90;


        if (initialAlpha === null) {
            initialAlpha = currentAlpha;
            smoothAlpha = 0;
            smoothBeta = currentBeta;
        }
    };

    window.addEventListener('deviceorientation', orientationHandler, true);
}

function stopOrientationTracking(): void {
    if (orientationHandler) {
        window.removeEventListener('deviceorientation', orientationHandler, true);
        orientationHandler = null;
    }
}

// ── Render Loop ──────────────────────────────

function animate(): void {
    if (!arActive || !renderer || !scene || !camera) return;

    animationId = requestAnimationFrame(animate);

    // Update camera based on device orientation
    if (initialAlpha !== null) {
        // Compass-relative angle (model anchored to initial heading)
        let deltaAlpha = currentAlpha - initialAlpha;
        if (deltaAlpha > 180) deltaAlpha -= 360;
        if (deltaAlpha < -180) deltaAlpha += 360;

        // Smooth interpolation
        smoothAlpha += (deltaAlpha - smoothAlpha) * 0.15;
        smoothBeta += (currentBeta - smoothBeta) * 0.15;

        // Convert device orientation to camera position on a sphere around the model
        const radius = 0.4;
        const theta = THREE.MathUtils.degToRad(-smoothAlpha); // horizontal
        const phi = THREE.MathUtils.degToRad(Math.max(20, Math.min(160, smoothBeta))); // vertical

        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);

        camera.lookAt(0, 0.05, 0); // Look at model center
    }

    renderer.render(scene, camera);
    updateHotspotPositions();
}
